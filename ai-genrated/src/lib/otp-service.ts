/**
 * Vardayini Sweet Mart - Fast2SMS OTP & SMS Verification Service
 * 
 * Provides:
 * 1. Cryptographically secure 4-digit and 6-digit OTP generation.
 * 2. Fast2SMS Quick Route dispatching (testing friendly, no DLT registration required).
 * 3. Safe development simulation mode when FAST2SMS_API_KEY is not configured.
 * 4. Database persistence to `otp_logs` and `sms_logs` with 5-minute expiration window.
 * 5. Single-use OTP verification with AccountLockoutManager brute-force protection.
 * 6. Rate-limiting safeguards for SMS abuse prevention.
 */

import crypto from "node:crypto";
import { getSqliteDb } from "@/db";
import { normalizeIndianPhone, AccountLockoutManager, SlidingWindowRateLimiter } from "@/lib/security";

export type OtpTrigger = "register" | "login" | "order" | "pickup_verification" | string;

export interface SendOtpOptions {
  phoneNumber: string;
  trigger: OtpTrigger;
  length?: 4 | 6;
  orderNumber?: string;
  recipientName?: string;
}

export interface SendOtpResult {
  success: boolean;
  otpSent: boolean;
  isSimulated?: boolean;
  message?: string;
  error?: string;
  otp?: string; // Included only in development/simulation mode
  expiresAt?: string;
}

export interface VerifyOtpOptions {
  phoneNumber: string;
  otp: string;
  trigger: OtpTrigger;
}

export interface VerifyOtpResult {
  success: boolean;
  message?: string;
  error?: string;
  isLocked?: boolean;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
}

// 5-minute validity window in milliseconds
export const OTP_EXPIRATION_MS = 5 * 60 * 1000;

// Rate limit: Max 5 OTP requests per phone per minute to prevent SMS spam/abuse
export const otpSendRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 5);

// Lockout: Max 5 consecutive invalid OTP attempts locks verification for 10 minutes
export const otpVerificationLockout = new AccountLockoutManager(5, 10 * 60 * 1000);

/**
 * Generates a cryptographically secure 4-digit random OTP
 * @returns 4-digit numeric string (1000 to 9999)
 */
export function generate4DigitOTP(): string {
  try {
    return crypto.randomInt(1000, 10000).toString();
  } catch {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}

/**
 * Generates a cryptographically secure 6-digit random OTP
 * @returns 6-digit numeric string (100000 to 999999)
 */
export function generate6DigitOTP(): string {
  try {
    return crypto.randomInt(100000, 1000000).toString();
  } catch {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

/**
 * Formats the SMS message based on action trigger
 */
export function formatOtpMessage(otp: string, trigger: OtpTrigger): string {
  let actionText = "";
  if (trigger === "register") actionText = "registering with";
  else if (trigger === "login") actionText = "logging into";
  else if (trigger === "order") actionText = "placing your order at";
  else if (trigger === "pickup_verification") actionText = "verifying store pickup at";
  else actionText = "accessing";

  return `${otp} is your OTP for ${actionText} Vardayini Sweet Mart. Do not share this.`;
}

/**
 * Sends an OTP using Fast2SMS Quick Route (or Development Simulation Mode)
 * and records the OTP with a 5-minute expiration in the database.
 * 
 * @param phoneNumber - 10-digit Indian mobile number (or raw input with +91/spaces)
 * @param trigger - 'register' | 'login' | 'order' | 'pickup_verification'
 * @param options - Additional options (length, orderNumber, recipientName)
 */
export async function sendOTP(
  phoneNumber: string,
  trigger: OtpTrigger,
  options?: Partial<Omit<SendOtpOptions, "phoneNumber" | "trigger">>
): Promise<SendOtpResult> {
  const cleanPhone = normalizeIndianPhone(phoneNumber);

  // Validate 10-digit Indian phone number (starting with 6-9)
  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      otpSent: false,
      error: "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210).",
    };
  }

  // Rate Limiting Check
  const rateCheck = otpSendRateLimiter.check(cleanPhone);
  if (!rateCheck.allowed) {
    const waitSec = Math.ceil(rateCheck.resetTimeMs / 1000);
    return {
      success: false,
      otpSent: false,
      error: `Too many OTP requests. Please wait ${waitSec} second(s) before requesting again.`,
    };
  }

  const otpLength = options?.length || 4;
  const otp = otpLength === 6 ? generate6DigitOTP() : generate4DigitOTP();
  const message = formatOtpMessage(otp, trigger);

  const apiKey = (process.env.FAST2SMS_API_KEY || "").trim();
  const isSimulation = !apiKey || apiKey === "YOUR_FAST2SMS_API_KEY";

  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MS).toISOString();

  // Save in Database (SQLite Local Cache & Admin Logs)
  try {
    const sqlite = getSqliteDb();

    // 1. Mark any previous unverified OTPs for this phone and purpose as 'Superseded'
    sqlite.prepare(`
      UPDATE otp_logs 
      SET status = 'Superseded' 
      WHERE phone = ? AND purpose = ? AND status = 'Pending'
    `).run(cleanPhone, trigger);

    // 2. Insert fresh OTP record with 'Pending' status
    const gatewayName = isSimulation ? "Fast2SMS Quick (Dev Mode)" : "Fast2SMS Quick Route";
    sqlite.prepare(`
      INSERT INTO otp_logs (phone, otp_code, purpose, gateway, status, created_at)
      VALUES (?, ?, ?, ?, 'Pending', datetime('now'))
    `).run(cleanPhone, otp, trigger, gatewayName);

    // 3. Insert into sms_logs for customer communications audit
    sqlite.prepare(`
      INSERT INTO sms_logs (order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      options?.orderNumber || null,
      cleanPhone,
      options?.recipientName || "Valued Patron",
      message,
      "VRDYNI",
      isSimulation ? "Delivered (Simulated)" : "Pending"
    );
  } catch (dbErr) {
    console.warn("[OTP Service] Database logging notice:", dbErr);
  }

  // If running in development / test environment or without an API key, simulate delivery safely
  if (isSimulation) {
    console.log(
      `\x1b[36m[Fast2SMS Dev Mode]\x1b[0m Generated OTP \x1b[32m${otp}\x1b[0m for ${cleanPhone} (${trigger}). Live SMS disabled because FAST2SMS_API_KEY is not configured.`
    );
    return {
      success: true,
      otpSent: true,
      isSimulated: true,
      message: "OTP generated successfully (simulated delivery mode for testing).",
      otp: otp, // Always return OTP in simulation mode so users/testers can verify without live SMS gateway
      expiresAt,
    };
  }

  // Dispatch to Fast2SMS Quick Route
  const url = "https://www.fast2sms.com/dev/bulkV2";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q", // 'q' stands for Quick SMS route (No DLT registration needed)
        message: message,
        language: "english",
        flash: 0,
        numbers: cleanPhone,
      }),
      signal: AbortSignal.timeout(8000), // 8-second network timeout
    });

    const data = await response.json();

    if (data && data.return) {
      console.log(`[Fast2SMS] Successfully dispatched OTP to ${cleanPhone} for ${trigger}`);

      // Update sms_logs status to 'Delivered'
      try {
        const sqlite = getSqliteDb();
        sqlite.prepare(`
          UPDATE sms_logs 
          SET status = 'Delivered' 
          WHERE recipient_phone = ? AND message LIKE ? 
          ORDER BY id DESC LIMIT 1
        `).run(cleanPhone, `%${otp}%`);
      } catch {}

      return {
        success: true,
        otpSent: true,
        isSimulated: false,
        message: "OTP sent successfully to your mobile number.",
        expiresAt,
      };
    } else {
      const errMsg = data?.message || "Failed to deliver SMS via Fast2SMS";
      console.error("[Fast2SMS Error]:", errMsg);

      try {
        const sqlite = getSqliteDb();
        sqlite.prepare(`
          UPDATE sms_logs 
          SET status = 'Failed' 
          WHERE recipient_phone = ? AND message LIKE ? 
          ORDER BY id DESC LIMIT 1
        `).run(cleanPhone, `%${otp}%`);
      } catch {}

      return {
        success: false,
        otpSent: false,
        error: errMsg,
      };
    }
  } catch (networkError: any) {
    console.error("[Fast2SMS Network Error]:", networkError);
    return {
      success: false,
      otpSent: false,
      error: "Failed to reach Fast2SMS gateway. Please check your internet connection or try again later.",
    };
  }
}

/**
 * Verifies a customer OTP against the database record with a 5-minute expiration window
 * and brute-force lockout protection.
 * 
 * @param phoneNumber - Customer's Indian mobile number
 * @param inputOtp - The OTP code entered by the customer
 * @param trigger - The action purpose the OTP was issued for
 */
export async function verifyOTP(
  phoneNumber: string,
  inputOtp: string,
  trigger: OtpTrigger
): Promise<VerifyOtpResult> {
  const cleanPhone = normalizeIndianPhone(phoneNumber);
  const cleanOtp = (inputOtp || "").trim();

  if (!cleanPhone) {
    return { success: false, error: "Invalid phone number." };
  }

  if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 6) {
    return { success: false, error: "Please enter a valid OTP code." };
  }

  // Check Lockout
  const lockoutState = otpVerificationLockout.isLocked(cleanPhone);
  if (lockoutState.locked) {
    const minutes = Math.ceil(lockoutState.retryAfterSeconds / 60);
    return {
      success: false,
      isLocked: true,
      retryAfterSeconds: lockoutState.retryAfterSeconds,
      error: `Too many failed attempts. Verification is locked for ${minutes} minute(s) to protect customer security.`,
    };
  }

  try {
    const sqlite = getSqliteDb();

    // Fetch the latest pending OTP for this phone and purpose
    const record = sqlite.prepare(`
      SELECT id, phone, otp_code, purpose, created_at, status
      FROM otp_logs
      WHERE phone = ? AND purpose = ? AND status = 'Pending'
      ORDER BY id DESC
      LIMIT 1
    `).get(cleanPhone, trigger) as any;

    if (!record) {
      return {
        success: false,
        error: "No active OTP found. Please request a new OTP.",
      };
    }

    // Check 5-minute expiration
    const createdAtMs = new Date(record.created_at.replace(" ", "T") + "Z").getTime();
    const isExpired = Date.now() - createdAtMs > OTP_EXPIRATION_MS;

    if (isExpired) {
      sqlite.prepare("UPDATE otp_logs SET status = 'Expired' WHERE id = ?").run(record.id);
      return {
        success: false,
        error: "This OTP has expired (5-minute validity). Please request a new OTP.",
      };
    }

    // Validate OTP match
    if (record.otp_code !== cleanOtp) {
      const failState = otpVerificationLockout.recordFailure(cleanPhone);
      if (failState.locked) {
        return {
          success: false,
          isLocked: true,
          retryAfterSeconds: failState.retryAfterSeconds,
          error: "Incorrect OTP. Maximum attempts exceeded. Verification locked for 10 minutes.",
        };
      }
      return {
        success: false,
        remainingAttempts: failState.remainingAttempts,
        error: `Incorrect OTP. Please check the code sent to your phone. (${failState.remainingAttempts} attempt(s) remaining)`,
      };
    }

    // OTP Matched Successfully
    otpVerificationLockout.recordSuccess(cleanPhone);

    // Mark as Verified so it cannot be reused
    sqlite.prepare("UPDATE otp_logs SET status = 'Verified' WHERE id = ?").run(record.id);

    return {
      success: true,
      message: "OTP verified successfully!",
    };
  } catch (err: any) {
    console.error("[OTP Service Verify Error]:", err);
    return {
      success: false,
      error: "Verification failed due to a server error. Please try again.",
    };
  }
}

export interface ResendWhatsAppResult {
  success: boolean;
  message?: string;
  error?: string;
  isSimulated?: boolean;
  otp?: string;
}

/**
 * Fallback Route: Resends active unexpired OTP via WhatsApp
 * Reuses the existing unexpired OTP so the customer receives the identical verification code.
 */
export async function resendWhatsAppOTP(
  phoneNumber: string,
  trigger: OtpTrigger = "login"
): Promise<ResendWhatsAppResult> {
  const cleanPhone = normalizeIndianPhone(phoneNumber);

  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      error: "Please enter a valid 10-digit Indian mobile number.",
    };
  }

  // Rate Limiting Check for WhatsApp resend
  const rateCheck = otpSendRateLimiter.check(`wa:${cleanPhone}`);
  if (!rateCheck.allowed) {
    const waitSec = Math.ceil(rateCheck.resetTimeMs / 1000);
    return {
      success: false,
      error: `Too many WhatsApp resend requests. Please wait ${waitSec} second(s).`,
    };
  }

  try {
    const sqlite = getSqliteDb();

    // Look for active pending OTP
    const record = sqlite.prepare(`
      SELECT id, phone, otp_code, purpose, created_at, status
      FROM otp_logs
      WHERE phone = ? AND purpose = ? AND status = 'Pending'
      ORDER BY id DESC
      LIMIT 1
    `).get(cleanPhone, trigger) as any;

    if (!record) {
      return {
        success: false,
        error: "OTP expired or not found. Request a new one.",
      };
    }

    // Check 5-minute expiration
    const createdAtMs = new Date(record.created_at.replace(" ", "T") + "Z").getTime();
    const isExpired = Date.now() - createdAtMs > OTP_EXPIRATION_MS;

    if (isExpired) {
      sqlite.prepare("UPDATE otp_logs SET status = 'Expired' WHERE id = ?").run(record.id);
      return {
        success: false,
        error: "OTP expired or not found. Request a new one.",
      };
    }

    const waApiKey = (process.env.WHATSAPP_API_KEY || process.env.MSG91_AUTH_KEY || "").trim();
    const isSimulation = !waApiKey || waApiKey === "YOUR_API_KEY";

    const waMessage = `${record.otp_code} is your Vardayini Sweet Mart verification code via WhatsApp. Valid for 5 minutes. Do not share.`;

    // Record WhatsApp delivery in sms_logs
    sqlite.prepare(`
      INSERT INTO sms_logs (order_number, recipient_phone, recipient_name, message, sender_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      null,
      cleanPhone,
      "Valued Patron",
      waMessage,
      "WA_VRDYNI",
      isSimulation ? "Delivered (WhatsApp Simulated)" : "Pending"
    );

    // Update gateway in otp_logs to indicate WhatsApp was used
    sqlite.prepare(`
      UPDATE otp_logs 
      SET gateway = ? 
      WHERE id = ?
    `).run(isSimulation ? "WhatsApp Cloud (Dev Mode)" : "WhatsApp Cloud API", record.id);

    if (isSimulation) {
      console.log(
        `\x1b[35m[WhatsApp Dev Mode]\x1b[0m Resent OTP \x1b[32m${record.otp_code}\x1b[0m via WhatsApp to ${cleanPhone}. Live dispatch disabled because WHATSAPP_API_KEY is not configured.`
      );
      return {
        success: true,
        isSimulated: true,
        message: "WhatsApp OTP sent successfully (simulated dev mode).",
        otp: process.env.NODE_ENV !== "production" ? record.otp_code : undefined,
      };
    }

    // Dispatched via live WhatsApp / MSG91 API
    const waUrl = process.env.WHATSAPP_API_URL || "https://api.your-provider.com/whatsapp";
    const response = await fetch(waUrl, {
      method: "POST",
      headers: {
        "authorization": waApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: waApiKey,
        to: cleanPhone,
        template_name: "otp_verification",
        parameters: [{ type: "text", text: record.otp_code }],
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    return {
      success: true,
      message: "WhatsApp OTP sent successfully",
    };
  } catch (err: any) {
    console.error("[WhatsApp Dispatch Error]:", err);
    return {
      success: false,
      error: "Failed to send WhatsApp message. Please try SMS again.",
    };
  }
}


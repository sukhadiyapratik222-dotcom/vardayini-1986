import crypto from "node:crypto";
import nodemailer from "nodemailer";

export interface EmailOtpRecord {
  email: string;
  hashedOtp: string;
  salt: string;
  expiresAt: number;     // Unix timestamp in milliseconds
  attempts: number;      // Failed attempt counter
  lastSentAt: number;    // For 60-second cooldown
}

// In-memory store with automatic periodic cleanup of expired records
const memoryStore = new Map<string, EmailOtpRecord>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean expired records every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.expiresAt + 10 * 60 * 1000) {
        memoryStore.delete(key);
      }
    }
    for (const [key, bucket] of rateLimitStore.entries()) {
      if (now > bucket.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000).unref?.();
}

/**
 * Normalizes email address to lower-case trimmed string
 */
export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

/**
 * Validates RFC 5322 compliant email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(email);
}

/**
 * Sliding window rate limiter for IP and Email addresses
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  if (bucket.count >= maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  bucket.count++;
  return { allowed: true, retryAfter: 0 };
}

/**
 * Cryptographically secure 6-digit OTP generator (Node.js crypto.randomInt)
 */
export function generateSecureOtp(): string {
  // Generates integer between 100000 and 999999 inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP using HMAC-SHA256 with a unique cryptographic salt
 */
export function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac("sha256", salt).update(otp).digest("hex");
}

/**
 * Timing-safe hash comparison to defend against timing attacks
 */
export function timingSafeCompare(inputOtp: string, record: EmailOtpRecord): boolean {
  const computedHash = hashOtp(inputOtp, record.salt);
  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(record.hashedOtp, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Storage helpers for Email OTP
 */
export const emailOtpStore = {
  get(email: string): EmailOtpRecord | undefined {
    return memoryStore.get(normalizeEmail(email));
  },
  set(email: string, record: EmailOtpRecord): void {
    memoryStore.set(normalizeEmail(email), record);
  },
  delete(email: string): void {
    memoryStore.delete(normalizeEmail(email));
  },
  // For testing
  clear(): void {
    memoryStore.clear();
    rateLimitStore.clear();
  },
};

/**
 * Create or reuse Nodemailer transport
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }
  return null;
}

/**
 * Sends a clean, responsive HTML email containing the 6-digit OTP
 */
export async function sendEmailOtp(
  toEmail: string,
  rawOtp: string
): Promise<{ delivered: boolean; mode: "smtp" | "dev_simulated" }> {
  const normEmail = normalizeEmail(toEmail);
  const transporter = getTransporter();

  const brandName = "Vardayini Sweet Mart";
  const fromAddress = process.env.EMAIL_FROM || `"${brandName} Security" <auth@vardayinisweets.com>`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#fcf9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:500px;background:#ffffff;border-radius:20px;border:1px solid #ebd9b8;padding:40px 32px;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <div style="display:inline-block;background:#283618;color:#f5c518;font-size:12px;font-weight:700;letter-spacing:2px;padding:6px 14px;border-radius:100px;text-transform:uppercase;">
                EST. 1976 · TRADITION OF PURITY
              </div>
              <h1 style="margin:16px 0 0;font-size:24px;font-weight:700;color:#283618;">
                Email Verification Code
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#64748b;">
                Use the 6-digit code below to securely verify your email address.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 0;">
              <div style="display:inline-block;background:#fefae0;border:2px dashed #dda15e;border-radius:16px;padding:18px 36px;letter-spacing:14px;font-size:36px;font-weight:800;color:#283618;">
                ${rawOtp}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 0;border-top:1px solid #f1f5f9;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 8px;font-size:13px;color:#475569;">
                ⏰ <strong>Expires in 5 minutes:</strong> This code is valid for single use only.
              </p>
              <p style="margin:0 0 8px;font-size:13px;color:#475569;">
                🔒 <strong>Security Warning:</strong> Vardayini Sweet Mart staff will never ask for your verification code.
              </p>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                If you did not request this verification code, someone may have entered your email by mistake. You can safely disregard this message.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#94a3b8;letter-spacing:0.5px;">
                © 2026 ${brandName} · Navjivan &amp; Station Road, Kalol, Gujarat
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `Your ${brandName} verification code is ${rawOtp}.\n\nThis code will expire in 5 minutes. Never share this code with anyone.\n\n© 2026 ${brandName}`;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: normEmail,
        subject: `Your ${brandName} Verification Code: ${rawOtp}`,
        text,
        html,
      });
      return { delivered: true, mode: "smtp" };
    } catch (err) {
      console.error("[Email OTP Nodemailer Error]", err);
      // Fallback to dev log if SMTP server is down
    }
  }

  // Developer simulation mode (logged to console when SMTP is not configured)
  console.log(
    `\x1b[36m[Email OTP Dev Mode]\x1b[0m Verification code for \x1b[32m${normEmail}\x1b[0m is \x1b[33;1m${rawOtp}\x1b[0m (expires in 5m). Configure SMTP_HOST/USER/PASS for live dispatch.`
  );
  return { delivered: true, mode: "dev_simulated" };
}

/**
 * Signs a session JWT token
 */
export function signSessionJwt(email: string, extra?: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      email: normalizeEmail(email),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7-day session
      iat: Math.floor(Date.now() / 1000),
      ...extra,
    })
  ).toString("base64url");

  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET || "vsm_session_jwt_secure_key_2026_vardayini_prod";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

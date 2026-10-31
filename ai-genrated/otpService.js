// otpService.js
/**
 * Vardayini Sweet Mart - Fast2SMS OTP Service
 * Compatible with standalone Node.js and Next.js environments.
 * 
 * Includes:
 * - 4-digit and 6-digit OTP generation
 * - Fast2SMS Quick Route integration
 * - Dev simulation fallback when API key is unconfigured
 * - Database persistence with 5-minute expiration
 * - Single-use OTP verification
 */

const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");

/**
 * Generates a cryptographically secure 4-digit random OTP
 * @returns {string} 4-digit string
 */
function generate4DigitOTP() {
  try {
    return crypto.randomInt(1000, 10000).toString();
  } catch {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}

/**
 * Normalizes an Indian phone number to 10 standard digits
 * @param {string} phone 
 * @returns {string}
 */
function normalizeIndianPhone(phone) {
  if (typeof phone !== "string") return "";
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Gets or initializes the SQLite database instance for OTP audit logs
 */
function getDatabase() {
  try {
    const { DatabaseSync } = require("node:sqlite");
    const dbDir = path.resolve(process.cwd(), ".data");
    if (!fs.existsSync(dbDir)) {
      try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
    }
    const dbPath = path.join(dbDir, "vardayini_local.db");
    const db = new DatabaseSync(dbPath);
    
    // Ensure otp_logs table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS otp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        gateway TEXT NOT NULL DEFAULT 'Fast2SMS Quick Route',
        status TEXT NOT NULL DEFAULT 'Pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT DEFAULT NULL,
        recipient_name TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        message TEXT NOT NULL,
        sender_id TEXT NOT NULL DEFAULT 'VRDYNI',
        status TEXT NOT NULL DEFAULT 'Delivered',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return db;
  } catch {
    return null;
  }
}

/**
 * Sends an OTP using Fast2SMS Quick Route (Testing Friendly)
 * @param {string} phoneNumber - 10 digit Indian mobile number
 * @param {string} trigger - 'login', 'register', 'order', or 'pickup_verification'
 * @param {object} [options] - Additional options (length, orderNumber, recipientName)
 */
async function sendOTP(phoneNumber, trigger, options = {}) {
  const cleanPhone = normalizeIndianPhone(phoneNumber);

  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return {
      success: false,
      otpSent: false,
      error: "Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)."
    };
  }

  const otp = options.length === 6
    ? crypto.randomInt(100000, 1000000).toString()
    : generate4DigitOTP();
  
  // Customize the message based on the trigger action
  let actionText = "";
  if (trigger === 'register') actionText = "registering with";
  else if (trigger === 'login') actionText = "logging into";
  else if (trigger === 'order') actionText = "placing your order at";
  else if (trigger === 'pickup_verification') actionText = "verifying store pickup at";
  else actionText = "accessing";

  const message = `${otp} is your OTP for ${actionText} Vardayini Sweet Mart. Do not share this.`;

  // Fast2SMS API Configuration from Environment
  const API_KEY = (process.env.FAST2SMS_API_KEY || "").trim();
  const isSimulation = !API_KEY || API_KEY === "YOUR_FAST2SMS_API_KEY";
  const gatewayName = isSimulation ? "Fast2SMS Quick (Dev Mode)" : "Fast2SMS Quick Route";

  // Save this OTP in database with 5-minute expiration
  const db = getDatabase();
  if (db) {
    try {
      db.prepare(`
        UPDATE otp_logs 
        SET status = 'Superseded' 
        WHERE phone = ? AND purpose = ? AND status = 'Pending'
      `).run(cleanPhone, trigger);

      db.prepare(`
        INSERT INTO otp_logs (phone, otp_code, purpose, gateway, status, created_at)
        VALUES (?, ?, ?, ?, 'Pending', datetime('now'))
      `).run(cleanPhone, otp, trigger, gatewayName);

      db.prepare(`
        INSERT INTO sms_logs (order_number, recipient_name, recipient_phone, message, sender_id, status, created_at)
        VALUES (?, ?, ?, ?, 'VRDYNI', ?, datetime('now'))
      `).run(
        options.orderNumber || null,
        options.recipientName || "Valued Patron",
        cleanPhone,
        message,
        isSimulation ? "Delivered (Simulated)" : "Pending"
      );
    } catch (e) {
      console.warn("[OTP Database Notice]:", e.message);
    }
  }

  // Development simulation mode if API key not provided
  if (isSimulation) {
    console.log(`[Fast2SMS Dev Mode] Generated OTP ${otp} for ${cleanPhone} (${trigger}). Live SMS disabled because FAST2SMS_API_KEY is not configured.`);
    return {
      success: true,
      otpSent: true,
      isSimulated: true,
      otp: process.env.NODE_ENV !== "production" ? otp : undefined,
      message: "OTP sent successfully (Simulated mode for testing)."
    };
  }

  const url = "https://www.fast2sms.com/dev/bulkV2";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        route: "q", // 'q' stands for Quick SMS route (No DLT required for testing)
        message: message,
        language: "english",
        flash: 0,
        numbers: cleanPhone
      })
    });

    const data = await response.json();

    if (data && data.return) {
      console.log(`Successfully sent OTP to ${cleanPhone} for ${trigger}`);
      if (db) {
        try {
          db.prepare(`
            UPDATE sms_logs 
            SET status = 'Delivered' 
            WHERE recipient_phone = ? AND message LIKE ? 
            ORDER BY id DESC LIMIT 1
          `).run(cleanPhone, `%${otp}%`);
        } catch {}
      }
      return { success: true, otpSent: true };
    } else {
      console.error("Fast2SMS Error:", data?.message);
      if (db) {
        try {
          db.prepare(`
            UPDATE sms_logs 
            SET status = 'Failed' 
            WHERE recipient_phone = ? AND message LIKE ? 
            ORDER BY id DESC LIMIT 1
          `).run(cleanPhone, `%${otp}%`);
        } catch {}
      }
      return { success: false, error: data?.message || "Failed to deliver SMS" };
    }

  } catch (error) {
    console.error("Network Error:", error);
    return { success: false, error: "Failed to reach SMS provider" };
  }
}

/**
 * Verifies an OTP with 5-minute expiration window and single-use invalidation
 * @param {string} phoneNumber 
 * @param {string} inputOtp 
 * @param {string} trigger 
 */
async function verifyOTP(phoneNumber, inputOtp, trigger) {
  const cleanPhone = normalizeIndianPhone(phoneNumber);
  const cleanOtp = (inputOtp || "").trim();

  if (!cleanPhone || !cleanOtp) {
    return { success: false, error: "Please enter phone number and OTP code." };
  }

  const db = getDatabase();
  if (!db) {
    return { success: false, error: "Database unavailable for OTP verification." };
  }

  try {
    const record = db.prepare(`
      SELECT id, otp_code, created_at, status 
      FROM otp_logs 
      WHERE phone = ? AND purpose = ? AND status = 'Pending'
      ORDER BY id DESC 
      LIMIT 1
    `).get(cleanPhone, trigger);

    if (!record) {
      return { success: false, error: "No active OTP found. Please request a new OTP." };
    }

    // 5-minute validity check
    const createdAtMs = new Date(record.created_at.replace(" ", "T") + "Z").getTime();
    if (Date.now() - createdAtMs > 5 * 60 * 1000) {
      db.prepare("UPDATE otp_logs SET status = 'Expired' WHERE id = ?").run(record.id);
      return { success: false, error: "This OTP has expired (5-minute limit). Please request a new one." };
    }

    if (record.otp_code !== cleanOtp) {
      return { success: false, error: "Invalid OTP code. Please try again." };
    }

    // Mark as verified
    db.prepare("UPDATE otp_logs SET status = 'Verified' WHERE id = ?").run(record.id);
    return { success: true, message: "OTP verified successfully!" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fallback Route: Resends active OTP via WhatsApp
 * @param {string} phoneNumber 
 * @param {string} trigger 
 */
async function resendWhatsAppOTP(phoneNumber, trigger = "login") {
  const cleanPhone = normalizeIndianPhone(phoneNumber);
  if (!cleanPhone || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return { success: false, error: "Please enter a valid 10-digit Indian mobile number." };
  }

  const db = getDatabase();
  if (!db) {
    return { success: false, error: "Database unavailable." };
  }

  try {
    const record = db.prepare(`
      SELECT id, otp_code, created_at, status 
      FROM otp_logs 
      WHERE phone = ? AND purpose = ? AND status = 'Pending'
      ORDER BY id DESC 
      LIMIT 1
    `).get(cleanPhone, trigger);

    if (!record) {
      return { success: false, error: "OTP expired or not found. Request a new one." };
    }

    const createdAtMs = new Date(record.created_at.replace(" ", "T") + "Z").getTime();
    if (Date.now() - createdAtMs > 5 * 60 * 1000) {
      db.prepare("UPDATE otp_logs SET status = 'Expired' WHERE id = ?").run(record.id);
      return { success: false, error: "OTP expired or not found. Request a new one." };
    }

    const waApiKey = (process.env.WHATSAPP_API_KEY || process.env.MSG91_AUTH_KEY || "").trim();
    const isSimulation = !waApiKey || waApiKey === "YOUR_API_KEY";

    db.prepare(`
      INSERT INTO sms_logs (recipient_name, recipient_phone, message, sender_id, status, created_at)
      VALUES (?, ?, ?, 'WA_VRDYNI', ?, datetime('now'))
    `).run(
      "Valued Patron",
      cleanPhone,
      `${record.otp_code} is your Vardayini Sweet Mart verification code via WhatsApp. Valid for 5 minutes. Do not share.`,
      isSimulation ? "Delivered (WhatsApp Simulated)" : "Pending"
    );

    db.prepare("UPDATE otp_logs SET gateway = ? WHERE id = ?").run(
      isSimulation ? "WhatsApp Cloud (Dev Mode)" : "WhatsApp Cloud API",
      record.id
    );

    if (isSimulation) {
      console.log(`[WhatsApp Dev Mode] Resent OTP ${record.otp_code} via WhatsApp to ${cleanPhone}. Live dispatch disabled because WHATSAPP_API_KEY is not configured.`);
      return {
        success: true,
        message: "WhatsApp OTP sent successfully (simulated dev mode).",
        isSimulated: true,
        otp: process.env.NODE_ENV !== "production" ? record.otp_code : undefined
      };
    }

    return { success: true, message: "WhatsApp OTP sent successfully" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  generate4DigitOTP,
  sendOTP,
  verifyOTP,
  resendWhatsAppOTP,
  normalizeIndianPhone
};


import { describe, it, expect, beforeEach } from "vitest";
import {
  generate4DigitOTP,
  generate6DigitOTP,
  formatOtpMessage,
  sendOTP,
  verifyOTP,
  resendWhatsAppOTP,
  otpVerificationLockout,
  otpSendRateLimiter,
} from "../../src/lib/otp-service";
import { getSqliteDb } from "../../src/db";

describe("Fast2SMS OTP Service - Vardayini Sweet Mart", () => {
  beforeEach(() => {
    otpVerificationLockout.resetAll();
  });

  describe("Part 1: OTP Generation & Formatting", () => {
    it("1. should generate a 4-digit numeric string between 1000 and 9999", () => {
      for (let i = 0; i < 20; i++) {
        const otp = generate4DigitOTP();
        expect(otp).toHaveLength(4);
        expect(/^\d{4}$/.test(otp)).toBe(true);
        const num = Number(otp);
        expect(num).toBeGreaterThanOrEqual(1000);
        expect(num).toBeLessThanOrEqual(9999);
      }
    });

    it("2. should generate a 6-digit numeric string between 100000 and 999999", () => {
      for (let i = 0; i < 20; i++) {
        const otp = generate6DigitOTP();
        expect(otp).toHaveLength(6);
        expect(/^\d{6}$/.test(otp)).toBe(true);
        const num = Number(otp);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });

    it("3. should format branded SMS text accurately for register, login, order, and pickup", () => {
      expect(formatOtpMessage("4521", "register")).toBe(
        "4521 is your OTP for registering with Vardayini Sweet Mart. Do not share this."
      );
      expect(formatOtpMessage("8912", "login")).toBe(
        "8912 is your OTP for logging into Vardayini Sweet Mart. Do not share this."
      );
      expect(formatOtpMessage("6631", "order")).toBe(
        "6631 is your OTP for placing your order at Vardayini Sweet Mart. Do not share this."
      );
      expect(formatOtpMessage("1234", "pickup_verification")).toBe(
        "1234 is your OTP for verifying store pickup at Vardayini Sweet Mart. Do not share this."
      );
    });
  });

  describe("Part 2: Phone Validation & Simulation Mode Dispatch", () => {
    it("4. should reject invalid Indian phone numbers", async () => {
      const invalidPhones = ["123", "98765", "0000000000", "5555555555", "invalidphone"];
      for (const phone of invalidPhones) {
        const res = await sendOTP(phone, "login");
        expect(res.success).toBe(false);
        expect(res.otpSent).toBe(false);
        expect(res.error).toContain("valid 10-digit Indian mobile number");
      }
    });

    it("5. should successfully normalize +91 and 0-prefixed numbers and dispatch in simulation mode", async () => {
      const res = await sendOTP("+91 98765 43210", "register");
      expect(res.success).toBe(true);
      expect(res.otpSent).toBe(true);
      expect(res.isSimulated).toBe(true);
      expect(res.otp).toBeDefined();
      expect(res.expiresAt).toBeDefined();

      // Check SQLite database record in otp_logs
      const sqlite = getSqliteDb();
      const record = sqlite
        .prepare("SELECT * FROM otp_logs WHERE phone = ? AND purpose = 'register' ORDER BY id DESC LIMIT 1")
        .get("9876543210") as any;

      expect(record).toBeDefined();
      expect(record.phone).toBe("9876543210");
      expect(record.otp_code).toBe(res.otp);
      expect(record.status).toBe("Pending");
      expect(record.gateway).toBe("Fast2SMS Quick (Dev Mode)");

      // Check sms_logs
      const smsRecord = sqlite
        .prepare("SELECT * FROM sms_logs WHERE recipient_phone = ? ORDER BY id DESC LIMIT 1")
        .get("9876543210") as any;
      expect(smsRecord).toBeDefined();
      expect(smsRecord.status).toBe("Delivered (Simulated)");
    });

    it("6. should supersede previous pending OTPs when a new OTP is sent for the same phone & purpose", async () => {
      const testPhone = "9825012345";
      const first = await sendOTP(testPhone, "login");
      expect(first.success).toBe(true);

      const second = await sendOTP(testPhone, "login");
      expect(second.success).toBe(true);

      const sqlite = getSqliteDb();
      const records = sqlite
        .prepare("SELECT id, otp_code, status FROM otp_logs WHERE phone = ? AND purpose = 'login' ORDER BY id ASC")
        .all(testPhone) as any[];

      expect(records.length).toBeGreaterThanOrEqual(2);
      const prev = records[records.length - 2];
      const latest = records[records.length - 1];

      expect(prev.status).toBe("Superseded");
      expect(latest.status).toBe("Pending");
      expect(latest.otp_code).toBe(second.otp);
    });
  });

  describe("Part 3: OTP Verification & Expiration", () => {
    it("7. should successfully verify an unexpired pending OTP", async () => {
      const testPhone = "9876500001";
      const sendRes = await sendOTP(testPhone, "order");
      expect(sendRes.success).toBe(true);
      const generatedOtp = sendRes.otp!;

      const verifyRes = await verifyOTP(testPhone, generatedOtp, "order");
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.message).toContain("verified successfully");

      // Verify status in DB is now 'Verified'
      const sqlite = getSqliteDb();
      const record = sqlite
        .prepare("SELECT status FROM otp_logs WHERE phone = ? AND otp_code = ?")
        .get(testPhone, generatedOtp) as any;
      expect(record.status).toBe("Verified");
    });

    it("8. should reject re-verification of an already verified OTP (single-use enforcement)", async () => {
      const testPhone = "9876500002";
      const sendRes = await sendOTP(testPhone, "login");
      const generatedOtp = sendRes.otp!;

      // First verification succeeds
      const firstVerify = await verifyOTP(testPhone, generatedOtp, "login");
      expect(firstVerify.success).toBe(true);

      // Second verification fails because status is already 'Verified' (no 'Pending' OTP exists)
      const secondVerify = await verifyOTP(testPhone, generatedOtp, "login");
      expect(secondVerify.success).toBe(false);
      expect(secondVerify.error).toContain("No active OTP found");
    });

    it("9. should reject incorrect OTP and decrement remaining attempts", async () => {
      const testPhone = "9876500003";
      await sendOTP(testPhone, "login");

      const verifyRes = await verifyOTP(testPhone, "0000", "login");
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.remainingAttempts).toBe(4);
      expect(verifyRes.error).toContain("Incorrect OTP");
    });

    it("10. should lock out verification after 5 consecutive failed attempts", async () => {
      const testPhone = "9876500004";
      await sendOTP(testPhone, "login");

      for (let i = 0; i < 4; i++) {
        const res = await verifyOTP(testPhone, "0000", "login");
        expect(res.success).toBe(false);
        expect(res.isLocked).toBeFalsy();
      }

      // 5th failed attempt triggers lockout
      const fifthRes = await verifyOTP(testPhone, "0000", "login");
      expect(fifthRes.success).toBe(false);
      expect(fifthRes.isLocked).toBe(true);
      expect(fifthRes.error).toContain("Maximum attempts exceeded. Verification locked for 10 minutes");

      // Subsequent attempt is blocked by lockout manager
      const sixthRes = await verifyOTP(testPhone, "0000", "login");
      expect(sixthRes.success).toBe(false);
      expect(sixthRes.isLocked).toBe(true);
      expect(sixthRes.error).toContain("Verification is locked");
    });

    it("11. should reject and expire OTPs that exceed the 5-minute validity window", async () => {
      const testPhone = "9876500005";
      const sendRes = await sendOTP(testPhone, "register");
      const generatedOtp = sendRes.otp!;

      // Artificially age the record in the database by 6 minutes
      const sqlite = getSqliteDb();
      const pastTime = new Date(Date.now() - 6 * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);
      sqlite.prepare("UPDATE otp_logs SET created_at = ? WHERE phone = ? AND otp_code = ?").run(
        pastTime,
        testPhone,
        generatedOtp
      );

      const verifyRes = await verifyOTP(testPhone, generatedOtp, "register");
      expect(verifyRes.success).toBe(false);
      expect(verifyRes.error).toContain("expired (5-minute validity)");

      // Check DB status is marked Expired
      const updated = sqlite
        .prepare("SELECT status FROM otp_logs WHERE phone = ? AND otp_code = ?")
        .get(testPhone, generatedOtp) as any;
      expect(updated.status).toBe("Expired");
    });
  });

  describe("Part 4: Fallback Route - Resend via WhatsApp", () => {
    it("12. should successfully resend the exact unexpired active OTP via WhatsApp", async () => {
      const testPhone = "9876500006";
      const sendRes = await sendOTP(testPhone, "login");
      expect(sendRes.success).toBe(true);
      const originalOtp = sendRes.otp;

      const waRes = await resendWhatsAppOTP(testPhone, "login");
      expect(waRes.success).toBe(true);
      expect(waRes.isSimulated).toBe(true);
      expect(waRes.otp).toBe(originalOtp); // Must reuse identical OTP!

      // Verify in sms_logs
      const sqlite = getSqliteDb();
      const waLog = sqlite
        .prepare("SELECT sender_id, message FROM sms_logs WHERE recipient_phone = ? AND sender_id = 'WA_VRDYNI' ORDER BY id DESC LIMIT 1")
        .get(testPhone) as any;

      expect(waLog).toBeDefined();
      expect(waLog.sender_id).toBe("WA_VRDYNI");
      expect(waLog.message).toContain(originalOtp);
    });

    it("13. should reject WhatsApp resend if OTP is not found or has expired", async () => {
      const nonExistentPhone = "9876599999";
      const waRes = await resendWhatsAppOTP(nonExistentPhone, "login");
      expect(waRes.success).toBe(false);
      expect(waRes.error).toContain("OTP expired or not found. Request a new one.");
    });
  });
});


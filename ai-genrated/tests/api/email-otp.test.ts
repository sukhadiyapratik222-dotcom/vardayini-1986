import { describe, it, expect, beforeEach } from "vitest";
import { POST as sendOtpHandler } from "@/app/api/send-otp/route";
import { POST as verifyOtpHandler } from "@/app/api/verify-otp/route";
import { emailOtpStore, hashOtp } from "@/lib/email-otp";

describe("Production-Ready Email OTP Verification System", () => {
  beforeEach(() => {
    emailOtpStore.clear();
  });

  describe("POST /api/send-otp", () => {
    it("rejects invalid or empty email addresses with 400", async () => {
      const res = await sendOtpHandler(
        new Request("http://localhost:9449/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "invalid-email" }),
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("valid email address");
    });

    it("generates 6-digit OTP, stores hashed OTP (never plain text), and dispatches code", async () => {
      const testEmail = "testcustomer@vardayini.com";
      const res = await sendOtpHandler(
        new Request("http://localhost:9449/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();

      // Check DB record
      const stored = emailOtpStore.get(testEmail);
      expect(stored).toBeDefined();
      expect(stored?.hashedOtp).toBeDefined();
      expect(stored?.salt).toBeDefined();
      expect(stored?.hashedOtp.length).toBe(64); // SHA-256 hex string
      // Plain text code must NEVER be in stored record
      expect(stored?.hashedOtp).not.toMatch(/^\d{6}$/);
      expect(stored?.attempts).toBe(0);
      expect(stored?.expiresAt).toBeGreaterThan(Date.now() + 4 * 60 * 1000); // ~5 mins
    });

    it("enforces 60-second resend cooldown", async () => {
      const testEmail = "cooldown@vardayini.com";

      // 1st request
      const res1 = await sendOtpHandler(
        new Request("http://localhost:9449/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail }),
        })
      );
      expect(res1.status).toBe(200);

      // Immediate 2nd request (must be rejected)
      const res2 = await sendOtpHandler(
        new Request("http://localhost:9449/api/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail }),
        })
      );
      expect(res2.status).toBe(429);
      const data2 = await res2.json();
      expect(data2.error).toContain("seconds before requesting");
    });
  });

  describe("POST /api/verify-otp", () => {
    it("rejects invalid 6-digit code format", async () => {
      const res = await verifyOtpHandler(
        new Request("http://localhost:9449/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "user@vardayini.com", otp: "123" }),
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("6-digit");
    });

    it("rejects non-existent or expired OTP records", async () => {
      const res = await verifyOtpHandler(
        new Request("http://localhost:9449/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "ghost@vardayini.com", otp: "123456" }),
        })
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("expired or not found");
    });

    it("locks out and revokes OTP after 5 consecutive incorrect attempts", async () => {
      const testEmail = "lockout@vardayini.com";
      const salt = "random_salt_12345";
      const correctOtp = "654321";

      emailOtpStore.set(testEmail, {
        email: testEmail,
        hashedOtp: hashOtp(correctOtp, salt),
        salt,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        lastSentAt: Date.now(),
      });

      // 4 wrong attempts
      for (let i = 1; i <= 4; i++) {
        const res = await verifyOtpHandler(
          new Request("http://localhost:9449/api/verify-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: testEmail, otp: "000000" }),
          })
        );
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.attemptsRemaining).toBe(5 - i);
      }

      // 5th wrong attempt triggers lockout
      const res5 = await verifyOtpHandler(
        new Request("http://localhost:9449/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, otp: "000000" }),
        })
      );
      expect(res5.status).toBe(400);
      const data5 = await res5.json();
      expect(data5.error).toContain("revoked");

      // Verify record is destroyed
      expect(emailOtpStore.get(testEmail)).toBeUndefined();
    });

    it("successfully verifies correct OTP, deletes it (single use), and issues session token", async () => {
      const testEmail = "success@vardayini.com";
      const salt = "secure_salt_789";
      const correctOtp = "987654";

      emailOtpStore.set(testEmail, {
        email: testEmail,
        hashedOtp: hashOtp(correctOtp, salt),
        salt,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        lastSentAt: Date.now(),
      });

      const res = await verifyOtpHandler(
        new Request("http://localhost:9449/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, otp: correctOtp }),
        })
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();

      // Ensure single-use: record must be deleted immediately
      expect(emailOtpStore.get(testEmail)).toBeUndefined();

      // Trying the same OTP a second time must fail
      const replayRes = await verifyOtpHandler(
        new Request("http://localhost:9449/api/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: testEmail, otp: correctOtp }),
        })
      );
      expect(replayRes.status).toBe(400);
    });
  });
});

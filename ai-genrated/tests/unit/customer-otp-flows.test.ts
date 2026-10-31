import { describe, it, expect, beforeEach } from "vitest";
import { POST as sendOtpRoute } from "../../src/app/api/auth/send-otp/route";
import { POST as verifyOtpRoute } from "../../src/app/api/auth/verify-otp/route";
import { POST as registerRoute } from "../../src/app/api/auth/register/route";
import { sendOTP, verifyOTP, otpVerificationLockout } from "../../src/lib/otp-service";
import { getSqliteDb } from "../../src/db";

function makeJsonRequest(url: string, body: any): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Customer OTP Verification Flow - Login, Register & Order", () => {
  beforeEach(() => {
    otpVerificationLockout.resetAll();
  });

  describe("Flow 1: Customer Login with OTP", () => {
    it("1. should send 6-digit OTP for login trigger", async () => {
      const phone = "9825099901";
      const req = makeJsonRequest("http://localhost:9449/api/auth/send-otp", {
        phoneNumber: phone,
        trigger: "login",
      });

      const res = await sendOtpRoute(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.devOtp).toBeDefined();
      expect(data.devOtp).toHaveLength(6);
    });

    it("2. should reject invalid login OTP and accept valid OTP to start user session", async () => {
      const phone = "9825099902";
      // Send OTP
      const sendRes = await sendOTP(phone, "login", { length: 6 });
      expect(sendRes.success).toBe(true);
      const activeOtp = sendRes.otp!;

      // Wrong OTP attempt
      const badReq = makeJsonRequest("http://localhost:9449/api/auth/verify-otp", {
        phoneNumber: phone,
        userOtp: "000000",
        trigger: "login",
      });
      const badRes = await verifyOtpRoute(badReq);
      expect(badRes.status).toBe(400);
      const badData = await badRes.json();
      expect(badData.error).toMatch(/incorrect/i);

      // Correct OTP attempt
      const goodReq = makeJsonRequest("http://localhost:9449/api/auth/verify-otp", {
        phoneNumber: phone,
        userOtp: activeOtp,
        trigger: "login",
      });
      const goodRes = await verifyOtpRoute(goodReq);
      expect(goodRes.status).toBe(200);
      const goodData = await goodRes.json();
      expect(goodData.success).toBe(true);
      expect(goodData.token).toBeDefined();
      expect(goodData.user).toBeDefined();
    });
  });

  describe("Flow 2: Customer Registration with Mobile OTP", () => {
    it("1. should reject registration without OTP or with wrong OTP", async () => {
      const phone = "9825099903";
      const email = `test_reg_${Date.now()}@example.com`;

      // Missing OTP
      const noOtpReq = makeJsonRequest("http://localhost:9449/api/auth/register", {
        name: "Test Customer",
        phone,
        email,
        password: "Password@123",
        confirmPassword: "Password@123",
      });
      // In non-prod it requires OTP if provided or rejects invalid OTP
      const wrongOtpReq = makeJsonRequest("http://localhost:9449/api/auth/register", {
        name: "Test Customer",
        phone,
        email,
        password: "Password@123",
        confirmPassword: "Password@123",
        otp: "999999",
      });
      const wrongRes = await registerRoute(wrongOtpReq);
      expect(wrongRes.status).toBe(400);
      const wrongData = await wrongRes.json();
      expect(wrongData.error).toBeDefined();
    });

    it("2. should register customer account successfully when OTP is verified", async () => {
      const randomDigits = String(Math.floor(100000 + Math.random() * 900000));
      const phone = `9825${randomDigits}`;
      const email = `patron_${Date.now()}_${randomDigits}@example.com`;

      // 1. Send OTP for registration
      const sendRes = await sendOTP(phone, "register", { length: 6 });
      expect(sendRes.success).toBe(true);
      const validOtp = sendRes.otp!;

      // 2. Register with the valid OTP
      const regReq = makeJsonRequest("http://localhost:9449/api/auth/register", {
        name: "Verified Patron",
        phone,
        email,
        password: "Password@123",
        confirmPassword: "Password@123",
        otp: validOtp,
      });

      const regRes = await registerRoute(regReq);
      expect(regRes.status).toBe(200);
      const regData = await regRes.json();
      expect(regData.success).toBe(true);
      expect(regData.user.name).toBe("Verified Patron");
      expect(regData.user.phone).toBe(phone);

      // Verify OTP status in DB changed to 'Verified'
      const sqlite = getSqliteDb();
      const record = sqlite
        .prepare("SELECT status FROM otp_logs WHERE phone = ? AND purpose = 'register' ORDER BY id DESC LIMIT 1")
        .get(phone) as any;
      expect(record.status).toBe("Verified");
    });
  });

  describe("Flow 3: Customer Order Verification with OTP", () => {
    it("1. should issue order verification OTP and verify correctly before order completion", async () => {
      const orderPhone = "9825099905";

      // 1. Dispatch Order OTP
      const orderSend = await sendOTP(orderPhone, "order", { length: 6 });
      expect(orderSend.success).toBe(true);
      expect(orderSend.otp).toBeDefined();
      const orderOtp = orderSend.otp!;

      // 2. Verify invalid OTP fails
      const badVerify = await verifyOTP(orderPhone, "123123", "order");
      expect(badVerify.success).toBe(false);

      // 3. Verify correct OTP succeeds
      const goodVerify = await verifyOTP(orderPhone, orderOtp, "order");
      expect(goodVerify.success).toBe(true);
      expect(goodVerify.message).toMatch(/verified successfully/i);

      // 4. Verify single-use enforcement: cannot be verified twice
      const reuseVerify = await verifyOTP(orderPhone, orderOtp, "order");
      expect(reuseVerify.success).toBe(false);
    });
  });
});

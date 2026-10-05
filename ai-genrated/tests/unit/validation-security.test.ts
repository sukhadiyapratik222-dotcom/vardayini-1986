import { describe, it, expect, beforeEach } from "vitest";
import {
  LoginSchema,
  RegisterSchema,
  AddressSchema,
} from "../../src/lib/validation";
import {
  sanitizeString,
  normalizeIndianPhone,
  SlidingWindowRateLimiter,
  AccountLockoutManager,
  DUMMY_BCRYPT_HASH,
} from "../../src/lib/security";
import bcrypt from "bcryptjs";

describe("Security & Validation Engine - Vardayini Sweet Mart", () => {
  // ==========================================
  // PART 1: LOGIN & AUTH VALIDATION TESTS
  // ==========================================

  describe("Part 1: Login & Registration Validation", () => {
    it("1. should successfully validate valid login credentials", () => {
      const result = LoginSchema.safeParse({
        email: "PATRON@VARDAYINI.COM ",
        password: "SweetMartPassword!2026",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("patron@vardayini.com");
        expect(result.data.password).toBe("SweetMartPassword!2026");
      }
    });

    it("2. should reject invalid email format (missing @ or invalid domain)", () => {
      const invalidEmails = [
        "notanemail",
        "missingatsign.com",
        "@nodomain.com",
        "spaces in@email.com",
        "double@@domain.com",
      ];

      for (const email of invalidEmails) {
        const result = LoginSchema.safeParse({
          email,
          password: "ValidPassword123!",
        });
        expect(result.success).toBe(false);
      }
    });

    it("3. should reject emails longer than 254 characters (RFC-5321 limit)", () => {
      const longEmail = "a".repeat(245) + "@domain.com"; // > 254 chars
      const result = LoginSchema.safeParse({
        email: longEmail,
        password: "ValidPassword123!",
      });

      expect(result.success).toBe(false);
    });

    it("4. should enforce password length bounds (min 8 chars, max 64 chars)", () => {
      // Too short
      const shortResult = LoginSchema.safeParse({
        email: "user@vardayini.com",
        password: "1234567", // 7 chars
      });
      expect(shortResult.success).toBe(false);

      // Too long (>64 characters prevents bcrypt CPU exhaustion)
      const longResult = LoginSchema.safeParse({
        email: "user@vardayini.com",
        password: "A".repeat(65),
      });
      expect(longResult.success).toBe(false);
    });

    it("5. should enforce password complexity on registration (upper, lower, number, special)", () => {
      // Missing uppercase
      expect(
        RegisterSchema.safeParse({
          name: "Pratik Patel",
          email: "test@vardayini.com",
          phone: "9876543210",
          password: "password123!",
          confirmPassword: "password123!",
        }).success
      ).toBe(false);

      // Missing special character
      expect(
        RegisterSchema.safeParse({
          name: "Pratik Patel",
          email: "test@vardayini.com",
          phone: "9876543210",
          password: "Password123",
          confirmPassword: "Password123",
        }).success
      ).toBe(false);

      // Valid complex password
      const valid = RegisterSchema.safeParse({
        name: "Pratik Patel",
        email: "test@vardayini.com",
        phone: "9876543210",
        password: "KajuKatli@2026",
        confirmPassword: "KajuKatli@2026",
      });
      expect(valid.success).toBe(true);
    });

    it("6. should block common / easily guessed passwords on registration", () => {
      const commonPwds = ["password123", "admin123", "sweet123", "qwerty123"];

      for (const pwd of commonPwds) {
        const result = RegisterSchema.safeParse({
          name: "Pratik Patel",
          email: "test@vardayini.com",
          phone: "9876543210",
          password: pwd,
          confirmPassword: pwd,
        });
        expect(result.success).toBe(false);
      }
    });

    it("7. should reject registration when password and confirmPassword do not match", () => {
      const result = RegisterSchema.safeParse({
        name: "Pratik Patel",
        email: "test@vardayini.com",
        phone: "9876543210",
        password: "StrongPass!2026",
        confirmPassword: "DifferentPass!2026",
      });

      expect(result.success).toBe(false);
    });

    it("8. should enforce rate limiting after repeated rapid requests", () => {
      const limiter = new SlidingWindowRateLimiter(60 * 1000, 3); // Max 3 requests
      const testKey = "test-ip-1.2.3.4";

      expect(limiter.check(testKey).allowed).toBe(true);
      expect(limiter.check(testKey).allowed).toBe(true);
      expect(limiter.check(testKey).allowed).toBe(true);

      // 4th request must be blocked
      const fourth = limiter.check(testKey);
      expect(fourth.allowed).toBe(false);
      expect(fourth.remaining).toBe(0);
      expect(fourth.resetTimeMs).toBeGreaterThan(0);
    });

    it("9. should trigger account lockout after 5 consecutive failed login attempts", () => {
      const lockoutManager = new AccountLockoutManager(5, 15 * 60 * 1000);
      const email = "victim@vardayini.com";

      // 4 failures: not locked yet
      for (let i = 1; i <= 4; i++) {
        const attempt = lockoutManager.recordFailure(email);
        expect(attempt.locked).toBe(false);
        expect(attempt.remainingAttempts).toBe(5 - i);
      }

      // 5th failure: account is locked!
      const fifth = lockoutManager.recordFailure(email);
      expect(fifth.locked).toBe(true);
      expect(fifth.remainingAttempts).toBe(0);
      expect(fifth.retryAfterSeconds).toBeGreaterThan(0);

      // Subsequent check confirms lockout
      expect(lockoutManager.isLocked(email).locked).toBe(true);

      // Success resets the lockout counter
      lockoutManager.recordSuccess(email);
      expect(lockoutManager.isLocked(email).locked).toBe(false);
    });

    it("10. should have a valid dummy bcrypt hash for timing attack defense", async () => {
      expect(DUMMY_BCRYPT_HASH).toBeDefined();
      expect(DUMMY_BCRYPT_HASH.startsWith("$2a$10$")).toBe(true);

      // Ensure bcrypt can execute comparison against dummy hash without error
      const match = await bcrypt.compare("wrong-password", DUMMY_BCRYPT_HASH);
      expect(match).toBe(false);
    });
  });

  // ==========================================
  // PART 2: ADDRESS VALIDATION & SANITIZATION TESTS
  // ==========================================

  describe("Part 2: Address Validation & Security Sanitization", () => {
    it("11. should validate a complete, valid Indian shipping address (Vadodara, Gujarat)", () => {
      const validAddress = {
        fullName: "Pratik Patel",
        phone: "+91 98765 43210",
        line1: "14, Heritage Enclave, Near Mandvi Gate",
        line2: "Opposite Nyay Mandir",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390001",
        country: "India",
        label: "Home",
      };

      const result = AddressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.city).toBe("Vadodara");
        expect(result.data.state).toBe("Gujarat");
        expect(result.data.pincode).toBe("390001");
        expect(result.data.phone).toBe("9876543210"); // Normalized to 10 digits
      }
    });

    it("12. should reject invalid Indian mobile numbers (e.g. 9 digits or invalid start digits)", () => {
      const invalidPhones = [
        "1234567890", // Starts with 1 (TRAI invalid for mobile)
        "987654321", // 9 digits
        "98765432100", // 11 digits without prefix
        "abcdefghij", // letters
        "0000000000", // all zeroes
      ];

      for (const phone of invalidPhones) {
        const result = AddressSchema.safeParse({
          fullName: "Pratik Patel",
          phone,
          line1: "14, Heritage Enclave",
          city: "Vadodara",
          state: "Gujarat",
          pincode: "390001",
          country: "India",
        });
        expect(result.success).toBe(false);
      }
    });

    it("13. should reject invalid Indian PIN codes (starts with 0, 5 digits, or letters)", () => {
      const invalidPincodes = [
        "090001", // In India, PIN codes start with 1-9 (first digit 0 is invalid)
        "39000", // 5 digits
        "3900001", // 7 digits
        "3900AA", // Contains letters
        "39 001", // Space in the middle
        "000000", // All zeroes
      ];

      for (const pincode of invalidPincodes) {
        const result = AddressSchema.safeParse({
          fullName: "Pratik Patel",
          phone: "9876543210",
          line1: "14, Heritage Enclave",
          city: "Vadodara",
          state: "Gujarat",
          pincode,
          country: "India",
        });
        expect(result.success).toBe(false);
      }
    });

    it("14. should reject states that are not in the official 36 Indian States/UTs whitelist", () => {
      const invalidStates = ["California", "London", "InvalidState", "Gotham"];

      for (const state of invalidStates) {
        const result = AddressSchema.safeParse({
          fullName: "Pratik Patel",
          phone: "9876543210",
          line1: "14, Heritage Enclave",
          city: "Vadodara",
          state,
          pincode: "390001",
          country: "India",
        });
        expect(result.success).toBe(false);
      }
    });

    it("15. should reject address line 1 shorter than 5 characters", () => {
      const result = AddressSchema.safeParse({
        fullName: "Pratik Patel",
        phone: "9876543210",
        line1: "A 1", // only 3 chars
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390001",
        country: "India",
      });
      expect(result.success).toBe(false);
    });

    it("16. should sanitize and strip XSS HTML tags and script injections", () => {
      const xssInput = "<script>alert('pwned')</script>14, Heritage Road";
      const sanitized = sanitizeString(xssInput);
      expect(sanitized).toBe("alert('pwned')14, Heritage Road");
      expect(sanitized).not.toContain("<script>");

      const imgPayload = "<img src=x onerror=alert(document.cookie)>Vadodara";
      expect(sanitizeString(imgPayload)).toBe("Vadodara");
    });

    it("17. should handle SQL injection strings safely without crashing schemas", () => {
      const sqliName = "Robert'); DROP TABLE users;--";
      // SQL injection in Name field is rejected by the strict name regex
      const nameResult = AddressSchema.safeParse({
        fullName: sqliName,
        phone: "9876543210",
        line1: "14, Heritage Enclave",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390001",
        country: "India",
      });
      expect(nameResult.success).toBe(false);

      // SQL injection string in login email is properly typed and rejected by email regex
      const loginResult = LoginSchema.safeParse({
        email: "' OR 1=1 --",
        password: "ValidPass123!",
      });
      expect(loginResult.success).toBe(false);
    });

    it("18. should correctly normalize various Indian phone formats (+91, 0, spaces)", () => {
      expect(normalizeIndianPhone("+91 98765 43210")).toBe("9876543210");
      expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
      expect(normalizeIndianPhone("919876543210")).toBe("9876543210");
      expect(normalizeIndianPhone("9876543210")).toBe("9876543210");
    });
  });
});

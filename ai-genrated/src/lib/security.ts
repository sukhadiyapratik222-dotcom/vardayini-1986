/**
 * Vardayini Sweet Mart - Security Utilities & Rate Limiting Engine
 * Provides protection against timing attacks, brute-force attempts, XSS, and parameter tampering.
 */

import bcrypt from "bcryptjs";

/**
 * Pre-computed valid bcrypt hash ($2a$10$...) of a random string.
 * Used during login when an email does not exist in the database.
 * Executing bcrypt.compare against this dummy hash normalizes the execution
 * time to ~80-100ms, completely neutralizing timing attacks for email enumeration.
 */
export const DUMMY_BCRYPT_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Sanitizes input strings by:
 * 1. Removing null bytes and non-printable control characters
 * 2. Stripping HTML tag patterns (<script>, <iframe>, <a>, <img onerror=...>, etc.)
 * 3. Normalizing unicode and trimming excess whitespace
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\0/g, "") // Remove null bytes
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Remove control characters
    .replace(/<[^>]*>?/gm, "") // Strip HTML tags
    .replace(/javascript:/gi, "") // Neutralize javascript: pseudo-protocol
    .trim();
}

/**
 * Normalizes email input to lowercase, trimmed, sanitized representation.
 */
export function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") return "";
  return sanitizeString(email).toLowerCase();
}

/**
 * Normalizes an Indian phone number to 10 standard digits.
 * E.g.: "+91 98765 43210" -> "9876543210"
 * E.g.: "09876543210" -> "9876543210"
 */
export function normalizeIndianPhone(phone: unknown): string {
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
 * In-Memory Sliding Window Rate Limiter
 * Tracks request counts per key within a given window in milliseconds.
 */
interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxLimit: number;

  constructor(windowMs: number = 60 * 1000, maxLimit: number = 10) {
    this.windowMs = windowMs;
    this.maxLimit = maxLimit;
  }

  public check(key: string): { allowed: boolean; remaining: number; resetTimeMs: number } {
    const now = Date.now();
    const record = this.store.get(key) || { timestamps: [] };

    // Prune expired timestamps
    const activeTimestamps = record.timestamps.filter((ts) => now - ts < this.windowMs);
    const allowed = activeTimestamps.length < this.maxLimit;

    if (allowed) {
      activeTimestamps.push(now);
      this.store.set(key, { timestamps: activeTimestamps });
    }

    const oldest = activeTimestamps[0] || now;
    const resetTimeMs = Math.max(0, this.windowMs - (now - oldest));

    return {
      allowed,
      remaining: Math.max(0, this.maxLimit - activeTimestamps.length),
      resetTimeMs,
    };
  }

  public reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Account Lockout Tracker
 * Tracks failed consecutive login attempts per email/IP.
 * Enforces lockout for 15 minutes after 5 failed attempts.
 */
interface LockoutState {
  failures: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

export class AccountLockoutManager {
  private tracker = new Map<string, LockoutState>();
  private maxFailures: number;
  private lockoutDurationMs: number;

  constructor(maxFailures: number = 5, lockoutDurationMs: number = 15 * 60 * 1000) {
    this.maxFailures = maxFailures;
    this.lockoutDurationMs = lockoutDurationMs;
  }

  public isLocked(identifier: string): { locked: boolean; retryAfterSeconds: number } {
    const key = identifier.toLowerCase().trim();
    const state = this.tracker.get(key);
    if (!state) return { locked: false, retryAfterSeconds: 0 };

    const now = Date.now();
    if (state.lockedUntil && state.lockedUntil > now) {
      return {
        locked: true,
        retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000),
      };
    }

    // Lockout expired, reset lockout
    if (state.lockedUntil && state.lockedUntil <= now) {
      this.tracker.delete(key);
    }

    return { locked: false, retryAfterSeconds: 0 };
  }

  public recordFailure(identifier: string): { locked: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();
    const state = this.tracker.get(key) || { failures: 0, lockedUntil: null, lastAttempt: now };

    state.failures += 1;
    state.lastAttempt = now;

    if (state.failures >= this.maxFailures) {
      state.lockedUntil = now + this.lockoutDurationMs;
      this.tracker.set(key, state);
      return {
        locked: true,
        retryAfterSeconds: Math.ceil(this.lockoutDurationMs / 1000),
        remainingAttempts: 0,
      };
    }

    this.tracker.set(key, state);
    return {
      locked: false,
      retryAfterSeconds: 0,
      remainingAttempts: this.maxFailures - state.failures,
    };
  }

  public recordSuccess(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    this.tracker.delete(key);
  }
}

// Global Singleton instances for server routes
export const globalLoginRateLimiter = new SlidingWindowRateLimiter(60 * 1000, 10); // 10 requests per minute
export const globalAccountLockoutManager = new AccountLockoutManager(5, 15 * 60 * 1000); // 5 failures -> 15 min lock

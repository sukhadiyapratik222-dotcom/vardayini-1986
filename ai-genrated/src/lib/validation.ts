/**
 * Input validation, schema definition, and sanitization for Vardayini Sweet Mart.
 * Backed by Zod with strict enterprise security rules for Login and Indian Logistics.
 */

import { z } from "zod";
import {
  BLOCKED_COMMON_PASSWORDS,
  CITY_REGEX,
  EMAIL_REGEX,
  FULL_NAME_REGEX,
  INDIAN_PHONE_REGEX,
  INDIAN_PINCODE_REGEX,
  INDIAN_STATES,
  INDIAN_STATES_SET,
  PASSWORD_COMPLEXITY_REGEX,
} from "./validation-constants";
import { normalizeIndianPhone, sanitizeString } from "./security";

// ==========================================
// 1. Core JSON & Legacy Helpers (Safe & Backward-Compatible)
// ==========================================

export async function readJsonSafe<T = any>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function parsePositiveInt(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val > 0 && Number.isSafeInteger(val)) {
    return val;
  }
  if (typeof val === "string" && /^[1-9]\d*$/.test(val.trim())) {
    const num = Number(val.trim());
    return Number.isSafeInteger(num) ? num : null;
  }
  return null;
}

export function parseNonNegativeInt(val: unknown): number | null {
  if (typeof val === "number" && Number.isInteger(val) && val >= 0 && Number.isSafeInteger(val)) {
    return val;
  }
  if (typeof val === "string" && /^(0|[1-9]\d*)$/.test(val.trim())) {
    const num = Number(val.trim());
    return Number.isSafeInteger(num) ? num : null;
  }
  return null;
}

export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== "string") return false;
  const digits = phone.replace(/[\s\-\+\(\)]/g, "");
  return INDIAN_PHONE_REGEX.test(digits);
}

export function isValidPincode(pincode: unknown): boolean {
  if (typeof pincode !== "string") return false;
  return INDIAN_PINCODE_REGEX.test(pincode.trim());
}

// ==========================================
// 2. User Authentication Validation Schemas
// ==========================================

/**
 * Login Input Schema:
 * Validates credentials on both client and server.
 * Password capped at 64 characters to prevent Bcrypt CPU exhaustion attacks.
 */
export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .trim()
    .toLowerCase()
    .max(254, "Email address cannot exceed 254 characters.")
    .regex(EMAIL_REGEX, "Please provide a valid email address (e.g., patron@vardayini.com).")
    .transform((val) => sanitizeString(val)),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters.")
    .max(64, "Password cannot exceed 64 characters."),
});

export type LoginInput = z.infer<typeof LoginSchema>;

/**
 * Registration Input Schema:
 * Allows user-friendly customer passwords (>= 6 chars) and supports Gujarati / multilingual names.
 */
export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(1, "Full name is required.")
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(100, "Full name cannot exceed 100 characters.")
      .transform((val) => sanitizeString(val)),
    email: z
      .string()
      .min(1, "Email address is required.")
      .trim()
      .toLowerCase()
      .max(254, "Email address cannot exceed 254 characters.")
      .regex(EMAIL_REGEX, "Please enter a valid email address.")
      .transform((val) => sanitizeString(val)),
    phone: z
      .string()
      .min(1, "Mobile phone number is required.")
      .trim()
      .refine(
        (val) => isValidPhone(val),
        "Please enter a valid 10-digit Indian mobile number (e.g., 9876543210 or +91 9876543210)."
      )
      .transform((val) => normalizeIndianPhone(val)),
    password: z
      .string()
      .min(1, "Password is required.")
      .min(6, "Password must be at least 6 characters long.")
      .max(64, "Password cannot exceed 64 characters."),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ==========================================
// 3. Address Validation Schema (Pan-India & Gujarat Logistics)
// ==========================================

export const AddressSchema = z.object({
  fullName: z
    .string()
    .min(1, "Recipient name is required.")
    .trim()
    .min(2, "Recipient name must be at least 2 characters.")
    .max(100, "Recipient name cannot exceed 100 characters.")
    .regex(
      FULL_NAME_REGEX,
      "Recipient name may only contain letters, spaces, hyphens, periods, and apostrophes."
    )
    .transform((val) => sanitizeString(val)),
  phone: z
    .string()
    .min(1, "Delivery phone number is required.")
    .trim()
    .refine(
      (val) => isValidPhone(val),
      "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
    )
    .transform((val) => normalizeIndianPhone(val)),
  line1: z
    .string()
    .min(1, "Street address is required.")
    .trim()
    .min(5, "Address Line 1 must be at least 5 characters (include flat/house no. & street).")
    .max(200, "Address Line 1 cannot exceed 200 characters.")
    .transform((val) => sanitizeString(val)),
  line2: z
    .string()
    .max(200, "Address Line 2 cannot exceed 200 characters.")
    .optional()
    .or(z.literal(""))
    .transform((val) => (val ? sanitizeString(val) : "")),
  city: z
    .string()
    .min(1, "City is required.")
    .trim()
    .min(2, "City name must be at least 2 characters.")
    .max(80, "City name cannot exceed 80 characters.")
    .regex(CITY_REGEX, "City name may only contain letters, spaces, and hyphens.")
    .transform((val) => sanitizeString(val)),
  state: z
    .string()
    .min(1, "State is required.")
    .trim()
    .refine(
      (val) => INDIAN_STATES_SET.has(val.toLowerCase()),
      "Please select a valid State or Union Territory from the dropdown."
    ),
  pincode: z
    .string()
    .min(1, "Postal PIN code is required.")
    .trim()
    .refine(
      (val) => INDIAN_PINCODE_REGEX.test(val),
      "Please enter a valid 6-digit Indian PIN code (first digit must be 1-9)."
    ),
  country: z
    .string()
    .min(1, "Country is required.")
    .trim()
    .refine(
      (val) => ["india", "in"].includes(val.toLowerCase()),
      "Only deliveries within India are supported at this time."
    )
    .default("India"),
  label: z
    .string()
    .max(40, "Label cannot exceed 40 characters.")
    .optional()
    .default("Home")
    .transform((val) => sanitizeString(val || "Home")),
});

export type AddressInput = z.infer<typeof AddressSchema>;

// Helper to format Zod errors into a clean key-value map for client forms
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!formatted[key]) {
      formatted[key] = issue.message;
    }
  }
  return formatted;
}

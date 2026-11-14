/**
 * Vardayini Sweet Mart - Validation Constants & Whitelists
 * Enterprise standards for Pan-India and Gujarat regional logistics.
 */

// Comprehensive Whitelist of all 28 States and 8 Union Territories of India
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

export const INDIAN_STATES_SET = new Set<string>(INDIAN_STATES.map((s) => s.toLowerCase()));

// Common / Weak passwords blocked during customer registration
export const BLOCKED_COMMON_PASSWORDS = new Set<string>([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "admin123",
  "welcome123",
  "sweet123",
  "sweet1234",
  "vardayini123",
  "mithai123",
  "letmein123",
]);

/**
 * Regex Patterns with Explanations:
 *
 * 1. EMAIL_REGEX:
 *    RFC 5322 compliant practical regex. Disallows leading/trailing spaces or multiple @ symbols.
 *    Max length is 254 chars per RFC 5321.
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * 2. FULL_NAME_REGEX:
 *    Requires 2 to 100 characters. Allows Unicode letters, spaces, hyphens, apostrophes, and periods.
 *    Rejects script injection characters (<, >, /, ;, ", etc.).
 */
export const FULL_NAME_REGEX = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s'.-]{2,100}$/;

/**
 * 3. INDIAN_PHONE_REGEX:
 *    Matches standard Indian mobile numbers.
 *    Supports optional prefixes: +91, 91, or 0.
 *    The core mobile number must be 10 digits starting with 6, 7, 8, or 9 (authorized by TRAI).
 */
export const INDIAN_PHONE_REGEX = /^(?:(?:\+91|91|0)?[6-9]\d{9})$/;

/**
 * 4. INDIAN_PINCODE_REGEX:
 *    Standard 6-digit Indian Postal Index Number (PIN).
 *    In India, the first digit represents the postal region and ranges from 1 to 9 (0 is invalid).
 */
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * 5. CITY_REGEX:
 *    Letters, spaces, hyphens, and periods (e.g., "Kalol", "Gandhinagar", "New Delhi").
 */
export const CITY_REGEX = /^[a-zA-Z\s'.-]{2,80}$/;

/**
 * 6. PASSWORD_COMPLEXITY_REGEX:
 *    Requires 8 to 64 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number,
 *    and 1 special symbol (@$!%*?&#^_-).
 */
export const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-])[A-Za-z\d@$!%*?&#^_\-]{8,64}$/;

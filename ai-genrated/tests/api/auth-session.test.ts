import { describe, it, expect, beforeEach } from "vitest";
import { createHmac } from "crypto";
import { getAuthUser } from "@/lib/auth";
import { mockCookieStore, getTestFixtures } from "../helpers";

function signPayload(payload: string): string {
  const secret = process.env.SESSION_SECRET || "vardayini-dev-secret-change-me";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function makeToken(payload: string, signatureOverride?: string): string {
  const base64Payload = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signatureOverride ?? signPayload(payload);
  return `${base64Payload}.${sig}`;
}

describe("Security Tests: Session Token Validation (lib/auth.ts)", () => {
  let customerId: number;

  beforeEach(async () => {
    const fixtures = await getTestFixtures();
    customerId = fixtures.customer.id;
    mockCookieStore.clear();
  });

  it("returns null for tampered signature", async () => {
    const validPayload = JSON.stringify({
      userId: customerId,
      exp: Date.now() + 1000 * 60 * 60,
    });
    const validSig = signPayload(validPayload);
    // Tamper with signature: replace last char
    const tamperedSig = validSig.slice(0, -1) + (validSig.endsWith("a") ? "b" : "a");
    const token = makeToken(validPayload, tamperedSig);

    mockCookieStore.set("vs_session", token);
    const user = await getAuthUser();
    expect(user).toBeNull();
  });

  it("returns null for wrong-length signature", async () => {
    const validPayload = JSON.stringify({
      userId: customerId,
      exp: Date.now() + 1000 * 60 * 60,
    });
    const truncatedSig = "abcdef123456"; // Not 64 hex characters
    const token = makeToken(validPayload, truncatedSig);

    mockCookieStore.set("vs_session", token);
    const user = await getAuthUser();
    expect(user).toBeNull();
  });

  it("returns null for expired token", async () => {
    const expiredPayload = JSON.stringify({
      userId: customerId,
      exp: Date.now() - 5000, // expired 5 seconds ago
    });
    const token = makeToken(expiredPayload);

    mockCookieStore.set("vs_session", token);
    const user = await getAuthUser();
    expect(user).toBeNull();
  });

  it("returns null without throwing when payload is validly signed non-JSON text", async () => {
    const nonJsonPayload = "this-is-not-valid-json-data";
    // Sign the non-JSON payload with the valid secret key
    const token = makeToken(nonJsonPayload);

    mockCookieStore.set("vs_session", token);

    // Must safely return null without throwing an unhandled JSON parse error
    let user: any = undefined;
    let thrownError: any = null;
    try {
      user = await getAuthUser();
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeNull();
    expect(user).toBeNull();
  });

  it("returns null when exp is missing from payload", async () => {
    const payloadMissingExp = JSON.stringify({
      userId: customerId,
      // no exp
    });
    const token = makeToken(payloadMissingExp);

    mockCookieStore.set("vs_session", token);
    const user = await getAuthUser();
    expect(user).toBeNull();
  });

  it("returns null when exp is non-numeric", async () => {
    const payloadNonNumericExp = JSON.stringify({
      userId: customerId,
      exp: "never-expires",
    });
    const token = makeToken(payloadNonNumericExp);

    mockCookieStore.set("vs_session", token);
    const user = await getAuthUser();
    expect(user).toBeNull();
  });
});

import { setAuthCookie, clearAuthCookie } from "@/lib/auth";
import { mockCookieStore } from "./cookies";
import { randomBytes } from "crypto";

/**
 * Creates a valid vs_session cookie using the real lib/auth.ts setAuthCookie function.
 */
export async function loginAs(userId: number) {
  await setAuthCookie(userId);
  const sessionToken = mockCookieStore.get("vs_session")?.value;
  return {
    userId,
    sessionToken,
    cookieHeader: `vs_session=${sessionToken}`,
  };
}

/**
 * Clears the vs_session cookie using clearAuthCookie.
 */
export async function logout() {
  await clearAuthCookie();
}

/**
 * Sets vs_cart cookie for guest checkout and guest cart flows.
 */
export function setGuestCart(cartId?: string) {
  const id = cartId || randomBytes(16).toString("hex");
  mockCookieStore.set("vs_cart", id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

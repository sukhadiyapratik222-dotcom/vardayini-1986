import { describe, it, expect, beforeEach } from "vitest";
import {
  mockCookieStore,
  buildRequest,
  loginAs,
  logout,
  setGuestCart,
  getTestFixtures,
} from "./helpers";
import { getAuthUser, getCartSessionId } from "@/lib/auth";
import { getSqliteDb } from "@/db";
import { cookies } from "next/headers";

describe("Vitest Isolated Test Environment", () => {
  it("enforces DATABASE_URL isolation and test session secret", () => {
    expect(process.env.DATABASE_URL).toBeUndefined();
    expect(process.env.SESSION_SECRET).toBeDefined();
    expect(process.env.SESSION_SECRET).not.toBe("");
  });

  it("uses an in-memory SQLite database during tests", () => {
    const mainDatabase = getSqliteDb()
      .prepare("PRAGMA database_list")
      .all()
      .find((database) => database.name === "main");

    expect(mainDatabase?.file).toBe("");
  });

  describe("In-Memory Cookie Store & next/headers mock", () => {
    it("mocks cookies() get, set, delete, and has", async () => {
      const store = await cookies();
      store.set("test_key", "test_val");

      expect(store.get("test_key")?.value).toBe("test_val");
      expect(mockCookieStore.get("test_key")?.value).toBe("test_val");
      expect(store.has("test_key")).toBe(true);

      store.delete("test_key");
      expect(store.get("test_key")).toBeUndefined();
      expect(store.has("test_key")).toBe(false);
    });

    it("clears cookies between tests", async () => {
      const store = await cookies();
      expect(store.getAll().length).toBe(0);
    });
  });

  describe("Request Builder", () => {
    it("builds GET request with search parameters and headers", async () => {
      const req = buildRequest({
        method: "GET",
        url: "/api/products",
        searchParams: { category: "kaju-sweets", limit: 10 },
        headers: { "x-custom-header": "test-val" },
      });

      expect(req.method).toBe("GET");
      const url = new URL(req.url);
      expect(url.pathname).toBe("/api/products");
      expect(url.searchParams.get("category")).toBe("kaju-sweets");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(req.headers.get("x-custom-header")).toBe("test-val");
    });

    it("builds POST request with JSON body and auto content-type", async () => {
      const payload = { productVariantId: 42, quantity: 2 };
      const req = buildRequest({
        url: "/api/cart",
        body: payload,
      });

      expect(req.method).toBe("POST");
      expect(req.headers.get("content-type")).toBe("application/json");
      const body = await req.json();
      expect(body).toEqual(payload);
    });

    it("builds request with raw body and cookies", async () => {
      const raw = "raw payload text";
      const req = buildRequest({
        method: "PUT",
        url: "/api/test",
        rawBody: raw,
        cookies: { vs_cart: "cart-abc-123" },
      });

      expect(req.method).toBe("PUT");
      const text = await req.text();
      expect(text).toBe(raw);
      expect(req.headers.get("cookie")).toBe("vs_cart=cart-abc-123");
    });
  });

  describe("Authentication & Guest Helpers", () => {
    it("logs in with valid vs_session using real lib/auth.ts logic", async () => {
      const fixtures = await getTestFixtures();
      const login = await loginAs(fixtures.customer.id);

      expect(login.sessionToken).toBeDefined();
      expect(mockCookieStore.get("vs_session")?.value).toBe(login.sessionToken);

      // Verify getAuthUser validates the session against the database
      const user = await getAuthUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe(fixtures.customer.id);
      expect(user?.email).toBe(fixtures.customer.email);
      expect(user?.role).toBe("customer");

      // Verify logout clears vs_session
      await logout();
      const afterLogout = await getAuthUser();
      expect(afterLogout).toBeNull();
    });

    it("sets vs_cart for guest sessions", async () => {
      const guestCartId = setGuestCart("custom-guest-cart-token");
      expect(guestCartId).toBe("custom-guest-cart-token");

      const currentCartId = await getCartSessionId();
      expect(currentCartId).toBe("custom-guest-cart-token");
    });
  });

  describe("Database Fixtures", () => {
    it("reads dynamic IDs from PGlite database without hardcoding", async () => {
      const fixtures = await getTestFixtures();

      expect(fixtures.customer.id).toBeGreaterThan(0);
      expect(fixtures.customer.email).toBe("aanya@vardayini.com");
      expect(fixtures.customer.role).toBe("customer");

      expect(fixtures.admin.id).toBeGreaterThan(0);
      expect(fixtures.admin.email).toBe("admin@vardayini.com");
      expect(fixtures.admin.role).toBe("admin");

      expect(fixtures.variantKK250.id).toBeGreaterThan(0);
      expect(fixtures.variantKK250.sku).toBe("KK-250");
      expect(fixtures.variantKK250.stock).toBeGreaterThan(0);
      expect(fixtures.productKajuKatli.name).toContain("Kaju Katli");
    });
  });

  describe("Safety Rules: UI Config Guard", () => {
    it("guarantees ui-config PUT is blocked if attempted against real file", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      const configPath = path.join(process.cwd(), "src", "data", "ui-config.json");

      await expect(
        fs.writeFile(configPath, JSON.stringify({ hacked: true }))
      ).rejects.toThrow("SAFETY VIOLATION: Tests must never modify the real ui-config.json file!");
    });
  });
});

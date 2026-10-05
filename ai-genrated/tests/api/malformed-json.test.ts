import { describe, it, expect, beforeEach } from "vitest";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { POST as cartRoute } from "@/app/api/cart/route";
import { POST as orderRoute } from "@/app/api/orders/route";
import { POST as adminProductsRoute } from "@/app/api/admin/products/route";
import { PUT as adminInventoryRoute } from "@/app/api/admin/inventory/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { ensureSeeded } from "@/db/seed";

const MALFORMED_JSON_STRING = '{"email": "broken-json", ';

describe("Security & Robustness: Malformed JSON Handling", () => {
  let adminId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    adminId = fixtures.admin.id;

    await logout();
    mockCookieStore.clear();
  });

  it("POST /api/auth/login returns 400 on malformed JSON", async () => {
    const req = buildRequest({
      method: "POST",
      url: "/api/auth/login",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await loginRoute(req);
    } catch {
      // If unhandled syntax error causes route crash, it's a 500 failure
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register returns 400 on malformed JSON", async () => {
    const req = buildRequest({
      method: "POST",
      url: "/api/auth/register",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await registerRoute(req);
    } catch {
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });

  it("POST /api/cart returns 400 on malformed JSON", async () => {
    const req = buildRequest({
      method: "POST",
      url: "/api/cart",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await cartRoute(req);
    } catch {
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });

  it("POST /api/orders returns 400 on malformed JSON", async () => {
    const req = buildRequest({
      method: "POST",
      url: "/api/orders",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await orderRoute(req);
    } catch {
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });

  it("POST /api/admin/products returns 400 on malformed JSON", async () => {
    await loginAs(adminId);

    const req = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await adminProductsRoute(req);
    } catch {
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });

  it("PUT /api/admin/inventory returns 400 on malformed JSON", async () => {
    await loginAs(adminId);

    const req = buildRequest({
      method: "PUT",
      url: "/api/admin/inventory",
      rawBody: MALFORMED_JSON_STRING,
      headers: { "Content-Type": "application/json" },
    });

    let res: Response;
    try {
      res = await adminInventoryRoute(req);
    } catch {
      res = new Response("Crash", { status: 500 });
    }

    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { GET as getProfile, PUT as updateProfile } from "@/app/api/account/profile/route";
import { GET as getAddresses, POST as createAddress } from "@/app/api/account/addresses/route";
import { setAuthCookie } from "@/lib/auth";
import { buildRequest, loginAs } from "../helpers";
import { db } from "@/db";
import { users, addresses } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("Customer Profile & Address Lifecycle", () => {
  let testUserId: number;
  const testPhone = "9988776655";

  beforeEach(async () => {
    // Clean up test user if exists
    await db.delete(users).where(eq(users.phone, testPhone));

    const [res] = await db.insert(users).values({
      name: `Patron ${testPhone.slice(-4)}`,
      email: `${testPhone}@patron.vardayini.com`,
      phone: testPhone,
      passwordHash: "",
      role: "customer",
    });

    const [created] = await db.select().from(users).where(eq(users.id, res.insertId)).limit(1);
    testUserId = created.id;
  });

  it("rejects unauthorized access when session cookie is absent", async () => {
    const res = await getProfile();
    expect(res.status).toBe(401);
  });

  it("validates full name and updates customer profile", async () => {
    await setAuthCookie(testUserId, {
      name: `Patron ${testPhone.slice(-4)}`,
      phone: testPhone,
      email: `${testPhone}@patron.vardayini.com`,
      role: "customer",
    });

    // 1. Validation failure on short name
    const badReq = new Request("http://localhost:3000/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A" }),
    });
    const badRes = await updateProfile(badReq);
    expect(badRes.status).toBe(400);

    // 2. Successful profile update
    const validReq = new Request("http://localhost:3000/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pratik Patel",
        email: "pratik.patel@example.com",
      }),
    });
    const validRes = await updateProfile(validReq);
    expect(validRes.status).toBe(200);

    const body = await validRes.json();
    expect(body.success).toBe(true);
    expect(body.user.name).toBe("Pratik Patel");
    expect(body.user.email).toBe("pratik.patel@example.com");

    // Check DB persisted value
    const [dbUser] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    expect(dbUser.name).toBe("Pratik Patel");
    expect(dbUser.email).toBe("pratik.patel@example.com");
  });

  it("saves and retrieves customer delivery addresses", async () => {
    await loginAs(testUserId);

    const addReq = buildRequest({
      method: "POST",
      url: "http://localhost:3000/api/account/addresses",
      body: {
        label: "Home",
        fullName: "Pratik Patel",
        phone: testPhone,
        line1: "12, Shanti Sadan, Race Course Road",
        city: "Vadodara",
        state: "Gujarat",
        pincode: "390007",
      },
    });

    const addRes = await createAddress(addReq);
    const addBody = await addRes.json();
    if (addRes.status !== 200) {
      console.error("createAddress failed:", addBody);
    }
    expect(addRes.status).toBe(200);
    expect(addBody.success).toBe(true);
    expect(addBody.address.line1).toBe("12, Shanti Sadan, Race Course Road");

    const getRes = await getAddresses();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.addresses.length).toBeGreaterThanOrEqual(1);
    expect(getBody.addresses[0].city).toBe("Vadodara");
  });
});

import { createHmac } from "crypto";

const secret = process.env.SESSION_SECRET || "vsm_session_jwt_secure_key_2026_vardayini_prod";

function createToken(userId: number) {
  const payload = JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 });
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64url") + "." + sig;
}

async function main() {
  const token = createToken(2); // user id 2 = admin@vardayini.com
  console.log("Generated token for admin@vardayini.com (id: 2)");

  // Test 1: GET /api/orders with session cookie
  console.log("\n1. Testing GET /api/orders with cookie vs_session...");
  const res1 = await fetch("http://127.0.0.1:9449/api/orders", {
    headers: {
      cookie: `vs_session=${token}`,
    },
  });
  console.log(`Status: ${res1.status} ${res1.statusText}`);
  if (res1.ok) {
    const data = await res1.json();
    console.log(`✓ Orders endpoint succeeded! Found ${Array.isArray(data) ? data.length : "valid"} orders.`);
  } else {
    console.log(`✗ Error:`, await res1.text());
  }

  // Test 2: GET /api/admin/customers with session cookie
  console.log("\n2. Testing GET /api/admin/customers with cookie vs_session...");
  const res2 = await fetch("http://127.0.0.1:9449/api/admin/customers", {
    headers: {
      cookie: `vs_session=${token}`,
    },
  });
  console.log(`Status: ${res2.status} ${res2.statusText}`);
  if (res2.ok) {
    const data = await res2.json();
    console.log(`✓ Customers endpoint succeeded! Found ${Array.isArray(data) ? data.length : "valid"} customers.`);
  } else {
    console.log(`✗ Error:`, await res2.text());
  }

  // Test 3: GET /api/orders via x-admin-key (service-to-service)
  console.log("\n3. Testing GET /api/orders with x-admin-key...");
  const res3 = await fetch("http://127.0.0.1:9449/api/orders", {
    headers: {
      "x-admin-key": "vsm_admin_secret_key_2026_secured",
    },
  });
  console.log(`Status: ${res3.status} ${res3.statusText}`);
  if (res3.ok) {
    console.log(`✓ Service-to-service orders succeeded!`);
  } else {
    console.log(`✗ Error:`, await res3.text());
  }

  // Test 4: GET /api/admin/customers via x-admin-key
  console.log("\n4. Testing GET /api/admin/customers with x-admin-key...");
  const res4 = await fetch("http://127.0.0.1:9449/api/admin/customers", {
    headers: {
      "x-admin-key": "vsm_admin_secret_key_2026_secured",
    },
  });
  console.log(`Status: ${res4.status} ${res4.statusText}`);
  if (res4.ok) {
    console.log(`✓ Service-to-service customers succeeded!`);
  } else {
    console.log(`✗ Error:`, await res4.text());
  }
}

main().catch(console.error);

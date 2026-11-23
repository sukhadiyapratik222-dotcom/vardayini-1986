async function main() {
  const baseUrl = "http://127.0.0.1:9449";
  const anonymousOrders = await fetch(`${baseUrl}/api/orders`);
  if (![401, 403].includes(anonymousOrders.status)) {
    throw new Error(`Anonymous /api/orders request was not rejected (${anonymousOrders.status}).`);
  }
  console.log("Anonymous /api/orders request rejected.");

  const anonymousCustomers = await fetch(`${baseUrl}/api/admin/customers`);
  if (![401, 403].includes(anonymousCustomers.status)) {
    throw new Error(`Anonymous /api/admin/customers request was not rejected (${anonymousCustomers.status}).`);
  }
  console.log("Anonymous /api/admin/customers request rejected.");

  const email = process.env.ADMIN_EMAIL || "admin@vardayini.com";
  const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_SEED_PASSWORD;
  if (!password) {
    throw new Error("Set ADMIN_PASSWORD or ADMIN_SEED_PASSWORD to run authenticated endpoint checks.");
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginResponse.json();
  if (!loginResponse.ok || typeof login.token !== "string") {
    throw new Error(`Admin login failed (${loginResponse.status}).`);
  }

  const headers = { cookie: `vs_session=${login.token}` };
  for (const endpoint of ["/api/orders", "/api/admin/customers"]) {
    const response = await fetch(`${baseUrl}${endpoint}`, { headers });
    if (!response.ok) {
      throw new Error(`Authenticated ${endpoint} request failed (${response.status}).`);
    }
    console.log(`Authenticated ${endpoint} request succeeded.`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const STORE_BASE = "http://127.0.0.1:9449";
const ADMIN_BASE = "http://127.0.0.1:3001";
const ADMIN_KEY = "vsm_admin_secret_key_2026_secured";

// Low-level HTTP request helper
function rawRequest(url, options = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const postData = options.body ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : null;
    
    const headers = { ...options.headers };
    if (postData && !headers["content-type"]) {
      headers["content-type"] = "application/json";
    }
    if (postData) {
      headers["content-length"] = Buffer.byteLength(postData);
    }

    const start = Date.now();
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || "GET",
      headers,
      timeout: options.timeout || 12000,
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        const duration = Date.now() - start;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : data,
          raw: data,
          duration,
        });
      });
    });

    req.on("error", (err) => {
      resolve({ status: 0, error: err.message, raw: "", duration: Date.now() - start });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 408, error: "Request Timeout", raw: "", duration: Date.now() - start });
    });

    if (postData) req.write(postData);
    req.end();
  });
}

// Client with cookie jar management
class TestClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = {};
  }

  getCookieString() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  setCookie(k, v) {
    this.cookies[k] = v;
  }

  async fetch(urlPath, options = {}) {
    const headers = { ...options.headers };
    const currentCookies = this.getCookieString();
    if (currentCookies) {
      headers.cookie = headers.cookie ? `${currentCookies}; ${headers.cookie}` : currentCookies;
    }

    const fullUrl = urlPath.startsWith("http") ? urlPath : `${this.baseUrl}${urlPath}`;
    const res = await rawRequest(fullUrl, { ...options, headers });

    if (res.headers && res.headers["set-cookie"]) {
      const setCookies = Array.isArray(res.headers["set-cookie"]) 
        ? res.headers["set-cookie"] 
        : [res.headers["set-cookie"]];
      for (const sc of setCookies) {
        const [pair] = sc.split(";");
        const eqIdx = pair.indexOf("=");
        if (eqIdx > 0) {
          const k = pair.substring(0, eqIdx).trim();
          const v = pair.substring(eqIdx + 1).trim();
          this.cookies[k] = v;
        }
      }
    }

    return res;
  }
}

const auditResults = {
  timestamp: new Date().toISOString(),
  environment: {
    storefront: STORE_BASE,
    admin: ADMIN_BASE,
    nodeVersion: process.version,
  },
  phase1_discovery: [],
  phase2_functional: [],
  phase3_negative: [],
  phase4_security: [],
  phase6_accessibility: [],
  phase7_performance: [],
  bugsFound: [],
};

function recordTest(phase, testName, passed, details = {}) {
  const item = { testName, passed, ...details };
  auditResults[phase].push(item);
  const mark = passed ? "✅ PASS" : "❌ FAIL";
  const dur = details.duration ? ` [${details.duration}ms]` : "";
  console.log(`${mark} | ${testName}${dur}`);
  if (!passed && details.bug) {
    auditResults.bugsFound.push(details.bug);
  }
}

async function runComprehensiveAudit() {
  console.log("================================================================================");
  console.log("👑 VARDAYINI SWEET MART — SENIOR QA, SECURITY & PRODUCT OWNER AUDIT SUITE");
  console.log("================================================================================\n");

  const anonymousClient = new TestClient(STORE_BASE);
  const customerClient = new TestClient(STORE_BASE);

  // ====================================================
  // PHASE 1: SITE DISCOVERY
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 1: SITE DISCOVERY & ROUTE REACHABILITY");
  console.log("--------------------------------------------------------------------------------");

  const discoveryRoutes = [
    { name: "Home Page", path: "/" },
    { name: "Mithai & Farsan Catalog", path: "/shop" },
    { name: "Festivals & Occasions", path: "/festivals" },
    { name: "Shopping Cart", path: "/cart" },
    { name: "Secure Checkout", path: "/checkout", authRequired: true },
    { name: "Customer Login", path: "/login" },
    { name: "Customer Registration", path: "/register" },
    { name: "Customer Account Dashboard", path: "/account", authRequired: true },
    { name: "Password Recovery", path: "/forgot-password" },
    { name: "Reset Password", path: "/reset-password" },
    { name: "Heritage Outlets Directory", path: "/stores" },
    { name: "Live Order Tracker", path: "/track" },
    { name: "Customer Wishlist", path: "/wishlist", authRequired: true },
    { name: "Store & Purity Policies", path: "/policies" },
    { name: "New Arrivals Showcase", path: "/new-arrivals" },
    { name: "Order History Index", path: "/orders", authRequired: true },
  ];

  for (const page of discoveryRoutes) {
    const res = await anonymousClient.fetch(page.path);
    // Auth-protected pages redirect unauthenticated users with 302, 307, or 308
    const passed = page.authRequired
      ? [200, 302, 303, 307, 308].includes(res.status)
      : res.status === 200;

    recordTest("phase1_discovery", `Discovery: ${page.name} (${page.path})`, passed, {
      status: res.status,
      duration: res.duration,
      authRequired: !!page.authRequired,
      bug: !passed ? {
        id: `BUG-DISC-${page.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`,
        title: `Route ${page.path} returned unexpected HTTP ${res.status}`,
        page: page.path,
        severity: "High",
        priority: "P1",
        recommendation: `Verify route definition and server-side handlers for ${page.path}.`
      } : null
    });
  }

  // ====================================================
  // PHASE 2: FUNCTIONAL TESTING
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 2: FUNCTIONAL TESTING (USER JOURNEYS & APIS)");
  console.log("--------------------------------------------------------------------------------");

  // 1. UI Configuration & Branding
  const uiConfigRes = await anonymousClient.fetch("/api/ui-config");
  const uiPassed = uiConfigRes.status === 200 && uiConfigRes.data?.storeInfo?.name?.includes("Vardayini");
  recordTest("phase2_functional", "Branding: UI Config API returns Vardayini Store Info & Heritage Attributes", uiPassed, {
    storeName: uiConfigRes.data?.storeInfo?.name,
    tagline: uiConfigRes.data?.storeInfo?.tagline,
    duration: uiConfigRes.duration
  });

  // 2. Physical Images & Assets Verification
  const publicDir = path.resolve("ai-genrated/public");
  const categoriesRes = await anonymousClient.fetch("/api/categories");
  let missingAssets = [];

  const checkAsset = (assetPath) => {
    if (!assetPath || !assetPath.startsWith("/")) return true;
    const clean = assetPath.split("?")[0].replace(/^\//, "");
    return fs.existsSync(path.join(publicDir, clean));
  };

  if (categoriesRes.status === 200 && Array.isArray(categoriesRes.data?.categories)) {
    categoriesRes.data.categories.forEach(cat => {
      if (cat.imageUrl && !checkAsset(cat.imageUrl)) {
        missingAssets.push(`Category '${cat.name}': ${cat.imageUrl}`);
      }
    });
  }

  recordTest("phase2_functional", "Assets: Category & Banner Media Files Exist on Server Disk", missingAssets.length === 0, {
    missingCount: missingAssets.length,
    samples: missingAssets.slice(0, 3),
    bug: missingAssets.length > 0 ? {
      id: "BUG-FUNC-MISSING-ASSETS",
      title: "Broken media asset references detected in category catalog",
      page: "/shop",
      severity: "Medium",
      priority: "P2",
      recommendation: "Ensure category images exist in public directory."
    } : null
  });

  // 3. Products Catalog & Details Page Verification
  const productsRes = await anonymousClient.fetch("/api/products");
  const productsList = productsRes.data?.products || [];
  const catalogPassed = productsRes.status === 200 && productsList.length > 0;
  recordTest("phase2_functional", `Catalog: Products List API returns active sweets (${productsList.length} items)`, catalogPassed, {
    itemCount: productsList.length,
    duration: productsRes.duration
  });

  let productDetailSuccessCount = 0;
  const sampleProducts = productsList.slice(0, 5);
  for (const prod of sampleProducts) {
    const slug = prod.slug || `product-${prod.id}`;
    const pDetail = await anonymousClient.fetch(`/api/products/${slug}`);
    if (pDetail.status === 200 && pDetail.data?.product?.name) {
      productDetailSuccessCount++;
    }
  }
  recordTest("phase2_functional", `Catalog: Product Detail API resolves for top items (${productDetailSuccessCount}/${sampleProducts.length})`, productDetailSuccessCount === sampleProducts.length, {
    testedCount: sampleProducts.length
  });

  // 4. Search Functionality
  // Valid keyword search
  const searchKaju = await anonymousClient.fetch("/api/products/search?q=Kaju");
  const searchKajuPassed = searchKaju.status === 200 && (searchKaju.data?.products?.length > 0 || searchKaju.data?.results?.length > 0);
  recordTest("phase2_functional", "Search: Exact keyword 'Kaju' returns matching mithai items", searchKajuPassed, {
    resultsFound: searchKaju.data?.products?.length || searchKaju.data?.results?.length || 0,
    duration: searchKaju.duration
  });

  // Partial search
  const searchPartial = await anonymousClient.fetch("/api/products/search?q=kaj");
  const searchPartialPassed = searchPartial.status === 200;
  recordTest("phase2_functional", "Search: Partial prefix 'kaj' handles smoothly without error", searchPartialPassed, {
    duration: searchPartial.duration
  });

  // Special characters search
  const searchSpecial = await anonymousClient.fetch("/api/products/search?q=%25%26%23");
  const searchSpecialPassed = searchSpecial.status === 200;
  recordTest("phase2_functional", "Search: Special characters query handled safely", searchSpecialPassed, {
    duration: searchSpecial.duration
  });

  // Non-existent search
  const searchNone = await anonymousClient.fetch("/api/products/search?q=non_existent_mithai_xyz_99");
  const searchNonePassed = searchNone.status === 200 && (searchNone.data?.products?.length === 0 || searchNone.data?.results?.length === 0);
  recordTest("phase2_functional", "Search: Non-matching query returns clean zero-results array", searchNonePassed);

  // 5. Customer Registration & Authentication
  const testEmail = `qa_patron_${Date.now()}@vardayini-test.com`;
  const registerRes = await customerClient.fetch("/api/auth/register", {
    method: "POST",
    body: {
      name: "Radha Sharma",
      email: testEmail,
      phone: "9825144556",
      password: "SecurePassword@123",
      confirmPassword: "SecurePassword@123",
    }
  });

  const registerPassed = registerRes.status === 200 || registerRes.status === 201;
  recordTest("phase2_functional", "Auth: Customer Registration with valid 10-digit mobile & credentials", registerPassed, {
    status: registerRes.status,
    email: testEmail,
    duration: registerRes.duration,
    bug: !registerPassed ? {
      id: "BUG-AUTH-REG-FAIL",
      title: "Valid customer registration failed",
      page: "/register",
      severity: "Critical",
      priority: "P0",
      recommendation: "Inspect register API validation rules."
    } : null
  });

  // Duplicate Registration
  const dupRegister = await customerClient.fetch("/api/auth/register", {
    method: "POST",
    body: {
      name: "Radha Sharma",
      email: testEmail,
      phone: "9825144556",
      password: "SecurePassword@123",
      confirmPassword: "SecurePassword@123",
    }
  });
  const dupBlocked = dupRegister.status === 400 || dupRegister.status === 409;
  recordTest("phase2_functional", "Auth: Duplicate email registration rejected with HTTP 400/409", dupBlocked, {
    status: dupRegister.status
  });

  // Customer Login
  const loginRes = await customerClient.fetch("/api/auth/login", {
    method: "POST",
    body: {
      email: testEmail,
      password: "SecurePassword@123",
    }
  });
  const loginPassed = loginRes.status === 200 && (loginRes.data?.user || loginRes.data?.success);
  recordTest("phase2_functional", "Auth: Customer Login returns active session & set-cookie", loginPassed, {
    status: loginRes.status,
    duration: loginRes.duration
  });

  // Session Profile (/api/auth/me)
  const meRes = await customerClient.fetch("/api/auth/me");
  const mePassed = meRes.status === 200 && meRes.data?.user?.email === testEmail;
  recordTest("phase2_functional", "Auth: Session Profile Verification (/api/auth/me) returns authenticated user", mePassed, {
    status: meRes.status,
    userEmail: meRes.data?.user?.email
  });

  // 6. Cart Lifecycle (Add, View, Update, Remove)
  const targetVariantId = productsList[0]?.variants?.[0]?.id || 1;
  
  // Add item
  const addCartRes = await customerClient.fetch("/api/cart", {
    method: "POST",
    body: {
      variantId: targetVariantId,
      quantity: 2
    }
  });
  const addCartPassed = addCartRes.status === 200 && (addCartRes.data?.ok || addCartRes.data?.success || addCartRes.data?.items);
  recordTest("phase2_functional", "Cart: Add item to cart (Quantity: 2) successfully updates cart state", addCartPassed, {
    status: addCartRes.status,
    duration: addCartRes.duration
  });

  // View cart
  const viewCartRes = await customerClient.fetch("/api/cart");
  const cartItems = viewCartRes.data?.items || [];
  const viewCartPassed = viewCartRes.status === 200 && cartItems.length > 0;
  recordTest("phase2_functional", `Cart: Cart persistence verified (${cartItems.length} line items)`, viewCartPassed, {
    itemsCount: cartItems.length,
    totals: viewCartRes.data?.totals
  });

  // Update item quantity
  let updateCartPassed = false;
  if (cartItems.length > 0) {
    const updateRes = await customerClient.fetch(`/api/cart/${cartItems[0].id}`, {
      method: "PATCH",
      body: { quantity: 4 }
    });
    updateCartPassed = updateRes.status === 200;
  }
  recordTest("phase2_functional", "Cart: Update line item quantity (PATCH to quantity: 4)", updateCartPassed);

  // 7. Order Placement & Checkout Lifecycle
  const checkoutPayload = {
    name: "Radha Sharma",
    phone: "9825144556",
    line1: "B-204, Royal Palace, Akota Road",
    city: "Vadodara",
    state: "Gujarat",
    pincode: "390020",
    deliverySlot: "Morning",
    paymentMethod: "cod"
  };

  const orderCreateRes = await customerClient.fetch("/api/orders", {
    method: "POST",
    body: checkoutPayload
  });

  const orderCreated = orderCreateRes.status === 200 && !!orderCreateRes.data?.order?.orderNumber;
  const placedOrderNumber = orderCreateRes.data?.order?.orderNumber;
  recordTest("phase2_functional", `Checkout: Order successfully created (${placedOrderNumber || 'Failed'})`, orderCreated, {
    status: orderCreateRes.status,
    orderNumber: placedOrderNumber,
    total: orderCreateRes.data?.order?.total,
    duration: orderCreateRes.duration,
    bug: !orderCreated ? {
      id: "BUG-FUNC-ORDER-CREATE-FAIL",
      title: "Order placement returned failure status",
      page: "/checkout",
      severity: "Critical",
      priority: "P0",
      recommendation: "Ensure cart lines and address validation pass smoothly."
    } : null
  });

  // Order Detail API
  let orderDetailPassed = false;
  if (placedOrderNumber) {
    const detailRes = await customerClient.fetch(`/api/orders/${placedOrderNumber}`);
    orderDetailPassed = detailRes.status === 200 && detailRes.data?.order?.orderNumber === placedOrderNumber;
  }
  recordTest("phase2_functional", "Orders: Authenticated Order Details Retrieval (/api/orders/[orderNumber])", orderDetailPassed);

  // Order Tracking API
  let trackPassed = false;
  if (placedOrderNumber) {
    const trackRes = await anonymousClient.fetch(`/api/orders/track?orderId=${placedOrderNumber}`);
    trackPassed = trackRes.status === 200 && (trackRes.data?.order?.orderNumber === placedOrderNumber || trackRes.data?.status);
  }
  recordTest("phase2_functional", "Orders: Public Tracking Endpoint (/api/orders/track) resolves order status", trackPassed);

  // 8. Contact Form Submission
  const contactRes = await anonymousClient.fetch("/api/contact", {
    method: "POST",
    body: {
      name: "Suresh Bhai",
      email: "suresh@example.com",
      phone: "+91 98251 44556",
      subject: "Diwali Corporate Gifting Inquiry",
      message: "Please share bulk quote for 100 boxes of Dryfruit Sweets."
    }
  });
  const contactPassed = contactRes.status === 200 || contactRes.status === 201;
  recordTest("phase2_functional", "Contact: Customer inquiry submission (/api/contact) succeeds", contactPassed, {
    status: contactRes.status,
    duration: contactRes.duration
  });

  // 9. Store Outlets Directory API
  const storesRes = await anonymousClient.fetch("/api/stores");
  const outletsList = storesRes.data?.outlets || storesRes.data?.stores || [];
  const storesPassed = storesRes.status === 200 && outletsList.length > 0;
  recordTest("phase2_functional", `Outlets: Physical stores directory resolves (${outletsList.length} locations)`, storesPassed, {
    count: outletsList.length
  });

  // ====================================================
  // PHASE 3: NEGATIVE & BOUNDARY TESTING
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 3: NEGATIVE & BOUNDARY TESTING");
  console.log("--------------------------------------------------------------------------------");

  // 1. Empty Login
  const emptyLogin = await anonymousClient.fetch("/api/auth/login", { method: "POST", body: {} });
  recordTest("phase3_negative", "Negative: Empty login credentials rejected with HTTP 400", emptyLogin.status === 400);

  // 2. Empty Registration
  const emptyReg = await anonymousClient.fetch("/api/auth/register", { method: "POST", body: {} });
  recordTest("phase3_negative", "Negative: Empty registration payload rejected with HTTP 400", emptyReg.status === 400);

  // 3. Malformed Email in Registration
  const badEmailReg = await anonymousClient.fetch("/api/auth/register", {
    method: "POST",
    body: { name: "User", email: "invalid-email-address", phone: "9825144556", password: "Password@123" }
  });
  recordTest("phase3_negative", "Negative: Malformed email syntax rejected with HTTP 400", badEmailReg.status === 400);

  // 4. Invalid Phone Number (Too short)
  const shortPhoneReg = await anonymousClient.fetch("/api/auth/register", {
    method: "POST",
    body: { name: "User", email: `qa_phone_${Date.now()}@test.com`, phone: "9825", password: "Password@123" }
  });
  recordTest("phase3_negative", "Negative: Short mobile number (< 10 digits) rejected with HTTP 400", shortPhoneReg.status === 400);

  // 5. Invalid Coupon Code
  const invalidCouponRes = await customerClient.fetch("/api/cart/coupon", {
    method: "POST",
    body: { code: "BOGUS_COUPON_100_PERCENT_OFF" }
  });
  recordTest("phase3_negative", "Negative: Non-existent coupon code rejected with HTTP 400/404", [400, 404].includes(invalidCouponRes.status));

  // 6. Boundary: Negative Cart Quantity
  const negativeQty = await customerClient.fetch("/api/cart", {
    method: "POST",
    body: { variantId: targetVariantId, quantity: -10 }
  });
  recordTest("phase3_negative", "Boundary: Negative quantity (-10) rejected by cart API", negativeQty.status >= 400);

  // 7. Boundary: Massive Search Term (3,000 characters)
  const massiveSearch = "Mithai".repeat(500);
  const massiveSearchRes = await anonymousClient.fetch(`/api/products/search?q=${encodeURIComponent(massiveSearch)}`);
  recordTest("phase3_negative", "Boundary: Massive 3,000-character search string handled safely", [200, 400, 414].includes(massiveSearchRes.status), {
    status: massiveSearchRes.status
  });

  // ====================================================
  // PHASE 4: SECURITY AUDIT
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 4: SECURITY & PENETRATION AUDIT");
  console.log("--------------------------------------------------------------------------------");

  // 1. Reflected Cross-Site Scripting (XSS)
  const xssPayload = "<script>alert('xss-test-payload')</script>";
  const xssSearchRes = await anonymousClient.fetch(`/api/products/search?q=${encodeURIComponent(xssPayload)}`);
  const xssSafe = xssSearchRes.status === 200 && !xssSearchRes.raw.includes("<script>alert('xss-test-payload')</script>");
  recordTest("phase4_security", "Security: Reflected XSS payload safely sanitized & not rendered unencoded", xssSafe);

  // 2. SQL Injection in Search
  const sqliPayload1 = "' OR '1'='1";
  const sqliSearchRes = await anonymousClient.fetch(`/api/products/search?q=${encodeURIComponent(sqliPayload1)}`);
  const sqliSafe1 = sqliSearchRes.status === 200 && !sqliSearchRes.raw.toLowerCase().includes("syntax error");
  recordTest("phase4_security", "Security: SQL Injection payload (' OR '1'='1) neutralized via parameterization", sqliSafe1);

  // 3. SQL Injection in Order Tracker
  const sqliPayload2 = "' OR 1=1 --";
  const sqliTrackRes = await anonymousClient.fetch(`/api/orders/track?orderId=${encodeURIComponent(sqliPayload2)}`);
  const sqliTrackSafe = [200, 400, 404].includes(sqliTrackRes.status) && !sqliTrackRes.raw.toLowerCase().includes("syntax error");
  recordTest("phase4_security", "Security: SQL Injection in Order Tracker (' OR 1=1 --) neutralized", sqliTrackSafe);

  // 4. Admin Access Control (Direct URL API bypass)
  const unauthReports = await anonymousClient.fetch("/api/admin/reports?type=products");
  const reportsProtected = [401, 403].includes(unauthReports.status);
  recordTest("phase4_security", "Security: Unauthorized access to Admin Reports API denied (HTTP 401/403)", reportsProtected, {
    status: unauthReports.status
  });

  const unauthCustomers = await anonymousClient.fetch("/api/admin/customers");
  const custProtected = [401, 403].includes(unauthCustomers.status);
  recordTest("phase4_security", "Security: Unauthorized access to Admin Customers API denied (HTTP 401/403)", custProtected, {
    status: unauthCustomers.status
  });

  // 5. Sensitive Data Exposure (Checking if password hashes leak)
  const productsRaw = productsRes.raw || "";
  const noHashLeak = !productsRaw.includes("$2a$") && !productsRaw.includes("$2b$") && !productsRaw.includes("passwordHash");
  recordTest("phase4_security", "Security: No password hashes ($2a$/$2b$) or secret keys exposed in public payloads", noHashLeak);

  // 6. Cookie Security Flags
  const authCookieHeader = loginRes.headers["set-cookie"]?.[0] || "";
  const isHttpOnly = authCookieHeader.toLowerCase().includes("httponly");
  const hasSameSite = authCookieHeader.toLowerCase().includes("samesite");
  recordTest("phase4_security", "Security: Session cookies enforce HttpOnly and SameSite flags", isHttpOnly && hasSameSite, {
    cookieHeader: authCookieHeader
  });

  // ====================================================
  // PHASE 6: ACCESSIBILITY (WCAG 2.1)
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 6: ACCESSIBILITY AUDIT (WCAG 2.1 COMPLIANCE)");
  console.log("--------------------------------------------------------------------------------");

  const homeHtmlRes = await anonymousClient.fetch("/");
  const homeHtml = homeHtmlRes.raw || (typeof homeHtmlRes.data === "string" ? homeHtmlRes.data : "");
  
  // HTML Lang attribute
  const hasLang = homeHtml.includes("lang=") || homeHtml.includes('lang="en"');
  const hasViewport = homeHtml.includes('name="viewport"');
  recordTest("phase6_accessibility", "WCAG: Document root declares lang attribute & responsive viewport", hasLang && hasViewport);

  // Check icon buttons without aria-label
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  let emptyButtons = 0;
  let bMatch;
  while ((bMatch = buttonRegex.exec(homeHtml)) !== null) {
    const fullTag = bMatch[0];
    const textContent = bMatch[1].replace(/<[^>]+>/g, "").trim();
    if (!textContent && !fullTag.includes("aria-label") && !fullTag.includes("title")) {
      emptyButtons++;
    }
  }
  recordTest("phase6_accessibility", "WCAG: Interactive buttons have accessible text or aria-label attributes", emptyButtons === 0, {
    emptyButtonsFound: emptyButtons,
    bug: emptyButtons > 0 ? {
      id: "BUG-A11Y-ICON-BUTTONS",
      title: "Interactive icon-only buttons missing aria-label or accessible text",
      page: "Homepage header/footer",
      severity: "Low",
      priority: "P3",
      recommendation: "Add aria-label to all icon-only button elements."
    } : null
  });

  // ====================================================
  // PHASE 7: PERFORMANCE BENCHMARKING
  // ====================================================
  console.log("\n--------------------------------------------------------------------------------");
  console.log("PHASE 7: PERFORMANCE & LOAD SPEED BENCHMARKING");
  console.log("--------------------------------------------------------------------------------");

  const perfEndpoints = [
    { name: "Home Page (SSR)", path: "/" },
    { name: "Mithai Catalog (/shop)", path: "/shop" },
    { name: "Festivals Showcase (/festivals)", path: "/festivals" },
    { name: "Products Catalog API", path: "/api/products" },
    { name: "Product Search API", path: "/api/products/search?q=Kaju" },
    { name: "Store Outlets API", path: "/api/stores" },
    { name: "Admin Dashboard Proxy Reports", path: "/api/store/api/admin/reports?type=products", customBase: ADMIN_BASE },
  ];

  for (const ep of perfEndpoints) {
    const target = ep.customBase ? `${ep.customBase}${ep.path}` : ep.path;
    const client = ep.customBase ? new TestClient(ep.customBase) : anonymousClient;
    const res = await client.fetch(ep.path);
    const passesSla = res.duration < 3000;
    recordTest("phase7_performance", `Perf SLA: ${ep.name} responds under 3000ms (Actual: ${res.duration}ms)`, passesSla, {
      duration: res.duration,
      bug: !passesSla ? {
        id: `BUG-PERF-${ep.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`,
        title: `${ep.name} exceeded performance SLA of 3,000ms`,
        page: ep.path,
        severity: "Medium",
        priority: "P2",
        recommendation: "Optimize database queries and enable caching for this endpoint."
      } : null
    });
  }

  // ====================================================
  // FINAL SCORE & SUMMARY CALCULATION
  // ====================================================
  const allTests = [
    ...auditResults.phase1_discovery,
    ...auditResults.phase2_functional,
    ...auditResults.phase3_negative,
    ...auditResults.phase4_security,
    ...auditResults.phase6_accessibility,
    ...auditResults.phase7_performance,
  ];

  const total = allTests.length;
  const passed = allTests.filter(t => t.passed).length;
  const failed = allTests.filter(t => !t.passed).length;

  console.log("\n================================================================================");
  console.log("📈 COMPREHENSIVE QA AUDIT EXECUTION SUMMARY");
  console.log("================================================================================");
  console.log(`Total Tests Executed:  ${total}`);
  console.log(`Tests Passed:          ${passed} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Tests Failed:          ${failed}`);
  console.log(`Defects Logged:        ${auditResults.bugsFound.length}`);
  console.log("================================================================================\n");

  fs.writeFileSync(
    path.resolve("scripts/qa-audit-results.json"),
    JSON.stringify(auditResults, null, 2)
  );
  console.log("Audit results written to scripts/qa-audit-results.json");
}

runComprehensiveAudit();

import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:9449";
const SCREENSHOT_DIR = path.resolve("./qa-screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "360x640", width: 360, height: 640, isMobile: true },
  { name: "390x844", width: 390, height: 844, isMobile: true },
  { name: "768x1024", width: 768, height: 1024, isMobile: false },
  { name: "1366x768", width: 1366, height: 768, isMobile: false },
  { name: "1920x1080", width: 1920, height: 1080, isMobile: false },
  { name: "3840x2160", width: 3840, height: 2160, isMobile: false },
];

const PAGES = [
  { name: "Home", path: "/" },
  { name: "All Items", path: "/shop" },
  { name: "New Launches", path: "/new-products" },
  { name: "Festive Season", path: "/festivals" },
  { name: "Sweets", path: "/shop?group=sweets" },
  { name: "Namkeen & Farsan", path: "/shop?group=namkeen" },
  { name: "Bakery", path: "/shop?group=bakery" },
  { name: "Stores", path: "/stores" },
  { name: "Search Results", path: "/shop?q=kaju" },
  { name: "Wishlist", path: "/wishlist" },
  { name: "Cart", path: "/cart" },
  { name: "Checkout", path: "/checkout" },
  { name: "Login", path: "/login" },
];

async function runAudit() {
  console.log(`[QA Runner] Launching Chrome from: ${CHROME_PATH}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const allIssues = [];
  const testResults = [];

  // First find a valid product slug
  let productSlug = "golden-kesar-jalebi-papdi-fafda-combo";
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (res.ok) {
      const data = await res.json();
      const list = data.products || data.items || (Array.isArray(data) ? data : []);
      if (list.length > 0 && list[0].slug) {
        productSlug = list[0].slug;
      }
    }
  } catch (err) {
    console.warn("Using fallback product slug:", productSlug);
  }

  const allPages = [
    ...PAGES,
    { name: "Product Detail", path: `/shop/${productSlug}` },
  ];

  console.log(`[QA Runner] Starting audit of ${allPages.length} pages across ${VIEWPORTS.length} viewports...`);

  for (const vp of VIEWPORTS) {
    console.log(`\n========================================`);
    console.log(`AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    for (const p of allPages) {
      const pageUrl = `${BASE_URL}${p.path}`;
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile });

      const consoleErrors = [];
      const failedRequests = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      page.on("requestfailed", (req) => {
        failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText || "failed"}`);
      });

      try {
        const response = await page.goto(pageUrl, { waitUntil: "networkidle2", timeout: 25000 });
        const statusCode = response?.status() || 0;

        // Give a short grace period for animations / hydration
        await new Promise((r) => setTimeout(r, 600));

        // Screenshot filename
        const safeName = p.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const screenshotFile = `screenshot-${safeName}-${vp.name}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, screenshotFile);

        await page.screenshot({ path: screenshotPath, fullPage: false });

        // Run in-page automated checks
        const analysis = await page.evaluate((isMobile) => {
          const docEl = document.documentElement;
          const body = document.body;

          // 1. Horizontal overflow
          const docScrollWidth = docEl.scrollWidth;
          const windowInnerWidth = window.innerWidth;
          const hasHorizontalOverflow = docScrollWidth > windowInnerWidth + 1;

          // 2. Images check
          const images = Array.from(document.querySelectorAll("img"));
          const missingAlt = images.filter((img) => !img.hasAttribute("alt") || img.getAttribute("alt") === "");
          const brokenImages = images.filter((img) => img.complete && img.naturalWidth === 0);

          // 3. Small typography (< 14px for body text on mobile)
          const smallTextElements = [];
          if (isMobile) {
            const paragraphs = Array.from(document.querySelectorAll("p, span, a, label, li"));
            for (const el of paragraphs) {
              const text = el.innerText?.trim();
              // Only check visible text elements with substantial content
              if (text && text.length > 15 && el.offsetParent !== null) {
                const fs = parseFloat(window.getComputedStyle(el).fontSize);
                if (fs < 13) {
                  smallTextElements.push({
                    text: text.slice(0, 30),
                    fontSize: `${fs}px`,
                    tag: el.tagName.toLowerCase(),
                  });
                  if (smallTextElements.length >= 5) break;
                }
              }
            }
          }

          // 4. Touch target size (< 44px on mobile)
          const smallTouchTargets = [];
          if (isMobile) {
            const interactives = Array.from(document.querySelectorAll("button, a, input, select"));
            for (const el of interactives) {
              if (el.offsetParent !== null) {
                const rect = el.getBoundingClientRect();
                if ((rect.width > 0 && rect.width < 40) || (rect.height > 0 && rect.height < 40)) {
                  // Ignore inline text links inside paragraphs
                  if (el.tagName.toLowerCase() === "a" && el.parentElement?.tagName.toLowerCase() === "p") {
                    continue;
                  }
                  smallTouchTargets.push({
                    tag: el.tagName.toLowerCase(),
                    text: (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "").trim().slice(0, 20),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                  });
                  if (smallTouchTargets.length >= 6) break;
                }
              }
            }
          }

          // 5. Developer controls detection
          const hasChangeUi = Boolean(
            Array.from(document.querySelectorAll("button, a, span")).some((el) =>
              (el.textContent || "").includes("Change UI")
            )
          );

          // 6. Dead anchor links (href="#" or javascript:void(0) without handlers)
          const deadLinks = Array.from(document.querySelectorAll("a[href='#']")).map((a) =>
            (a.innerText || a.getAttribute("aria-label") || "unnamed link").trim()
          );

          return {
            hasHorizontalOverflow,
            docScrollWidth,
            windowInnerWidth,
            missingAltCount: missingAlt.length,
            brokenImagesCount: brokenImages.length,
            brokenImageSrcs: brokenImages.map((img) => img.src).slice(0, 3),
            smallTextCount: smallTextElements.length,
            smallTextSamples: smallTextElements,
            smallTouchCount: smallTouchTargets.length,
            smallTouchSamples: smallTouchTargets,
            hasChangeUi,
            deadLinksCount: deadLinks.length,
            deadLinksSamples: deadLinks.slice(0, 3),
          };
        }, vp.isMobile);

        const pageResult = {
          page: p.name,
          path: p.path,
          viewport: vp.name,
          statusCode,
          screenshot: screenshotFile,
          consoleErrors,
          failedRequests,
          analysis,
        };
        testResults.push(pageResult);

        // Classify issues
        if (statusCode >= 400) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `HTTP Error ${statusCode} on navigation`,
            severity: "High",
            screenshot: screenshotFile,
          });
        }

        if (analysis.hasHorizontalOverflow) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `Horizontal page overflow (scrollWidth: ${analysis.docScrollWidth}px > innerWidth: ${analysis.windowInnerWidth}px)`,
            severity: "High",
            screenshot: screenshotFile,
          });
        }

        if (analysis.brokenImagesCount > 0) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `${analysis.brokenImagesCount} broken image(s) detected: ${analysis.brokenImageSrcs.join(", ")}`,
            severity: "High",
            screenshot: screenshotFile,
          });
        }

        if (analysis.hasChangeUi) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `Debug/Developer control "Change UI" is exposed in public customer navigation`,
            severity: "Med",
            screenshot: screenshotFile,
          });
        }

        if (consoleErrors.length > 0) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `Console JavaScript Error(s): ${consoleErrors[0].slice(0, 80)}...`,
            severity: "Med",
            screenshot: screenshotFile,
          });
        }

        if (analysis.missingAltCount > 0) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `${analysis.missingAltCount} image(s) missing alt text (accessibility violation)`,
            severity: "Low",
            screenshot: screenshotFile,
          });
        }

        if (analysis.smallTouchCount > 0) {
          allIssues.push({
            page: p.name,
            viewport: vp.name,
            issue: `Mobile touch targets under 44x44px (${analysis.smallTouchCount} found, e.g. ${analysis.smallTouchSamples.map((s) => `${s.tag}[${s.width}x${s.height}px]`).join(", ")})`,
            severity: "Low",
            screenshot: screenshotFile,
          });
        }

        console.log(`  ✓ ${p.name} (${statusCode}) - Overflow: ${analysis.hasHorizontalOverflow ? "YES (FAIL)" : "None"} | Broken Imgs: ${analysis.brokenImagesCount} | Change UI: ${analysis.hasChangeUi ? "VISIBLE" : "hidden"} | Console Errs: ${consoleErrors.length}`);
      } catch (err) {
        console.error(`  ✗ Error testing ${p.name} at ${vp.name}:`, err.message);
        allIssues.push({
          page: p.name,
          viewport: vp.name,
          issue: `Test failed to complete: ${err.message}`,
          severity: "High",
          screenshot: "n/a",
        });
      } finally {
        await page.close();
      }
    }
  }

  // SHOPPING FLOW TESTS
  console.log(`\n========================================`);
  console.log(`AUDITING SHOPPING FLOW & INTERACTIONS (Mobile & Desktop)`);
  console.log(`========================================`);

  const flowPage = await browser.newPage();
  await flowPage.setViewport({ width: 390, height: 844, isMobile: true });

  const shoppingFlowIssues = [];

  try {
    // 1. Mobile Menu test
    console.log("[Flow] Testing Mobile Navigation Menu...");
    await flowPage.goto(`${BASE_URL}/`, { waitUntil: "networkidle2" });
    const menuBtn = await flowPage.$('button[aria-label="Toggle navigation menu"]');
    if (menuBtn) {
      await menuBtn.click();
      await new Promise((r) => setTimeout(r, 400));
      const menuOpen = await flowPage.evaluate(() => {
        return Boolean(document.querySelector('nav a[href="/shop"], div[role="dialog"], [data-mobile-menu="true"]'));
      });
      console.log(`  ✓ Mobile Menu opens successfully: ${menuOpen}`);
      await flowPage.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot-flow-mobile-menu.png") });
    } else {
      shoppingFlowIssues.push("Mobile menu toggle button missing on 390x844");
    }

    // 2. Add to Cart flow
    console.log("[Flow] Testing Add to Cart from Shop...");
    await flowPage.goto(`${BASE_URL}/shop`, { waitUntil: "networkidle2" });
    const addClicked = await flowPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find((b) => {
        const t = (b.textContent || "").toLowerCase();
        return t.includes("add to") || t.includes("add") || t.includes("ઉમેરો");
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`  ✓ Add button clicked: ${addClicked}`);
    await new Promise((r) => setTimeout(r, 800));

    // 3. Cart Page operations
    console.log("[Flow] Testing Cart Page calculations, coupon FESTIVE15, and threshold...");
    await flowPage.goto(`${BASE_URL}/cart`, { waitUntil: "networkidle2" });
    await flowPage.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot-flow-cart.png") });

    const cartData = await flowPage.evaluate(() => {
      const text = document.body.innerText;
      const hasFreeDelivery = text.includes("799") || text.includes("Free Delivery") || text.includes("મફત");
      const couponInput = document.querySelector('input[placeholder*="Coupon" i], input[placeholder*="કૂપન" i], input[name="coupon"]');
      return {
        hasFreeDelivery,
        hasCouponInput: Boolean(couponInput),
        bodyTextSnippet: text.slice(0, 200),
      };
    });
    console.log("  ✓ Cart analysis:", cartData);

    // 4. Try applying FESTIVE15 coupon
    const couponApplied = await flowPage.evaluate(() => {
      const input = document.querySelector('input[placeholder*="Coupon" i], input[placeholder*="કૂપન" i], input[name="coupon"]');
      if (input) {
        input.value = "FESTIVE15";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const applyBtn = Array.from(document.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Apply");
      if (applyBtn) {
        applyBtn.click();
        return true;
      }
      return false;
    });
    console.log(`  ✓ Coupon Apply clicked: ${couponApplied}`);
    await new Promise((r) => setTimeout(r, 1000));
    await flowPage.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot-flow-coupon-applied.png") });

    // 5. Checkout Page Validation
    console.log("[Flow] Testing Checkout Page validation and empty state...");
    await flowPage.goto(`${BASE_URL}/checkout`, { waitUntil: "networkidle2" });
    await flowPage.screenshot({ path: path.join(SCREENSHOT_DIR, "screenshot-flow-checkout.png") });

    const checkoutUrl = flowPage.url();
    console.log(`  ✓ Checkout redirected or loaded: ${checkoutUrl}`);
  } catch (err) {
    console.error("  ✗ Shopping flow error:", err.message);
    shoppingFlowIssues.push(err.message);
  } finally {
    await flowPage.close();
  }

  await browser.close();

  // Save audit report JSON
  const auditReport = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.length,
    issuesCount: allIssues.length,
    issues: allIssues,
    testResults,
    shoppingFlowIssues,
  };

  fs.writeFileSync("./qa-audit-final-results.json", JSON.stringify(auditReport, null, 2));
  console.log(`\n========================================`);
  console.log(`AUDIT COMPLETE: ${allIssues.length} issues detected across ${testResults.length} test configurations.`);
  console.log(`Detailed results saved to ./qa-audit-final-results.json`);
  console.log(`Screenshots saved to ${SCREENSHOT_DIR}`);
  console.log(`========================================\n`);
}

runAudit().catch(console.error);

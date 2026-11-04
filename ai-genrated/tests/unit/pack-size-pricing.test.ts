import { describe, it, expect, beforeEach } from "vitest";
import { POST as createProductRoute, PUT as updateProductRoute, DELETE as deleteProductRoute, GET as getAdminProductsRoute } from "@/app/api/admin/products/route";
import { GET as getProductBySlugRoute } from "@/app/api/products/[slug]/route";
import { addToCart, loadCartLines, clearCartForIdentity } from "@/lib/cart";
import { buildRequest, loginAs, logout, getTestFixtures, setGuestCart, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";
import { calculateDiscount } from "@/lib/money";

describe("Product Price & Pack Size Management - 7 Verification Test Cases", () => {
  let adminId: number;
  let sampleCategoryId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    adminId = fixtures.admin.id;

    const [cat] = await db.select().from(categories).limit(1);
    if (!cat) throw new Error("No category found");
    sampleCategoryId = cat.id;

    await logout();
    mockCookieStore.clear();
    await loginAs(adminId);
  });

  // Case 1: Same selling price and original price: no discount displayed
  it("Case 1: Same selling price and original price: no discount displayed", () => {
    const originalPrice = 350;
    const sellingPrice = 350;
    const discountPct = calculateDiscount(originalPrice, sellingPrice);

    expect(discountPct).toBe(0);
    expect(originalPrice > sellingPrice).toBe(false);

    // Negative selling price or higher selling price should also never yield discount
    expect(calculateDiscount(350, 400)).toBe(0);
  });

  // Case 2: Selling price lower than original price: correct discount displayed
  it("Case 2: Selling price lower than original price: correct discount displayed", () => {
    // Formula: ((Original Price - Selling Price) / Original Price) * 100
    // e.g. Original ₹350, Selling ₹300 -> ((350 - 300) / 350) * 100 = 14.28% -> 14%
    const originalPrice = 350;
    const sellingPrice = 300;
    const discountPct = calculateDiscount(originalPrice, sellingPrice);

    expect(discountPct).toBe(14);
    expect(originalPrice > sellingPrice).toBe(true);

    // Another example: Original ₹1,400, Selling ₹1,200 -> ((1400 - 1200) / 1400) * 100 = 14%
    expect(calculateDiscount(1400, 1200)).toBe(14);

    // Example 3: Original ₹500, Selling ₹250 -> 50%
    expect(calculateDiscount(500, 250)).toBe(50);
  });

  // Case 3: Change pack size: price updates immediately
  it("Case 3: Change pack size: prices and discounts update immediately for each variant", async () => {
    const testProductName = `Kaju Katli Pack Switcher ${Date.now()}`;
    const req = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: testProductName,
        categoryId: sampleCategoryId,
        variants: [
          { packName: "Standard Pack", weight: "250g", price: 350, discountedPrice: 300, stock: 50, isDefault: true },
          { packName: "Family Pack", weight: "500g", price: 700, discountedPrice: 600, stock: 40, isDefault: false },
          { packName: "Premium Pack", weight: "1 kg", price: 1400, discountedPrice: 1200, stock: 30, isDefault: false },
        ],
      },
    });

    const res = await createProductRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.variants).toHaveLength(3);

    // Selecting Pack 1 (250g)
    const pack1 = data.variants[0];
    expect(pack1.weight).toBe("250g");
    expect(pack1.price).toBe(350);
    expect(pack1.discountedPrice).toBe(300);
    expect(calculateDiscount(pack1.price, pack1.discountedPrice)).toBe(14);

    // Switching to Pack 2 (500g)
    const pack2 = data.variants[1];
    expect(pack2.weight).toBe("500g");
    expect(pack2.price).toBe(700);
    expect(pack2.discountedPrice).toBe(600);
    expect(calculateDiscount(pack2.price, pack2.discountedPrice)).toBe(14);

    // Switching to Pack 3 (1 kg)
    const pack3 = data.variants[2];
    expect(pack3.weight).toBe("1 kg");
    expect(pack3.price).toBe(1400);
    expect(pack3.discountedPrice).toBe(1200);
    expect(calculateDiscount(pack3.price, pack3.discountedPrice)).toBe(14);
  });

  // Case 4: Add new pack size: appears on customer website
  it("Case 4: Add new pack size: appears on customer website", async () => {
    const testProductName = `Motichoor Pack Test ${Date.now()}`;
    // 1. Create product with initial 1 pack size
    const createReq = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: testProductName,
        categoryId: sampleCategoryId,
        weight: "250g",
        packName: "Standard Pack",
        price: 200,
        discountedPrice: 180,
        stock: 30,
      },
    });
    const createRes = await createProductRoute(createReq);
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    const productId = createData.product.id;
    const productSlug = createData.product.slug;

    // 2. Add new 500g Family Pack and 1 kg Jumbo Pack via admin PUT
    const updateReq = buildRequest({
      method: "PUT",
      url: "/api/admin/products",
      body: {
        productId,
        variants: [
          { id: createData.variant.id, packName: "Standard Pack", weight: "250g", price: 200, discountedPrice: 180, stock: 30, isDefault: true },
          { packName: "Family Pack", weight: "500g", price: 400, discountedPrice: 350, stock: 25, isDefault: false },
          { packName: "Jumbo Pack", weight: "1 kg", price: 800, discountedPrice: 700, stock: 15, isDefault: false },
        ],
      },
    });
    const updateRes = await updateProductRoute(updateReq);
    expect(updateRes.status).toBe(200);

    // 3. Query customer storefront API
    const storeReq = buildRequest({
      method: "GET",
      url: `/api/products/${productSlug}`,
    });
    const storeRes = await getProductBySlugRoute(storeReq, {
      params: Promise.resolve({ slug: productSlug }),
    });
    expect(storeRes.status).toBe(200);
    const storeData = await storeRes.json();

    // Verify all 3 pack sizes appear on customer website
    expect(storeData.product.variants).toHaveLength(3);
    const weights = storeData.product.variants.map((v: any) => v.weight);
    expect(weights).toContain("250g");
    expect(weights).toContain("500g");
    expect(weights).toContain("1 kg");
  });

  // Case 5: Edit price in admin: updated price appears on website
  it("Case 5: Edit price in admin: updated price appears on website", async () => {
    const testProductName = `Kaju Anjeer Roll ${Date.now()}`;
    const createReq = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: testProductName,
        categoryId: sampleCategoryId,
        weight: "500g",
        price: 500,
        discountedPrice: 450,
        stock: 20,
      },
    });
    const createRes = await createProductRoute(createReq);
    const createData = await createRes.json();
    const productId = createData.product.id;
    const variantId = createData.variant.id;
    const productSlug = createData.product.slug;

    // Admin updates price to MRP ₹550, Selling Price ₹480
    const updateReq = buildRequest({
      method: "PUT",
      url: "/api/admin/products",
      body: {
        productId,
        variantId,
        price: 550,
        discountedPrice: 480,
      },
    });
    const updateRes = await updateProductRoute(updateReq);
    expect(updateRes.status).toBe(200);

    // Customer visits product page
    const storeReq = buildRequest({ method: "GET", url: `/api/products/${productSlug}` });
    const storeRes = await getProductBySlugRoute(storeReq, {
      params: Promise.resolve({ slug: productSlug }),
    });
    expect(storeRes.status).toBe(200);
    const storeData = await storeRes.json();
    const variant = storeData.product.variants[0];

    expect(variant.price).toBe(550);
    expect(variant.discountedPrice).toBe(480);
    expect(calculateDiscount(variant.price, variant.discountedPrice)).toBe(13); // ((550 - 480)/550)*100 = 12.7% -> 13%
  });

  // Case 6: Delete pack size: removed from customer selection
  it("Case 6: Delete pack size: removed from customer selection", async () => {
    const testProductName = `Dryfruit Halwa Deletion Test ${Date.now()}`;
    const createReq = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: testProductName,
        categoryId: sampleCategoryId,
        variants: [
          { packName: "Standard Pack", weight: "250g", price: 300, discountedPrice: 280, stock: 20, isDefault: true },
          { packName: "Family Pack", weight: "500g", price: 600, discountedPrice: 550, stock: 15, isDefault: false },
        ],
      },
    });
    const createRes = await createProductRoute(createReq);
    const createData = await createRes.json();
    const variantToDeleteId = createData.variants[1].id;
    const productSlug = createData.product.slug;

    // Delete the 500g pack size via admin DELETE
    const deleteReq = buildRequest({
      method: "DELETE",
      url: `/api/admin/products?variantId=${variantToDeleteId}`,
    });
    const deleteRes = await deleteProductRoute(deleteReq);
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.success).toBe(true);

    // Verify on customer website: only 250g pack remains
    const storeReq = buildRequest({ method: "GET", url: `/api/products/${productSlug}` });
    const storeRes = await getProductBySlugRoute(storeReq, {
      params: Promise.resolve({ slug: productSlug }),
    });
    const storeData = await storeRes.json();
    expect(storeData.product.variants).toHaveLength(1);
    expect(storeData.product.variants[0].weight).toBe("250g");
  });

  // Case 7: Existing cart and checkout continue working
  it("Case 7: Existing cart and checkout continue working with configured pack size", async () => {
    const testProductName = `Cart & Checkout Integrity ${Date.now()}`;
    const createReq = buildRequest({
      method: "POST",
      url: "/api/admin/products",
      body: {
        name: testProductName,
        categoryId: sampleCategoryId,
        variants: [
          { packName: "Family Pack", weight: "500g", price: 400, discountedPrice: 360, stock: 50, isDefault: true },
        ],
      },
    });
    const createRes = await createProductRoute(createReq);
    const createData = await createRes.json();
    const configuredVariant = createData.variants[0];

    // Customer adds this variant to cart
    await logout();
    mockCookieStore.clear();
    setGuestCart("pack-pricing-cart-session");
    await clearCartForIdentity();

    await addToCart(configuredVariant.id, 2);
    const cart = await loadCartLines();

    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].variantId).toBe(configuredVariant.id);
    expect(cart.lines[0].quantity).toBe(2);
    expect(cart.lines[0].unit).toBe(360); // Discounted selling price passed to cart!
    expect(cart.lines[0].lineTotal).toBe(720); // 360 * 2
    expect(cart.totals.subtotal).toBe(720);
  });
});

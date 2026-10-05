import { describe, it, expect, beforeEach } from "vitest";
import { POST as createProduct, PUT as updateProduct } from "@/app/api/admin/products/route";
import { PUT as updateInventory } from "@/app/api/admin/inventory/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { eq } from "drizzle-orm";

describe("Admin Products & Inventory Numeric Validation and Lifecycle", () => {
  let adminId: number;
  let sampleVariantId: number;
  let sampleProductId: number;
  let sampleCategoryId: number;

  beforeEach(async () => {
    await ensureSeeded();
    const fixtures = await getTestFixtures();
    adminId = fixtures.admin.id;
    sampleVariantId = fixtures.variantKK250.id;
    sampleProductId = fixtures.variantKK250.productId;

    const [category] = await db.select().from(categories).limit(1);
    if (!category) throw new Error("No category found");
    sampleCategoryId = category.id;

    await logout();
    mockCookieStore.clear();
    await loginAs(adminId);
  });

  describe("Admin Products Validation", () => {
    it("rejects non-integer, negative, or non-finite price with 400", async () => {
      const invalidPrices = [-10, 15.5, NaN, Infinity, "abc", null];

      for (const price of invalidPrices) {
        const req = buildRequest({
          method: "POST",
          url: "/api/admin/products",
          body: {
            name: "Test Barfi",
            categoryId: sampleCategoryId,
            price,
            stock: 10,
          },
        });
        const res = await createProduct(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/price/i);
      }
    });

    it("rejects non-integer, negative, or non-finite stock with 400", async () => {
      const invalidStocks = [-5, 3.14, NaN, Infinity, "many"];

      for (const stock of invalidStocks) {
        const req = buildRequest({
          method: "POST",
          url: "/api/admin/products",
          body: {
            name: "Test Peda",
            categoryId: sampleCategoryId,
            price: 200,
            stock,
          },
        });
        const res = await createProduct(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toMatch(/stock/i);
      }
    });

    it("creates product and variant atomically in a single transaction", async () => {
      const uniqueName = `Special Pista Roll ${Date.now()}`;
      const req = buildRequest({
        method: "POST",
        url: "/api/admin/products",
        body: {
          name: uniqueName,
          categoryId: sampleCategoryId,
          price: 450,
          discountedPrice: 420,
          stock: 25,
          weight: "250g",
        },
      });

      const res = await createProduct(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.product.name).toBe(uniqueName);
      expect(data.variant.price).toBe(450);
      expect(data.variant.discountedPrice).toBe(420);
      expect(data.variant.stock).toBe(25);

      // Verify DB state
      const [prodInDb] = await db.select().from(products).where(eq(products.name, uniqueName));
      expect(prodInDb).toBeDefined();

      const [varInDb] = await db.select().from(productVariants).where(eq(productVariants.productId, prodInDb.id));
      expect(varInDb).toBeDefined();
      expect(varInDb.price).toBe(450);
    });

    it("returns 404 when updating non-existent product or variant", async () => {
      const reqProduct = buildRequest({
        method: "PUT",
        url: "/api/admin/products",
        body: {
          productId: 999999,
          name: "Phantom Sweet",
        },
      });
      const resProduct = await updateProduct(reqProduct);
      expect(resProduct.status).toBe(404);

      const reqVariant = buildRequest({
        method: "PUT",
        url: "/api/admin/products",
        body: {
          variantId: 999999,
          price: 300,
        },
      });
      const resVariant = await updateProduct(reqVariant);
      expect(resVariant.status).toBe(404);
    });

    it("returns 404 on variant ownership mismatch during update", async () => {
      // Find another product
      const otherProducts = await db.select().from(products).where(eq(products.id, sampleProductId));
      const [anotherProduct] = await db.select().from(products).where(eq(products.name, "Besan Ladoo")).limit(1);

      if (anotherProduct && anotherProduct.id !== sampleProductId) {
        const req = buildRequest({
          method: "PUT",
          url: "/api/admin/products",
          body: {
            productId: anotherProduct.id,
            variantId: sampleVariantId, // belongs to sampleProductId, NOT anotherProduct
            price: 500,
          },
        });
        const res = await updateProduct(req);
        expect(res.status).toBe(404);
        const data = await res.json();
        expect(data.error).toMatch(/belong/i);
      }
    });
  });

  describe("Admin Inventory Validation", () => {
    it("validates stock as finite, non-negative integer", async () => {
      const invalidStocks = [-1, 2.5, "not-a-number", NaN, Infinity];

      for (const stock of invalidStocks) {
        const req = buildRequest({
          method: "PUT",
          url: "/api/admin/inventory",
          body: {
            id: sampleVariantId,
            stock,
          },
        });
        const res = await updateInventory(req);
        expect(res.status).toBe(400);
      }
    });

    it("returns 404 if no variant is updated", async () => {
      const req = buildRequest({
        method: "PUT",
        url: "/api/admin/inventory",
        body: {
          id: 999999,
          stock: 40,
        },
      });
      const res = await updateInventory(req);
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toMatch(/not found/i);
    });

    it("successfully updates stock with valid integer and returns 200", async () => {
      const targetStock = 77;
      const req = buildRequest({
        method: "PUT",
        url: "/api/admin/inventory",
        body: {
          id: sampleVariantId,
          stock: targetStock,
        },
      });
      const res = await updateInventory(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.variant.stock).toBe(targetStock);

      const [updatedInDb] = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.id, sampleVariantId));
      expect(updatedInDb.stock).toBe(targetStock);
    });
  });
});

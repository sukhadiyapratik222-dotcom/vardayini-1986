import { describe, it, expect, beforeEach } from "vitest";
import { POST as createProductRoute, PUT as updateProductRoute, DELETE as deleteProductRoute, GET as getAdminProductsRoute } from "@/app/api/admin/products/route";
import { GET as getInventoryRoute, PUT as updateInventoryRoute } from "@/app/api/admin/inventory/route";
import { buildRequest, loginAs, logout, getTestFixtures, mockCookieStore } from "../helpers";
import { db } from "@/db";
import { products, productVariants, categories, orderItems, orders, activityLogs } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { listProducts, getProductBySlug } from "@/lib/products";
import { eq, desc } from "drizzle-orm";

describe("Product Add, Remove & Inventory Validation Tests", () => {
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

  // 1. Add Product Validations
  describe("1. Add Product Validations", () => {
    it("rejects product creation when selling price is zero or missing", async () => {
      const req = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: "Zero Price Test Sweets",
          categoryId: sampleCategoryId,
          price: 0,
        },
      });

      const res = await createProductRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/greater than zero/i);
    });

    it("rejects product creation when original price is lower than selling price", async () => {
      const req = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: "Invalid Discount Test Sweets",
          categoryId: sampleCategoryId,
          variants: [
            {
              packName: "Standard Pack",
              weight: "500g",
              price: 200, // MRP
              discountedPrice: 300, // Selling price > MRP
              stock: 50,
            },
          ],
        },
      });

      const res = await createProductRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/cannot exceed base price|Discounted price/i);
    });

    it("rejects duplicate product submissions with identical name", async () => {
      const uniqueName = `Royal Anjeer Roll ${Date.now()}`;
      const req1 = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: uniqueName,
          categoryId: sampleCategoryId,
          price: 500,
          discountedPrice: 450,
          stock: 25,
        },
      });

      const res1 = await createProductRoute(req1);
      expect(res1.status).toBe(200);

      // Attempt duplicate submission
      const req2 = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: uniqueName,
          categoryId: sampleCategoryId,
          price: 500,
          discountedPrice: 450,
          stock: 25,
        },
      });

      const res2 = await createProductRoute(req2);
      expect(res2.status).toBe(400);
      const data2 = await res2.json();
      expect(data2.error).toMatch(/already exists|unique name/i);
    });

    it("rejects unsupported image format", async () => {
      const req = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: `Image Test Sweet ${Date.now()}`,
          categoryId: sampleCategoryId,
          imageUrl: "https://example.com/malicious.exe",
          price: 350,
        },
      });

      const res = await createProductRoute(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/Invalid product image format/i);
    });

    it("logs product creation to activityLogs table", async () => {
      const testName = `Audit Log Sweet ${Date.now()}`;
      const req = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: testName,
          categoryId: sampleCategoryId,
          price: 400,
          discountedPrice: 350,
          stock: 30,
        },
      });

      const res = await createProductRoute(req);
      expect(res.status).toBe(200);

      const [log] = await db
        .select()
        .from(activityLogs)
        .where(eq(activityLogs.action, "create_product"))
        .orderBy(desc(activityLogs.id))
        .limit(1);

      expect(log).toBeDefined();
      expect(log?.module).toBe("products");
      expect(log?.details).toContain(testName);
    });
  });

  // 2. Remove Product & Order History Archiving
  describe("2. Remove Product & Order History Archiving", () => {
    it("archives product instead of permanently deleting if it has order history", async () => {
      // Create product
      const testName = `Order History Sweet ${Date.now()}`;
      const createReq = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: testName,
          categoryId: sampleCategoryId,
          price: 600,
          discountedPrice: 550,
          stock: 40,
        },
      });
      const createRes = await createProductRoute(createReq);
      const createData = await createRes.json();
      const prodId = createData.product.id;
      const varId = createData.variant.id;

      // Simulate existing order for this variant
      const [orderRes] = await db.insert(orders).values({
        addressSnapshot: "Vadodara",
        deliverySlot: "Standard",
        paymentMethod: "cod",
        orderNumber: `VSM-TEST-${Date.now()}`,
        status: "delivered",
        subtotal: 550,
        total: 550,
        paymentStatus: "paid",
      });
      const orderId = Number((orderRes as any).insertId);

      await db.insert(orderItems).values({
        imageUrl: "",
        orderId,
        variantId: varId,
        productName: testName,
        variantWeight: "500g",
        unitPrice: 550,
        quantity: 1,
      } as any);

      // Now attempt delete
      const delReq = buildRequest({
        url: `/api/admin/products?id=${prodId}`,
        method: "DELETE",
      });
      const delRes = await deleteProductRoute(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();

      // Must be safely archived
      expect(delData.archived).toBe(true);
      expect(delData.message).toContain("archived");

      // Verify in DB that product is archived, not deleted
      const [dbProd] = await db.select().from(products).where(eq(products.id, prodId));
      expect(dbProd).toBeDefined();
      expect(Boolean(dbProd.isArchived)).toBe(true);
      expect(Boolean(dbProd.isActive)).toBe(false);

      // Verify that archived product is excluded from customer storefront
      const storeProducts = await listProducts({});
      const foundInStore = storeProducts.some((p) => p.id === prodId);
      expect(foundInStore).toBe(false);

      const directLookup = await getProductBySlug(dbProd.slug);
      expect(directLookup).toBeNull();
    });

    it("permanently deletes product when no order history exists", async () => {
      const testName = `No Order History Sweet ${Date.now()}`;
      const createReq = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: testName,
          categoryId: sampleCategoryId,
          price: 300,
          stock: 20,
        },
      });
      const createRes = await createProductRoute(createReq);
      const createData = await createRes.json();
      const prodId = createData.product.id;

      // Delete product
      const delReq = buildRequest({
        url: `/api/admin/products?id=${prodId}`,
        method: "DELETE",
      });
      const delRes = await deleteProductRoute(delReq);
      expect(delRes.status).toBe(200);
      const delData = await delRes.json();

      expect(delData.archived).toBe(false);

      // Verify removed from DB
      const [dbProd] = await db.select().from(products).where(eq(products.id, prodId));
      expect(dbProd).toBeUndefined();
    });
  });

  // 3. Stock Management API
  describe("3. Stock Management API", () => {
    it("adds stock, removes stock, and prevents negative stock", async () => {
      // Create product
      const createReq = buildRequest({
        url: "/api/admin/products",
        method: "POST",
        body: {
          name: `Stock Test Sweet ${Date.now()}`,
          categoryId: sampleCategoryId,
          price: 400,
          stock: 10,
        },
      });
      const createRes = await createProductRoute(createReq);
      const createData = await createRes.json();
      const varId = createData.variant.id;

      // 1. Add Stock (+15 units)
      const addReq = buildRequest({
        url: "/api/admin/inventory",
        method: "PUT",
        body: {
          id: varId,
          action: "add",
          amount: 15,
        },
      });
      const addRes = await updateInventoryRoute(addReq);
      expect(addRes.status).toBe(200);
      const addData = await addRes.json();
      expect(addData.newStock).toBe(25); // 10 + 15 = 25

      // 2. Remove Stock (-10 units)
      const remReq = buildRequest({
        url: "/api/admin/inventory",
        method: "PUT",
        body: {
          id: varId,
          action: "remove",
          amount: 10,
        },
      });
      const remRes = await updateInventoryRoute(remReq);
      expect(remRes.status).toBe(200);
      const remData = await remRes.json();
      expect(remData.newStock).toBe(15); // 25 - 10 = 15

      // 3. Prevent Negative Stock (try removing 100 units from 15)
      const negReq = buildRequest({
        url: "/api/admin/inventory",
        method: "PUT",
        body: {
          id: varId,
          action: "remove",
          amount: 100,
        },
      });
      const negRes = await updateInventoryRoute(negReq);
      expect(negRes.status).toBe(200);
      const negData = await negRes.json();
      expect(negData.newStock).toBe(0); // clamped at 0, never negative
    });

    it("correctly identifies low-stock (< 5) and out-of-stock (= 0) in GET /api/admin/inventory", async () => {
      const getReq = buildRequest({
        url: "/api/admin/inventory",
        method: "GET",
      });
      const res = await getInventoryRoute(getReq);
      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data.variants)).toBe(true);
      expect(Array.isArray(data.lowStock)).toBe(true);
      expect(Array.isArray(data.outOfStock)).toBe(true);
      expect(data.metrics).toBeDefined();

      // Verify that low stock items all have stock > 0 and stock < 5
      for (const item of data.lowStock) {
        expect(item.stock).toBeGreaterThan(0);
        expect(item.stock).toBeLessThan(5);
      }

      // Verify out of stock items have stock <= 0
      for (const item of data.outOfStock) {
        expect(item.stock).toBeLessThanOrEqual(0);
      }
    });
  });
});

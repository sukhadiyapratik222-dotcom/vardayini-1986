import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, products, productVariants } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";

export interface FixtureUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface FixtureVariant {
  id: number;
  productId: number;
  weight: string;
  sku: string;
  price: number;
  discountedPrice: number | null;
  stock: number;
}

export interface TestFixtures {
  customer: FixtureUser;
  admin: FixtureUser;
  variantKK250: FixtureVariant;
  productKajuKatli: {
    id: number;
    name: string;
    slug: string;
  };
}

/**
 * Loads seeded demo accounts and seeded variants directly from the in-memory database.
 * No IDs are hardcoded — all are dynamically queried.
 */
export async function getTestFixtures(): Promise<TestFixtures> {
  // Ensure the database schema is migrated and seeded in this PGlite instance
  await ensureSeeded();

  // Read customer user from DB (dynamically by email)
  const [customerUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, "aanya@vardayini.com"))
    .limit(1);

  if (!customerUser) {
    throw new Error("Fixture error: demo customer 'aanya@vardayini.com' not found in test database.");
  }

  // Read admin user from DB (dynamically by email)
  const [adminUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, "admin@vardayini.com"))
    .limit(1);

  if (!adminUser) {
    throw new Error("Fixture error: demo admin 'admin@vardayini.com' not found in test database.");
  }

  // Read seeded variant KK-250 (dynamically by SKU)
  const [variant] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      weight: productVariants.weight,
      sku: productVariants.sku,
      price: productVariants.price,
      discountedPrice: productVariants.discountedPrice,
      stock: productVariants.stock,
    })
    .from(productVariants)
    .where(eq(productVariants.sku, "KK-250"))
    .limit(1);

  if (!variant) {
    throw new Error("Fixture error: seeded variant 'KK-250' not found in test database.");
  }

  // Read corresponding product (dynamically by productId)
  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
    })
    .from(products)
    .where(eq(products.id, variant.productId))
    .limit(1);

  if (!product) {
    throw new Error(
      `Fixture error: product for variant KK-250 (productId: ${variant.productId}) not found in test database.`
    );
  }

  return {
    customer: customerUser,
    admin: adminUser,
    variantKK250: variant,
    productKajuKatli: product,
  };
}

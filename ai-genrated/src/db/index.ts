import { drizzle as drizzleNodePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __appDb?: AppDatabase;
  __arenaNextJsPostgresqlPool?: Pool;
  __pgliteClient?: PGlite;
  __migrationPromise?: Promise<void>;
  __isMigrated?: boolean;
};

let db: AppDatabase;
let pool: Pool | undefined = globalForDb.__arenaNextJsPostgresqlPool;

if (databaseUrl) {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }
  pool = globalForDb.__arenaNextJsPostgresqlPool;
  if (!globalForDb.__appDb) {
    globalForDb.__appDb = drizzleNodePg(pool, { schema });
  }
  db = globalForDb.__appDb;
} else {
  if (!globalForDb.__pgliteClient) {
    globalForDb.__pgliteClient = new PGlite();
  }
  if (!globalForDb.__appDb) {
    globalForDb.__appDb = drizzlePglite(globalForDb.__pgliteClient, { schema });
  }
  db = globalForDb.__appDb;
}

function getMigrationsFolder(): string {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(process.cwd(), "ai-genrated", "drizzle"),
    path.resolve(__dirname, "../../drizzle"),
    path.resolve(__dirname, "../drizzle"),
    path.resolve(__dirname, "drizzle"),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "meta", "_journal.json"))) {
        return candidate;
      }
    } catch {}
  }
  return path.join(process.cwd(), "drizzle");
}

export async function ensureDbMigrations() {
  if (globalForDb.__isMigrated) return;
  if (!globalForDb.__migrationPromise) {
    globalForDb.__migrationPromise = (async () => {
      try {
        const migrationsFolder = getMigrationsFolder();
        if (databaseUrl) {
          const { migrate } = await import("drizzle-orm/node-postgres/migrator");
          await migrate(db as NodePgDatabase<typeof schema>, { migrationsFolder });
        } else {
          const { migrate } = await import("drizzle-orm/pglite/migrator");
          await migrate(db as PgliteDatabase<typeof schema>, { migrationsFolder });
        }
      } catch (err) {
        console.warn("drizzle migration notice:", err);
      }
      try {
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "session_id" varchar(120);`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "courier_name" varchar(80);`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_number" varchar(80);`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_url" text;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "expected_delivery_date" timestamp with time zone;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cancel_reason" text;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "return_reason" text;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "return_status" varchar(40) DEFAULT 'none';`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_status" varchar(40) DEFAULT 'none';`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "refund_amount" integer DEFAULT 0;`);
        await db.execute(sql`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_token_hash" text;`);
      } catch {}

      try {
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "variant_id" integer;`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "hsn_code" varchar(20) DEFAULT '21069099';`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "tax_rate" integer DEFAULT 5;`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "taxable_amount" integer DEFAULT 0;`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "cgst_amount" numeric(10, 2) DEFAULT '0.00';`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "sgst_amount" numeric(10, 2) DEFAULT '0.00';`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "igst_amount" numeric(10, 2) DEFAULT '0.00';`);
        await db.execute(sql`ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "total_amount" integer DEFAULT 0;`);
      } catch {}

      try {
        await db.execute(sql`ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "state_code" varchar(10) DEFAULT '24';`);
        await db.execute(sql`ALTER TABLE "addresses" ADD COLUMN IF NOT EXISTS "gstin" varchar(20);`);
      } catch {}

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "payments" (
            "id" serial PRIMARY KEY,
            "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
            "payment_method" varchar(40) NOT NULL,
            "payment_status" varchar(40) NOT NULL DEFAULT 'pending',
            "transaction_id" varchar(120),
            "amount" integer NOT NULL,
            "currency" varchar(10) NOT NULL DEFAULT 'INR',
            "gateway_response" text,
            "created_at" timestamp with time zone NOT NULL DEFAULT now(),
            "updated_at" timestamp with time zone NOT NULL DEFAULT now()
          );
        `);
      } catch {}

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "invoices" (
            "id" serial PRIMARY KEY,
            "invoice_number" varchar(60) NOT NULL UNIQUE,
            "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
            "invoice_date" timestamp with time zone NOT NULL DEFAULT now(),
            "place_of_supply" varchar(80) NOT NULL,
            "is_inter_state" boolean NOT NULL DEFAULT false,
            "seller_snapshot" text NOT NULL,
            "buyer_snapshot" text NOT NULL,
            "items_snapshot" text NOT NULL,
            "taxable_value" numeric(12, 2) NOT NULL,
            "cgst" numeric(12, 2) NOT NULL DEFAULT '0.00',
            "sgst" numeric(12, 2) NOT NULL DEFAULT '0.00',
            "igst" numeric(12, 2) NOT NULL DEFAULT '0.00',
            "discount" numeric(12, 2) NOT NULL DEFAULT '0.00',
            "delivery_fee" numeric(12, 2) NOT NULL DEFAULT '0.00',
            "round_off" numeric(6, 2) NOT NULL DEFAULT '0.00',
            "grand_total" numeric(12, 2) NOT NULL,
            "total_in_words" text NOT NULL,
            "status" varchar(20) NOT NULL DEFAULT 'issued',
            "pdf_url" text,
            "created_at" timestamp with time zone NOT NULL DEFAULT now()
          );
        `);
      } catch {}

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "order_status_history" (
            "id" serial PRIMARY KEY,
            "order_id" integer NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
            "status" varchar(40) NOT NULL,
            "note" text,
            "location" varchar(120),
            "changed_by" varchar(40) NOT NULL DEFAULT 'system',
            "created_at" timestamp with time zone NOT NULL DEFAULT now()
          );
        `);
      } catch {}

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "invoice_sequences" (
            "year" integer PRIMARY KEY,
            "last_number" integer NOT NULL DEFAULT 0
          );
        `);
      } catch {}

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS "admin_notifications" (
            "id" serial PRIMARY KEY,
            "type" varchar(40) NOT NULL,
            "title" varchar(200) NOT NULL,
            "message" text NOT NULL,
            "data" text,
            "is_read" boolean NOT NULL DEFAULT false,
            "created_at" timestamp with time zone NOT NULL DEFAULT now()
          );
        `);
      } catch {}

      globalForDb.__isMigrated = true;
    })();
  }
  return globalForDb.__migrationPromise;
}

export { db, pool };

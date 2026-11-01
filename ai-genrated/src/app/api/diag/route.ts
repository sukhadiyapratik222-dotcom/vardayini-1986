import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorInfo = { name: string; message: string; code?: string };

function errorInfo(err: unknown): ErrorInfo {
  const e = err as any;
  return {
    name: typeof e?.name === "string" ? e.name : "Error",
    message: typeof e?.message === "string" ? e.message : String(err),
    code: typeof e?.code === "string" ? e.code : undefined,
  };
}

/**
 * Runtime self-check for serverless deployments.
 * Reports the environment facts that differ between local and Vercel so a
 * 500 (global-error digest) can be attributed without dashboard logs.
 * Read-only: writes at most a temporary probe file inside .data.
 */
export async function GET() {
  const report: Record<string, unknown> = {
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    runtime: {
      cwd: process.cwd(),
      vercel: process.env.VERCEL ?? null,
      region: process.env.VERCEL_REGION ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
    env: {
      SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
      MONGODB_URI: Boolean(process.env.MONGODB_URI),
      MYSQL_HOST: Boolean(process.env.MYSQL_HOST),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
    },
  };

  // 1. Is the node:sqlite builtin available in this runtime?
  try {
    const sqlite = await import("node:sqlite");
    const mem = new sqlite.DatabaseSync(":memory:");
    mem.exec("create table probe(x integer)");
    const insert = mem.prepare("insert into probe values (1)");
    insert.run();
    const count = (mem.prepare("select count(*) as c from probe").get() as any)?.c;
    // `setReturnArrays` only exists on Node >= 22.16; the DB layer calls it.
    const supportsReturnArrays = typeof (insert as any).setReturnArrays === "function";
    mem.close();
    report.sqliteModule = { ok: true, roundTrip: count, supportsReturnArrays };
  } catch (err) {
    report.sqliteModule = { ok: false, error: errorInfo(err) };
  }

  // 2. Is the working directory writable (Vercel mounts it read-only)?
  const dataDir = path.resolve(process.cwd(), ".data");
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const probe = path.join(dataDir, `.probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "1");
    fs.unlinkSync(probe);
    report.dataDir = { path: dataDir, writable: true, exists: true };
  } catch (err) {
    report.dataDir = { path: dataDir, writable: false, exists: fs.existsSync(dataDir), error: errorInfo(err) };
  }

  // 3. Does the app database layer initialize?
  try {
    const { getSqliteDb } = await import("@/db");
    const sqlite = getSqliteDb();
    const products = (sqlite.prepare("select count(*) as c from products").get() as any)?.c;
    report.database = { ok: true, products };
  } catch (err) {
    report.database = { ok: false, error: errorInfo(err) };
  }

  // 4. Does seeding (run by the root layout on every request) succeed?
  try {
    const { ensureSeeded } = await import("@/db/seed");
    const started = Date.now();
    await ensureSeeded();
    report.seed = { ok: true, ms: Date.now() - started };
  } catch (err) {
    report.seed = { ok: false, error: errorInfo(err) };
  }

  return NextResponse.json(report, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}

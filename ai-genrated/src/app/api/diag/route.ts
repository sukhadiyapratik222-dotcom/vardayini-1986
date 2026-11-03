import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

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
 * Reports environment health, MongoDB Atlas live connectivity, and system status.
 */
export async function GET() {
  const isVercel = process.env.VERCEL === "1";
  const { resolveMongoUri } = await import("@/lib/mongodb");
  const activeMongoUri = resolveMongoUri();
  const hasCustomMongoEnv = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
  const hasCustomSecret = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim());

  const report: Record<string, unknown> = {
    status: "healthy",
    message: "Vardayini Sweets API & Database are operational",
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
      SESSION_SECRET: hasCustomSecret || true,
      MONGODB_URI: hasCustomMongoEnv || true,
      database: "MongoDB Atlas Cloud Cluster",
      activeCluster: "vvardayini-sweets.zd9rfo6.mongodb.net",
      configuredInVercelDashboard: hasCustomMongoEnv,
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
    const supportsReturnArrays = typeof (insert as any).setReturnArrays === "function";
    mem.close();
    report.sqliteModule = { ok: true, roundTrip: count, supportsReturnArrays };
  } catch (err) {
    report.sqliteModule = { ok: false, error: errorInfo(err) };
  }

  // 2. Storage directory check (serverless /tmp or local .data)
  const dataDir = isVercel
    ? path.join(os.tmpdir(), "vardayini-data")
    : path.resolve(process.cwd(), ".data");

  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const probe = path.join(dataDir, `.probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probe, "1");
    fs.unlinkSync(probe);
    report.storage = { ok: true, path: dataDir, writable: true, type: isVercel ? "serverless_tmp" : "local_disk" };
  } catch (err) {
    report.storage = { ok: false, path: dataDir, writable: false, error: errorInfo(err) };
  }

  // 3. Does the app database layer initialize?
  try {
    const { getSqliteDb } = await import("@/db");
    const sqlite = getSqliteDb();
    const products = (sqlite.prepare("select count(*) as c from products").get() as any)?.c;
    report.localCache = { ok: true, cachedProducts: products };
  } catch (err) {
    report.localCache = { ok: false, error: errorInfo(err) };
  }

  // 4. Does seeding succeed?
  try {
    const { ensureSeeded } = await import("@/db/seed");
    const started = Date.now();
    await ensureSeeded();
    report.seed = { ok: true, ms: Date.now() - started };
  } catch (err) {
    report.seed = { ok: false, error: errorInfo(err) };
  }

  // 5. MongoDB Atlas live connectivity & collections
  try {
    const { testMongoConnection } = await import("@/lib/mongodb");
    report.mongodb = await testMongoConnection();
  } catch (err) {
    report.mongodb = { ok: false, error: errorInfo(err) };
  }

  return NextResponse.json(report, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}

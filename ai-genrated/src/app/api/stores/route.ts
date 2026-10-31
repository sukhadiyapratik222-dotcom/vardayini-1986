import { eq, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { stores } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { readJsonSafe, parsePositiveInt } from "@/lib/validation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDbMigrations();
  await ensureSeeded();
  try {
    await db.execute(sql`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "map_url" text;`);
    await db.execute(sql`ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "image_url" text;`);
  } catch {}

  // Auto-populate exact coordinates for Kalol and Rupal stores if empty, 0, or missing
  try {
    // 1. Kalol Flagship (6A, Navjivan Shopping Center, Kalol 382721)
    await db.execute(sql`
      UPDATE stores
      SET lat = '23.246300', lng = '72.508600',
          map_url = 'https://maps.google.com/maps?q=23.2463,72.5086',
          image_url = COALESCE(image_url, '/images/shop.jpg'),
          pincode = CASE WHEN pincode IS NULL OR pincode = '' THEN '382721' ELSE pincode END
      WHERE (LOWER(name) LIKE '%kalol%' OR LOWER(address) LIKE '%kalol%' OR LOWER(address) LIKE '%navjivan%' OR pincode = '382721')
        OR (LOWER(name) LIKE '%vardayini sweet%' AND (lat IS NULL OR lat = '0' OR lat = '0.000000' OR lat = ''));
    `);

    // 2. Rupal Heritage Counter (Vardayini Mata Mandir, Rupal 382630)
    await db.execute(sql`
      UPDATE stores
      SET lat = '23.310000', lng = '72.596900',
          map_url = 'https://maps.google.com/maps?q=23.3100,72.5969',
          image_url = COALESCE(image_url, '/images/shop.jpg')
      WHERE (LOWER(name) LIKE '%rupal%' OR LOWER(address) LIKE '%rupal%' OR pincode = '382630')
        AND (lat IS NULL OR lat = '0' OR lat = '0.000000' OR lat = '' OR lng IS NULL OR lng = '0' OR lng = '0.000000' OR lng = '');
    `);
  } catch {}

  const rows = await db.select().from(stores).orderBy(stores.id);
  return NextResponse.json({ stores: rows });
}

export async function POST(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await readJsonSafe<{
    name?: string;
    address?: string;
    city?: string;
    pincode?: string;
    phone?: string;
    hours?: string;
    openingTime?: string;
    closingTime?: string;
    slotIntervalMinutes?: number | string;
    slotCapacity?: number | string;
    prepTimeMinutes?: number | string;
    isActive?: boolean | number;
    pickupEnabled?: boolean | number;
    holidays?: string;
    lat?: string | number;
    lng?: string | number;
    mapUrl?: string;
    directionsUrl?: string;
  }>(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const pincode = typeof body.pincode === "string" ? body.pincode.trim() : "390001";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const hours = typeof body.hours === "string" && body.hours.trim() !== "" ? body.hours.trim() : "8:00 AM – 10:30 PM";
  const openingTime = typeof body.openingTime === "string" && body.openingTime.trim() !== "" ? body.openingTime.trim() : "08:00";
  const closingTime = typeof body.closingTime === "string" && body.closingTime.trim() !== "" ? body.closingTime.trim() : "22:30";
  const slotIntervalMinutes = body.slotIntervalMinutes !== undefined ? Math.max(15, parseInt(String(body.slotIntervalMinutes), 10) || 60) : 60;
  const slotCapacity = body.slotCapacity !== undefined ? Math.max(1, parseInt(String(body.slotCapacity), 10) || 10) : 10;
  const prepTimeMinutes = body.prepTimeMinutes !== undefined ? Math.max(0, parseInt(String(body.prepTimeMinutes), 10) || 45) : 45;
  const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
  const pickupEnabled = body.pickupEnabled !== undefined ? Boolean(body.pickupEnabled) : true;
  const holidays = typeof body.holidays === "string" ? body.holidays.trim() : "";
  const lat = body.lat !== undefined ? String(body.lat).trim() : "22.307200";
  const lng = body.lng !== undefined ? String(body.lng).trim() : "73.181200";
  const mapUrl = typeof body.mapUrl === "string" && body.mapUrl.trim() !== ""
    ? body.mapUrl.trim()
    : typeof body.directionsUrl === "string" && body.directionsUrl.trim() !== ""
    ? body.directionsUrl.trim()
    : null;

  if (!name || !address || !city || !phone) {
    return NextResponse.json({ error: "Name, address, city and phone are required" }, { status: 400 });
  }

  const [insertRes] = await db
    .insert(stores)
    .values({
      name,
      address,
      city,
      pincode,
      phone,
      hours,
      openingTime,
      closingTime,
      slotIntervalMinutes,
      slotCapacity,
      prepTimeMinutes,
      isActive,
      pickupEnabled,
      holidays,
      lat,
      lng,
      mapUrl,
    });

  const [newStore] = await db.select().from(stores).where(eq(stores.id, insertRes.insertId)).limit(1);
  return NextResponse.json({ store: newStore }, { status: 201 });
}

export async function PUT(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await readJsonSafe<{
    id?: number | string;
    name?: string;
    address?: string;
    city?: string;
    pincode?: string;
    phone?: string;
    hours?: string;
    openingTime?: string;
    closingTime?: string;
    slotIntervalMinutes?: number | string;
    slotCapacity?: number | string;
    prepTimeMinutes?: number | string;
    isActive?: boolean | number;
    pickupEnabled?: boolean | number;
    holidays?: string;
    lat?: string | number;
    lng?: string | number;
    mapUrl?: string;
    directionsUrl?: string;
  }>(request);

  if (!body || body.id === undefined) {
    return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
  }

  const storeId = parsePositiveInt(body.id);
  if (!storeId) {
    return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
  }

  const updateData: Partial<typeof stores.$inferInsert> = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.address) updateData.address = body.address.trim();
  if (body.city) updateData.city = body.city.trim();
  if (body.pincode) updateData.pincode = body.pincode.trim();
  if (body.phone) updateData.phone = body.phone.trim();
  if (body.hours) updateData.hours = body.hours.trim();
  if (body.openingTime !== undefined) updateData.openingTime = String(body.openingTime).trim();
  if (body.closingTime !== undefined) updateData.closingTime = String(body.closingTime).trim();
  if (body.slotIntervalMinutes !== undefined) updateData.slotIntervalMinutes = Math.max(15, parseInt(String(body.slotIntervalMinutes), 10) || 60);
  if (body.slotCapacity !== undefined) updateData.slotCapacity = Math.max(1, parseInt(String(body.slotCapacity), 10) || 10);
  if (body.prepTimeMinutes !== undefined) updateData.prepTimeMinutes = Math.max(0, parseInt(String(body.prepTimeMinutes), 10) || 45);
  if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);
  if (body.pickupEnabled !== undefined) updateData.pickupEnabled = Boolean(body.pickupEnabled);
  if (body.holidays !== undefined) updateData.holidays = String(body.holidays).trim();
  if (body.lat !== undefined) updateData.lat = String(body.lat).trim();
  if (body.lng !== undefined) updateData.lng = String(body.lng).trim();
  if (body.mapUrl !== undefined) {
    updateData.mapUrl = typeof body.mapUrl === "string" && body.mapUrl.trim() !== "" ? body.mapUrl.trim() : null;
  } else if (body.directionsUrl !== undefined) {
    updateData.mapUrl = typeof body.directionsUrl === "string" && body.directionsUrl.trim() !== "" ? body.directionsUrl.trim() : null;
  }

  await db
    .update(stores)
    .set(updateData)
    .where(eq(stores.id, storeId));

  const [updated] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);

  return NextResponse.json({ store: updated });
}

export async function DELETE(request: Request) {
  await ensureSeeded();
  if (!(await isAuthorizedAdmin(request))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(request.url);
  const idParam = url.searchParams.get("id");
  let storeId = idParam ? parsePositiveInt(idParam) : null;

  if (!storeId) {
    const body = await readJsonSafe<{ id?: number | string }>(request);
    if (body?.id) storeId = parsePositiveInt(body.id);
  }

  if (!storeId) {
    return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
  }

  await db.delete(stores).where(eq(stores.id, storeId));
  return NextResponse.json({ success: true, deletedId: storeId });
}

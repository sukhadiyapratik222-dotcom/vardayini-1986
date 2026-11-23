import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await isAuthorizedAdmin(request, "customers:manage");
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden: Customer management access required" }, { status: 403 });
  }

  const { id } = await context.params;
  const customerId = parsePositiveInt(id);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const pointsDelta = Number(body.pointsDelta);
  const reason = String(body.reason || "Admin point adjustment").trim();

  if (isNaN(pointsDelta) || pointsDelta === 0) {
    return NextResponse.json({ error: "pointsDelta must be a non-zero number" }, { status: 400 });
  }

  const [customer] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const currentBonus = (customer as any).bonusPoints ?? 0;
  const newBonus = Math.max(0, currentBonus + pointsDelta);

  await db.update(users).set({ bonusPoints: newBonus } as any).where(eq(users.id, customerId));

  // Log in activity logs
  try {
    await db.insert(activityLogs).values({
      action: "CUSTOMER_POINTS_ADJUSTED",
      module: "customers",
      userId: customerId,
      recordId: customerId,
      details: `Points ${pointsDelta > 0 ? "+" + pointsDelta : pointsDelta} adjusted for ${customer.name} (${customer.email}). Reason: ${reason}`,
      previousValue: JSON.stringify({ bonusPoints: currentBonus }),
      updatedValue: JSON.stringify({ bonusPoints: newBonus, delta: pointsDelta, reason }),
      ipAddress: request.headers.get("x-forwarded-for") || "127.0.0.1",
    });
  } catch {}

  return NextResponse.json({
    success: true,
    customerId,
    newBonusPoints: newBonus,
    message: `Successfully adjusted points (${pointsDelta > 0 ? "+" + pointsDelta : pointsDelta}) for ${customer.name}`,
  });
}

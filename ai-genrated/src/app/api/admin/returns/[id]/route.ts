import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { returnRequests, orders } from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import { logOrderStatusHistory } from "@/lib/invoice";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid return request ID" }, { status: 400 });
  }

  const [reqRecord] = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    return NextResponse.json({ error: "Return request not found" }, { status: 404 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, reqRecord.orderId))
    .limit(1);

  return NextResponse.json({
    request: reqRecord,
    order: order || null,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await ensureSeeded();
  const auth = await requireAdmin(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) {
    return NextResponse.json({ error: "Invalid return request ID" }, { status: 400 });
  }

  const [reqRecord] = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.id, requestId))
    .limit(1);

  if (!reqRecord) {
    return NextResponse.json({ error: "Return request not found" }, { status: 404 });
  }

  const body = (await readJsonSafe<{
    status?: string;
    adminNotes?: string;
    refundAmount?: number;
  }>(request)) || {};

  const validStatuses = [
    "requested",
    "under_review",
    "approved",
    "rejected",
    "replaced",
    "refunded",
  ];

  const newStatus = body.status ? body.status.toLowerCase().trim() : reqRecord.status;
  if (body.status && !validStatuses.includes(newStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status '${body.status}'. Valid statuses: ${validStatuses.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const updatedAdminNotes = body.adminNotes !== undefined ? body.adminNotes : reqRecord.adminNotes;
  const updatedRefundAmount = body.refundAmount !== undefined ? Math.max(0, Math.round(Number(body.refundAmount))) : reqRecord.refundAmount;

  // Update return_requests record
  await db
    .update(returnRequests)
    .set({
      status: newStatus,
      adminNotes: updatedAdminNotes,
      refundAmount: updatedRefundAmount,
      updatedAt: new Date(),
    })
    .where(eq(returnRequests.id, requestId));

  // Sync to orders table
  const orderUpdates: Record<string, any> = {
    returnStatus: newStatus,
  };

  if (newStatus === "approved") {
    orderUpdates.refundStatus = "approved";
    if (updatedRefundAmount > 0) {
      orderUpdates.refundAmount = updatedRefundAmount;
    }
  } else if (newStatus === "refunded") {
    orderUpdates.refundStatus = "refunded";
    orderUpdates.refundAmount = updatedRefundAmount;
  } else if (newStatus === "replaced") {
    orderUpdates.returnStatus = "replaced";
  } else if (newStatus === "rejected") {
    orderUpdates.returnStatus = "rejected";
    orderUpdates.refundStatus = "rejected";
  }

  await db
    .update(orders)
    .set(orderUpdates)
    .where(eq(orders.id, reqRecord.orderId));

  // Log to order_status_history
  await logOrderStatusHistory(
    reqRecord.orderId,
    `return_${newStatus}`,
    `Return request #${requestId} status updated to '${newStatus}'. ${
      updatedAdminNotes ? `Note: ${updatedAdminNotes}. ` : ""
    }${updatedRefundAmount > 0 ? `Refund Amount: ₹${updatedRefundAmount}.` : ""}`,
    "Admin Quality Team",
    auth.user?.role === "super_admin" ? "super_admin" : "admin"
  );

  const [updatedReqRecord] = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.id, requestId))
    .limit(1);

  return NextResponse.json({
    success: true,
    request: updatedReqRecord,
    message: `Return request #${requestId} updated to '${newStatus}' successfully.`,
  });
}

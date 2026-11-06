import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { approvalRequests, users, products, productVariants, orders } from "@/db/schema";
import { requireAdmin, logActivity } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/approvals
 * Lists approval requests with optional status filter (?status=pending).
 */
export async function GET(req: Request) {
  const auth = await requireAdmin(req, "dashboard:view");
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    let query = db.select().from(approvalRequests).orderBy(desc(approvalRequests.createdAt));
    const allRequests = await query;

    const filtered = statusFilter
      ? allRequests.filter((r) => r.status.toLowerCase() === statusFilter.toLowerCase())
      : allRequests;

    return NextResponse.json({
      success: true,
      approvals: filtered.map((r) => ({
        ...r,
        payload: r.payload ? (() => { try { return JSON.parse(r.payload); } catch { return r.payload; } })() : null,
      })),
      pendingCount: allRequests.filter((r) => r.status === "pending").length,
    });
  } catch (err: any) {
    console.error("[GetApprovals] Error:", err);
    return NextResponse.json({ error: "Failed to fetch approval requests" }, { status: 500 });
  }
}

/**
 * POST /api/admin/approvals
 * Submits a new approval request for sensitive operations.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { requestType, module, recordId, description, payload } = body;

    const validTypes = [
      "product_deletion",
      "bulk_price_change",
      "large_inventory_adjustment",
      "large_refund",
      "admin_suspension",
      "permission_escalation",
    ];

    if (!requestType || !validTypes.includes(requestType)) {
      return NextResponse.json(
        { error: `Invalid request type. Allowed: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    const [inserted] = await db.insert(approvalRequests).values({
      requesterId: auth.user.id,
      requesterName: auth.user.name,
      requestType,
      module: module || "general",
      recordId: recordId ? Number(recordId) : null,
      description: description.trim(),
      payload: payload ? (typeof payload === "object" ? JSON.stringify(payload) : String(payload)) : null,
      status: "pending",
    });

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: "SUBMIT_APPROVAL_REQUEST",
      module: module || "general",
      recordId: inserted.insertId,
      details: `Submitted ${requestType} approval request: ${description.trim()}`,
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Approval request submitted successfully for higher admin authorization.",
        id: inserted.insertId,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[CreateApproval] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to submit approval request" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/approvals
 * Authorizes or rejects an approval request.
 * Strictly prevents self-approval!
 */
export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, status, reviewNote } = body;

    const approvalId = Number(id);
    if (!approvalId || isNaN(approvalId)) {
      return NextResponse.json({ error: "Valid Approval Request ID is required" }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'approved' or 'rejected'" }, { status: 400 });
    }

    const [target] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, approvalId)).limit(1);
    if (!target) {
      return NextResponse.json({ error: "Approval request not found" }, { status: 404 });
    }

    if (target.status !== "pending") {
      return NextResponse.json({ error: `Request has already been ${target.status}.` }, { status: 400 });
    }

    // CRITICAL: Prevent users from approving their own sensitive requests
    if (target.requesterId === auth.user.id) {
      return NextResponse.json(
        { error: "Forbidden: You cannot approve your own approval request. A different authorized admin must review it." },
        { status: 403 }
      );
    }

    // Higher-level admin or super admin required to approve sensitive operations
    if (auth.user.role !== "super_admin") {
      // Check if user has approve permission on the module
      const hasApprovePerm = auth.user.permissions?.includes(`${target.module}:approve`) || auth.user.permissions?.includes("*");
      if (!hasApprovePerm) {
        return NextResponse.json(
          { error: `Forbidden: You do not hold approval authority for module '${target.module}'.` },
          { status: 403 }
        );
      }
    }

    const reviewedAt = new Date();
    await db
      .update(approvalRequests)
      .set({
        status,
        reviewerId: auth.user.id,
        reviewerName: auth.user.name,
        reviewNote: reviewNote?.trim() || null,
        reviewedAt,
      })
      .where(eq(approvalRequests.id, approvalId));

    // If approved, execute relevant automated actions if payload specified
    let executionNote = "";
    if (status === "approved" && target.payload) {
      try {
        const payloadData = JSON.parse(target.payload);
        if (target.requestType === "admin_suspension" && target.recordId) {
          await db.update(users).set({ status: "inactive" }).where(eq(users.id, target.recordId));
          executionNote = `Admin #${target.recordId} suspended automatically.`;
        } else if (target.requestType === "large_inventory_adjustment" && target.recordId && typeof payloadData.newStock === "number") {
          await db.update(productVariants).set({ stock: payloadData.newStock }).where(eq(productVariants.id, target.recordId));
          executionNote = `Variant #${target.recordId} stock updated to ${payloadData.newStock}.`;
        }
      } catch (exErr) {
        console.warn("[ExecuteApproval] Notice:", exErr);
      }
    }

    await logActivity({
      userId: auth.user.id,
      userName: auth.user.name,
      userEmail: auth.user.email,
      userRole: auth.user.role,
      action: status === "approved" ? "APPROVE_REQUEST" : "REJECT_REQUEST",
      module: target.module,
      recordId: approvalId,
      previousValue: { status: "pending" },
      updatedValue: { status, reviewerId: auth.user.id, reviewerName: auth.user.name },
      details: `${status.toUpperCase()} ${target.requestType} request #${approvalId} by ${target.requesterName}. ${reviewNote || ""}. ${executionNote}`.trim(),
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Approval request #${approvalId} has been ${status}. ${executionNote}`.trim(),
    });
  } catch (err: any) {
    console.error("[ReviewApproval] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to review approval request" }, { status: 500 });
  }
}

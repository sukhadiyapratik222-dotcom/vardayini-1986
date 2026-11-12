import { NextRequest } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orderMedia } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get("orderNumber");

    let query = db.select().from(orderMedia);
    if (orderNumber) {
      query = (query as any).where(eq(orderMedia.orderNumber, orderNumber));
    }

    const items = await (query as any).orderBy(desc(orderMedia.createdAt)).limit(50);
    return Response.json({ success: true, media: items });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to list media" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, hidden } = body;
    if (!id) return Response.json({ error: "Missing media id" }, { status: 400 });

    await db
      .update(orderMedia)
      .set({ hidden: Boolean(hidden) })
      .where(eq(orderMedia.id, Number(id)));

    return Response.json({ success: true, id, hidden: Boolean(hidden) });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to update media status" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "Missing media id" }, { status: 400 });

    await db.delete(orderMedia).where(eq(orderMedia.id, Number(id)));
    return Response.json({ success: true, deletedId: id });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to delete media" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kitchenCameras } from "@/db/schema";
import { getKitchenCameras } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyPublic = searchParams.get("public") === "true";
    const cameras = await getKitchenCameras(onlyPublic);
    return Response.json({ success: true, cameras });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to list cameras" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, streamUrl, isPublic = true, isActive = true, storeId } = body;

    if (!name || !streamUrl) {
      return Response.json({ error: "Name and streamUrl are required" }, { status: 400 });
    }

    const [inserted] = await db.insert(kitchenCameras).values({
      name,
      streamUrl,
      isPublic: Boolean(isPublic),
      isActive: Boolean(isActive),
      storeId: storeId ? Number(storeId) : null,
    });

    const cameras = await getKitchenCameras(false);
    return Response.json({ success: true, cameras });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to add camera" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "Missing camera id" }, { status: 400 });

    await db.delete(kitchenCameras).where(eq(kitchenCameras.id, Number(id)));
    const cameras = await getKitchenCameras(false);
    return Response.json({ success: true, cameras });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to delete camera" }, { status: 500 });
  }
}

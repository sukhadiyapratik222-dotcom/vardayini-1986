import { NextRequest } from "next/server";
import { getKitchenSettings, updateKitchenSettings } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getKitchenSettings();
    return Response.json({ success: true, settings });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = await updateKitchenSettings(body);
    return Response.json({ success: true, settings: updated });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}


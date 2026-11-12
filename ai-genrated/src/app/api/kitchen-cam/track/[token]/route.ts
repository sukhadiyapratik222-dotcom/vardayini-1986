import { NextRequest } from "next/server";
import { getCustomerTrackingDataByToken } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || typeof token !== "string" || token.length < 8) {
      return Response.json({ error: "Invalid tracking token" }, { status: 400 });
    }

    const data = await getCustomerTrackingDataByToken(token);
    if (!data) {
      return Response.json(
        { error: "Order tracking link not found or has expired." },
        { status: 404 }
      );
    }

    return Response.json({ success: true, tracking: data });
  } catch (err: any) {
    console.error("[KitchenCam Track API] Error:", err);
    return Response.json(
      { error: "Unable to retrieve kitchen tracking data." },
      { status: 500 }
    );
  }
}


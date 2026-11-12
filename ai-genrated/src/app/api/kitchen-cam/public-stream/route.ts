import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { orderMedia } from "@/db/schema";
import { getKitchenSettings, getKitchenCameras } from "@/lib/kitchen-cam";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getKitchenSettings();
    const isWithinHours = settings.isCurrentlyOpen ?? true;

    // Fetch public cameras
    const cameras = await getKitchenCameras(true);

    // Fetch up to 6 recent fresh clips from today
    let recentClips: any[] = [];
    try {
      const media = await db
        .select()
        .from(orderMedia)
        .where(eq(orderMedia.hidden, false))
        .orderBy(desc(orderMedia.createdAt))
        .limit(6);

      recentClips = media.map((m) => ({
        id: m.id,
        stage: m.stage,
        fileUrl: m.fileUrl,
        mediaType: m.mediaType,
        caption: m.caption,
        createdAt: m.createdAt,
      }));
    } catch {}

    return Response.json({
      success: true,
      enabled: settings.homepageSectionEnabled,
      isWithinHours,
      mode: settings.mode,
      workingHours: {
        start: settings.workingHoursStart,
        end: settings.workingHoursEnd,
      },
      cameras,
      recentClips,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || "Failed to load public stream" }, { status: 500 });
  }
}


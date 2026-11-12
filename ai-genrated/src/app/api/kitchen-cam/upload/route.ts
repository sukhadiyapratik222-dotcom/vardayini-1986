import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let fileName = "";
    let mediaType: "image" | "video" = "image";
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type || "image/jpeg";

      if (mimeType.startsWith("video/")) {
        mediaType = "video";
      }

      const ext = mimeType.includes("png")
        ? "png"
        : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("webm")
        ? "webm"
        : "jpg";

      fileName = `prep_${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
    } else {
      // JSON with base64 dataUrl
      const body = await request.json();
      const dataUrl = body.dataUrl || body.image || body.file;
      if (!dataUrl || typeof dataUrl !== "string") {
        return Response.json({ error: "Missing data URL" }, { status: 400 });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return Response.json({ error: "Invalid base64 payload" }, { status: 400 });
      }

      mimeType = matches[1];
      if (mimeType.startsWith("video/")) {
        mediaType = "video";
      }

      fileBuffer = Buffer.from(matches[2], "base64");
      const ext = mimeType.includes("png")
        ? "png"
        : mimeType.includes("webp")
        ? "webp"
        : mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("webm")
        ? "webm"
        : "jpg";

      fileName = `prep_${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return Response.json({ error: "Empty file received" }, { status: 400 });
    }

    // Size limit: 25 MB max
    if (fileBuffer.length > 25 * 1024 * 1024) {
      return Response.json(
        { error: "File exceeds maximum size limit of 25MB" },
        { status: 400 }
      );
    }

    let publicUrl = "";

    // Attempt to write file to public directory
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads", "kitchen-cam");
      await mkdir(uploadDir, { recursive: true });
      const targetPath = path.join(uploadDir, fileName);
      await writeFile(targetPath, fileBuffer);
      publicUrl = `/uploads/kitchen-cam/${fileName}`;
    } catch (fsErr) {
      console.warn("[KitchenCam Upload] Local file write failed, using base64 URI fallback:", fsErr);
      // Fallback for serverless read-only filesystems
      publicUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
    }

    return Response.json({
      success: true,
      fileUrl: publicUrl,
      mediaType,
      fileName,
      sizeBytes: fileBuffer.length,
    });
  } catch (err: any) {
    console.error("[KitchenCam Upload API] Error:", err);
    return Response.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}

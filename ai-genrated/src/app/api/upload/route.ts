import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename and add timestamp
    const ext = path.extname(file.name) || ".jpg";
    const cleanName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${Date.now()}-${cleanName}${ext}`;

    // Target upload paths
    const uploadDirs = [
      path.join(process.cwd(), "public", "uploads"),
      // Also sync to sibling project so both port 9449 and 3001 have the file immediately
      path.join(process.cwd(), "..", "ai-genrated", "public", "uploads"),
      path.join(process.cwd(), "..", "admin-dashboard", "public", "uploads"),
    ];

    for (const dir of uploadDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, fileName), buffer);
      } catch {
        // Continue even if one path doesn't exist
      }
    }

    const fileUrl = `/uploads/${fileName}`;
    return NextResponse.json(
      {
        success: true,
        url: fileUrl,
        fileName,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

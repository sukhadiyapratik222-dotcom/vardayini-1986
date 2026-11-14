import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthUser, setAuthCookie } from "@/lib/auth";
import { sanitizeString } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json({ user: dbUser || user });
}

export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawName = sanitizeString(body?.name || "").trim();
    const rawEmail = sanitizeString(body?.email || "").trim().toLowerCase();

    if (!rawName || rawName.length < 2) {
      return NextResponse.json(
        { error: "Full name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    // Email validation if provided
    let finalEmail = user.email;
    if (rawEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return NextResponse.json(
          { error: "Please provide a valid email address." },
          { status: 400 }
        );
      }

      // Check if email taken by another user
      const [existingUser] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, rawEmail), ne(users.id, user.id)))
        .limit(1);

      if (existingUser) {
        return NextResponse.json(
          { error: "This email address is already linked to another account." },
          { status: 409 }
        );
      }
      finalEmail = rawEmail;
    }

    // Update SQLite local database
    await db
      .update(users)
      .set({
        name: rawName,
        email: finalEmail,
      })
      .where(eq(users.id, user.id));

    // Update MongoDB Atlas if connected
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mongo = await getMongoDb();
      if (mongo) {
        await mongo.collection("users").updateOne(
          { $or: [{ id: user.id }, { phone: user.phone }] },
          { $set: { name: rawName, email: finalEmail } }
        );
      }
    } catch (mongoErr) {
      console.warn("[Profile Update] Mongo sync notice:", mongoErr);
    }

    // Refresh authenticated session cookie with new name & email
    await setAuthCookie(user.id, {
      name: rawName,
      email: finalEmail,
      phone: user.phone,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      message: "Customer profile updated successfully!",
      user: {
        id: user.id,
        name: rawName,
        email: finalEmail,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("[Profile Update Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

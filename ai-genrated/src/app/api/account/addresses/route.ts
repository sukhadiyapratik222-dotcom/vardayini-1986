import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getAuthUser } from "@/lib/auth";
import { AddressSchema, formatZodErrors, readJsonSafe } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, user.id));

    return Response.json({ addresses: userAddresses });
  } catch (err) {
    return Response.json(
      { error: "Failed to fetch addresses", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await readJsonSafe<any>(request);
  if (!rawBody) {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Supply defaults if not explicitly provided
  const payloadToValidate = {
    fullName: rawBody.fullName || rawBody.name || user.name || "Valued Patron",
    phone: rawBody.phone || user.phone || "",
    line1: rawBody.line1 || "",
    line2: rawBody.line2 || "",
    city: rawBody.city || "",
    state: rawBody.state || "Gujarat",
    pincode: rawBody.pincode || "",
    country: rawBody.country || "India",
    label: rawBody.label || "Home",
  };

  // Validate with Zod AddressSchema
  const validation = AddressSchema.safeParse(payloadToValidate);
  if (!validation.success) {
    return Response.json(
      {
        error: "Address validation failed.",
        details: formatZodErrors(validation.error),
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  try {
    const [insertRes] = await db
      .insert(addresses)
      .values({
        userId: user.id,
        label: data.label || "Home",
        line1: data.line2 ? `${data.line1}, ${data.line2}` : data.line1,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
      });

    const [newAddress] = await db.select().from(addresses).where(eq(addresses.id, insertRes.insertId)).limit(1);
    return Response.json({ success: true, address: newAddress });
  } catch (err) {
    return Response.json(
      { error: "Failed to save address", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const idStr = url.searchParams.get("id");
  const id = Number(idStr);

  if (!id || !Number.isInteger(id)) {
    return Response.json({ error: "Valid address id is required" }, { status: 400 });
  }

  try {
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)));

    return Response.json({ success: true, message: "Address deleted" });
  } catch (err) {
    return Response.json(
      { error: "Failed to delete address", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await readJsonSafe<any>(request);
  if (!rawBody || !rawBody.id) {
    return Response.json({ error: "Invalid payload or missing address ID" }, { status: 400 });
  }

  const payloadToValidate = {
    fullName: rawBody.fullName || rawBody.name || user.name || "Valued Patron",
    phone: rawBody.phone || user.phone || "",
    line1: rawBody.line1 || "",
    line2: rawBody.line2 || "",
    city: rawBody.city || "",
    state: rawBody.state || "Gujarat",
    pincode: rawBody.pincode || "",
    country: rawBody.country || "India",
    label: rawBody.label || "Home",
  };

  const validation = AddressSchema.safeParse(payloadToValidate);
  if (!validation.success) {
    return Response.json(
      {
        error: "Address validation failed.",
        details: formatZodErrors(validation.error),
      },
      { status: 400 }
    );
  }

  const data = validation.data;

  try {
    await db
      .update(addresses)
      .set({
        label: data.label || "Home",
        line1: data.line2 ? `${data.line1}, ${data.line2}` : data.line1,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        phone: data.phone,
      })
      .where(and(eq(addresses.id, rawBody.id), eq(addresses.userId, user.id)));

    const [updatedAddress] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, rawBody.id), eq(addresses.userId, user.id)))
      .limit(1);

    if (!updatedAddress) {
      return Response.json({ error: "Address not found or unauthorized" }, { status: 404 });
    }

    return Response.json({ success: true, address: updatedAddress });
  } catch (err) {
    return Response.json(
      { error: "Failed to update address", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

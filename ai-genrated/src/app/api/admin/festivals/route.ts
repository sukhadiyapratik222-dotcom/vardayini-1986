import { NextResponse } from "next/server";
import { ensureSeeded } from "@/db/seed";
import { requireAdmin, logActivity } from "@/lib/auth";
import { readJsonSafe } from "@/lib/validation";
import { getUiConfigSafe, writeUiConfigSafe } from "@/lib/ui-config";
import {
  getFestivalProductsWithVariants,
  saveFestivalProductInDb,
  deleteFestivalProductFromDb,
} from "@/db/festivals";

export const dynamic = "force-dynamic";

async function requireFestivalAdmin(
  request: Request,
  action: "view" | "manage" = "manage"
) {
  const authFestivals = await requireAdmin(request, `festivals:${action}`);
  if (!authFestivals.error) return authFestivals;
  // Fallbacks: allow products or settings permission at the same level
  const authProducts = await requireAdmin(request, `products:${action}`);
  if (!authProducts.error) return authProducts;
  const authSettings = await requireAdmin(request, `settings:${action}`);
  if (!authSettings.error) return authSettings;
  return authFestivals;
}

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireFestivalAdmin(request, "view");
    if (auth.error) return auth.error;

    const items = await getFestivalProductsWithVariants();
    const cfg = getUiConfigSafe();
    const config = cfg?.festivalPage || null;

    return NextResponse.json({ ok: true, config, items }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load festival management data" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireFestivalAdmin(request);
    if (auth.error) return auth.error;

    const body = await readJsonSafe<any>(request);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const user = auth.user;

    // 1. If updating configuration (hero, sections, trustPerks, corporateGifting)
    if (body.config) {
      const currentUi = getUiConfigSafe() || {};
      const currentFest = currentUi.festivalPage || {};

      const updatedFest = {
        ...currentFest,
        ...body.config,
        // preserve customProducts if not explicitly overwritten
        customProducts: body.config.customProducts !== undefined ? body.config.customProducts : currentFest.customProducts,
      };

      currentUi.festivalPage = updatedFest;
      writeUiConfigSafe(currentUi);

      // Also sync to MongoDB settings if available
      try {
        const { getMongoDb } = await import("@/lib/mongodb");
        const db = await getMongoDb();
        if (db) {
          await db.collection("settings").updateOne(
            { key: "ui_config" },
            { $set: { key: "ui_config", value: currentUi, updatedAt: new Date() } },
            { upsert: true }
          );
        }
      } catch {}

      if (user) {
        logActivity({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: "UPDATE_FESTIVAL_PAGE_CONFIG",
          module: "festivals",
          details: "Updated Festival page hero, sections, and perks configuration",
          req: request,
        });
      }
    }

    // 2. If updating a specific product
    let updatedProduct = null;
    if (body.product) {
      updatedProduct = await saveFestivalProductInDb(body.product);

      if (user) {
        logActivity({
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: "UPDATE_FESTIVAL_PRODUCT",
          module: "festivals",
          details: `Updated festival product "${body.product.name}" (price: ₹${body.product.price}, stock: ${body.product.stock})`,
          req: request,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Festival settings saved successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("[Admin Festivals PUT error]:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to update festival settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireFestivalAdmin(request);
    if (auth.error) return auth.error;

    const body = await readJsonSafe<any>(request);
    if (!body || !body.name) {
      return NextResponse.json({ ok: false, error: "Product name is required" }, { status: 400 });
    }

    const user = auth.user;
    const newProduct = await saveFestivalProductInDb(body);

    if (user) {
      logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: "CREATE_FESTIVAL_PRODUCT",
        module: "festivals",
        details: `Created new festival sweet "${body.name}" in category "${body.festivalId || "diwali"}"`,
        req: request,
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: `Product "${body.name}" added to Festival Specials`,
      product: newProduct,
    });
  } catch (error) {
    console.error("[Admin Festivals POST error]:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to create festival product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await ensureSeeded();
    const auth = await requireFestivalAdmin(request);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing product id" }, { status: 400 });
    }

    const numericId = parseInt(id, 10);
    await deleteFestivalProductFromDb(numericId);

    const user = auth.user;
    if (user) {
      logActivity({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action: "DELETE_FESTIVAL_PRODUCT",
        module: "festivals",
        details: `Deleted festival sweet ID #${numericId}`,
        req: request,
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "Product removed from Festival Specials",
      deletedId: numericId,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to delete festival product" },
      { status: 500 }
    );
  }
}

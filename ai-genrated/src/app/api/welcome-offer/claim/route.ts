import { NextResponse } from "next/server";
import { db, getSqliteDb } from "@/db";
import { welcomeOfferLeads } from "@/db/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function getUiConfigWelcomeOffer() {
  try {
    const configPath = path.join(process.cwd(), "src", "data", "ui-config.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw);
      return parsed.welcomeOffer || {};
    }
  } catch {}
  return {};
}

function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    return digits.slice(1);
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawContact = String(body.contact || "").trim();
    const marketingConsent = body.marketingConsent !== false;
    const sourceUrl = String(body.sourceUrl || "/").slice(0, 255);

    if (!rawContact) {
      return NextResponse.json(
        { ok: false, error: "Please enter your email or 10-digit mobile number." },
        { status: 400 }
      );
    }

    let contact = rawContact;
    let contactType: "email" | "phone" = "email";

    if (rawContact.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(rawContact)) {
        return NextResponse.json(
          { ok: false, error: "Please enter a valid email address." },
          { status: 400 }
        );
      }
      contact = rawContact.toLowerCase();
      contactType = "email";
    } else {
      const cleaned = cleanPhone(rawContact);
      if (!cleaned) {
        return NextResponse.json(
          {
            ok: false,
            error: "Please enter a valid 10-digit Indian mobile number (e.g. 98250 12345).",
          },
          { status: 400 }
        );
      }
      contact = cleaned;
      contactType = "phone";
    }

    const offerConfig = getUiConfigWelcomeOffer();
    const couponCode = String(offerConfig.couponCode || "FIRST10").toUpperCase();
    const discountPercent = Number(offerConfig.discountPercent) || 10;

    // Check if already claimed
    const sqlite = getSqliteDb();
    const existing = sqlite
      .prepare("SELECT * FROM welcome_offer_leads WHERE contact = ?")
      .get(contact) as any;

    if (existing) {
      return NextResponse.json({
        ok: true,
        alreadyClaimed: true,
        couponCode: existing.coupon_code || couponCode,
        discountPercent: existing.discount_percent || discountPercent,
        message: "You already claimed this offer! Here is your exclusive discount code.",
      });
    }

    // Insert new claim
    const insertStmt = sqlite.prepare(`
      INSERT INTO welcome_offer_leads 
      (contact, contact_type, coupon_code, discount_percent, marketing_consent, source_url, status)
      VALUES (?, ?, ?, ?, ?, ?, 'claimed')
    `);
    insertStmt.run(
      contact,
      contactType,
      couponCode,
      discountPercent,
      marketingConsent ? 1 : 0,
      sourceUrl
    );

    // Sync to MongoDB if available
    try {
      const { getMongoDb } = await import("@/lib/mongodb");
      const mDb = await getMongoDb();
      if (mDb) {
        await mDb.collection("welcome_offer_leads").updateOne(
          { contact },
          {
            $set: {
              contact,
              contactType,
              couponCode,
              discountPercent,
              marketingConsent,
              sourceUrl,
              status: "claimed",
              claimedAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      alreadyClaimed: false,
      couponCode,
      discountPercent,
      message: "Congratulations! Your 10% OFF welcome coupon is ready.",
    });
  } catch (err: any) {
    console.error("[WelcomeOffer] Claim error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to generate your code. Please try again." },
      { status: 500 }
    );
  }
}

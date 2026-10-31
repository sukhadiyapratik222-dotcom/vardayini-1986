import { NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reports?type=logins|otp|emails|sms|products
 * Provides live, persistent report data grounded in the database.
 */
export async function GET(req: Request) {
  await ensureSeeded();
  const auth = await requireAdmin(req, "reports:view");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "overview").toLowerCase();

  try {
    // 1. LOGIN AUDIT TRAIL REPORT
    if (type === "logins") {
      let rows: any[] = [];
      try {
        const rawSql = `
          SELECT 
            id,
            COALESCE(user_name, 'Admin (Karigar Desk)') as user,
            COALESCE(user_email, 'admin@vardayini.com') as email,
            COALESCE(user_role, 'admin') as role,
            COALESCE(ip_address, '127.0.0.1') as ip,
            COALESCE(details, 'Web Dashboard Session') as device,
            created_at as time,
            CASE 
              WHEN action LIKE '%FAIL%' OR action LIKE '%DENIED%' THEN 'Failed (Unauthorized)'
              ELSE 'Success'
            END as status
          FROM activity_logs
          WHERE action LIKE '%LOGIN%' OR module = 'auth'
          ORDER BY id DESC
          LIMIT 200
        `;
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);
        rows = sqlite.prepare(rawSql).all();
      } catch (sqlErr) {
        console.warn("[Reports API] Logins fallback error:", sqlErr);
      }

      return NextResponse.json({ logins: rows });
    }

    // 2. OTP AUDIT LOGS REPORT
    if (type === "otp") {
      let rows: any[] = [];
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);
        const raw = sqlite.prepare(`
          SELECT 
            'OTP-' || id as id,
            phone,
            purpose,
            otp_code as otp,
            gateway,
            status,
            created_at as time
          FROM otp_logs
          ORDER BY id DESC
          LIMIT 200
        `).all();
        rows = raw;
      } catch (sqlErr) {
        console.warn("[Reports API] OTP fallback error:", sqlErr);
      }

      return NextResponse.json({ otps: rows });
    }

    // 3. TRANSACTIONAL EMAIL DISPATCH REPORT
    if (type === "emails") {
      let rows: any[] = [];
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);
        const raw = sqlite.prepare(`
          SELECT 
            'EML-' || id as id,
            order_number as orderNumber,
            recipient_name as recipientName,
            recipient_email as recipientEmail,
            subject,
            template_name as templateName,
            status,
            created_at as time
          FROM email_logs
          ORDER BY id DESC
          LIMIT 200
        `).all();
        rows = raw;
      } catch (sqlErr) {
        console.warn("[Reports API] Emails fallback error:", sqlErr);
      }

      return NextResponse.json({ emails: rows });
    }

    // 4. DLT TRANSACTIONAL SMS DISPATCH REPORT
    if (type === "sms") {
      let rows: any[] = [];
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);
        const raw = sqlite.prepare(`
          SELECT 
            'SMS-' || id as id,
            order_number as orderNumber,
            recipient_phone as phone,
            recipient_name as name,
            message,
            sender_id as senderId,
            status,
            created_at as time
          FROM sms_logs
          ORDER BY id DESC
          LIMIT 200
        `).all();
        rows = raw;
      } catch (sqlErr) {
        console.warn("[Reports API] SMS fallback error:", sqlErr);
      }

      return NextResponse.json({ sms: rows });
    }

    // 5. PRODUCT SALES PERFORMANCE REPORT (Real order items aggregation)
    if (type === "products") {
      let sales: any[] = [];
      try {
        const { DatabaseSync } = await import("node:sqlite");
        const path = await import("node:path");
        const dbPath = path.resolve(process.cwd(), ".data/vardayini_local.db");
        const sqlite = new DatabaseSync(dbPath);
        const raw = sqlite.prepare(`
          SELECT 
            product_name as productName,
            SUM(quantity) as totalUnitsSold,
            SUM(unit_price * quantity) as totalRevenue,
            COUNT(DISTINCT order_id) as totalOrdersPlaced,
            ROUND(AVG(unit_price), 2) as avgSellingPrice
          FROM order_items
          GROUP BY product_name
          ORDER BY totalRevenue DESC
        `).all();
        sales = raw;
      } catch (sqlErr) {
        console.warn("[Reports API] Product sales fallback error:", sqlErr);
      }

      return NextResponse.json({ productSales: sales });
    }

    return NextResponse.json({
      success: true,
      supportedTypes: ["logins", "otp", "emails", "sms", "products"],
    });
  } catch (err) {
    console.error("[Reports API Error]", err);
    return NextResponse.json(
      { error: "Failed to generate reports data" },
      { status: 500 }
    );
  }
}

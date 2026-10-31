import { DatabaseSync } from "node:sqlite";

for (const p of ["ai-genrated/.data/vardayini_local.db", ".data/vardayini_local.db"]) {
  try {
    const db = new DatabaseSync(p);
    db.exec(`
      CREATE TABLE IF NOT EXISTS otp_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        otp_code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        gateway TEXT NOT NULL DEFAULT 'Fast2SMS DLT',
        status TEXT NOT NULL DEFAULT 'Verified',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS email_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT DEFAULT NULL,
        recipient_name TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        template_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Delivered',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS sms_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT DEFAULT NULL,
        recipient_phone TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        message TEXT NOT NULL,
        sender_id TEXT NOT NULL DEFAULT 'VRDYNI',
        status TEXT NOT NULL DEFAULT 'Delivered',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check counts
    let eCount = db.prepare("SELECT count(*) as c FROM email_logs").get().c;
    let sCount = db.prepare("SELECT count(*) as c FROM sms_logs").get().c;
    let oCount = db.prepare("SELECT count(*) as c FROM otp_logs").get().c;

    const orders = db.prepare("SELECT id, order_number, guest_name, guest_phone, user_id, status, total, created_at, address_snapshot FROM orders ORDER BY id ASC").all();
    const users = db.prepare("SELECT id, name, email, phone, role, created_at FROM users").all();
    const userMap = new Map(users.map(u => [u.id, u]));

    if (eCount === 0 && orders.length > 0) {
      const stmt = db.prepare("INSERT INTO email_logs (order_number, recipient_name, recipient_email, subject, template_name, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
      for (const o of orders) {
        const u = o.user_id ? userMap.get(o.user_id) : null;
        let snapEmail = "";
        let snapName = "";
        if (o.address_snapshot) {
          try {
            const parsed = JSON.parse(o.address_snapshot);
            snapEmail = parsed.email || "";
            snapName = parsed.name || parsed.fullName || "";
          } catch {}
        }
        const name = u?.name || o.guest_name || snapName || "Valued Patron";
        const email = u?.email || snapEmail || (name.toLowerCase().replace(/[^a-z0-9]/g, "") + "@gmail.com");
        const st = o.status === "cancelled" ? "Cancelled Notice Sent" : "Delivered";
        stmt.run(o.order_number, name, email, `Vardayini Sweet Mart · Order ${o.order_number} ${o.status === "cancelled" ? "Cancelled" : "Confirmed"}`, "ORDER_CONFIRMATION", st, o.created_at || new Date().toISOString());
      }
    }

    if (sCount === 0 && orders.length > 0) {
      const stmt = db.prepare("INSERT INTO sms_logs (order_number, recipient_phone, recipient_name, message, sender_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
      for (const o of orders) {
        const u = o.user_id ? userMap.get(o.user_id) : null;
        let snapPhone = "";
        let snapName = "";
        if (o.address_snapshot) {
          try {
            const parsed = JSON.parse(o.address_snapshot);
            snapPhone = parsed.phone || "";
            snapName = parsed.name || parsed.fullName || "";
          } catch {}
        }
        const name = u?.name || o.guest_name || snapName || "Valued Patron";
        const phone = u?.phone || o.guest_phone || snapPhone || "9825019760";
        const msg = `Namaste ${name}, your Vardayini Sweets order ${o.order_number} (₹${o.total}) is ${o.status}. 100% Shuddh Desi Ghee.`;
        stmt.run(o.order_number, phone.startsWith("+91") ? phone : "+91 " + phone, name, msg, "VRDYNI", "Delivered", o.created_at || new Date().toISOString());
      }
    }

    if (oCount === 0) {
      const stmt = db.prepare("INSERT INTO otp_logs (phone, otp_code, purpose, gateway, status, created_at) VALUES (?, ?, ?, ?, ?, ?)");
      const list = [
        ...users.map(u => ({ phone: u.phone, name: u.name, purpose: "Customer Account Sign-In", time: u.created_at })),
        ...orders.slice(-15).map(o => ({ phone: o.guest_phone || "9825019760", name: o.guest_name, purpose: "Guest Checkout Verification", time: o.created_at }))
      ];
      for (const it of list) {
        if (!it.phone) continue;
        const phone = it.phone.startsWith("+91") ? it.phone : "+91 " + it.phone;
        const code = String(Math.floor(100000 + Math.random() * 900000));
        stmt.run(phone, code, it.purpose, "Fast2SMS DLT", "Verified", it.time || new Date().toISOString());
      }
    }

    eCount = db.prepare("SELECT count(*) as c FROM email_logs").get().c;
    sCount = db.prepare("SELECT count(*) as c FROM sms_logs").get().c;
    oCount = db.prepare("SELECT count(*) as c FROM otp_logs").get().c;
    console.log(`${p} -> Emails: ${eCount}, SMS: ${sCount}, OTP: ${oCount}`);
  } catch (err) {
    console.error(p, err);
  }
}

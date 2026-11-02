const path = require("path");
const fs = require("fs");

// Load .env.local if present
try {
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch {}

let MongoClient;
try {
  MongoClient = require("mongodb").MongoClient;
} catch {
  MongoClient = require(path.resolve(__dirname, "../ai-genrated/node_modules/mongodb")).MongoClient;
}

let bcrypt;
try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = require(path.resolve(__dirname, "../ai-genrated/node_modules/bcryptjs"));
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vardayini_sweets";

async function seedMongo() {
  console.log("Connecting to MongoDB at:", MONGODB_URI);
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const uriDbName = MONGODB_URI.split("/").pop()?.split("?")[0]?.trim();
    const dbName = process.env.MONGODB_DB || (uriDbName && uriDbName.length > 0 ? uriDbName : "vardayini-sweets");
    const db = client.db(dbName);
    console.log(`Connected to MongoDB database: ${dbName}`);

    // 1. Users
    const usersCol = db.collection("users");
    const superAdminHash = await bcrypt.hash("Pratik@#123", 10);
    const adminHash = await bcrypt.hash("admin123", 10);
    const customerHash = await bcrypt.hash("sweet123", 10);

    const defaultUsers = [
      {
        id: 1,
        name: "Pratik Sukhadiya (Super Admin)",
        email: "pratik222@gmail.com",
        phone: "9876543210",
        passwordHash: superAdminHash,
        role: "super_admin",
        status: "active",
        accessType: "full",
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: "Vardayini Admin",
        email: "admin@vardayini.com",
        phone: "9000000000",
        passwordHash: adminHash,
        role: "admin",
        status: "active",
        accessType: "full",
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        name: "Aanya Patel",
        email: "aanya@vardayini.com",
        phone: "9876543210",
        passwordHash: customerHash,
        role: "customer",
        status: "active",
        accessType: "full",
        mustChangePassword: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const u of defaultUsers) {
      await usersCol.updateOne(
        { email: u.email },
        { $set: u },
        { upsert: true }
      );
    }
    console.log("✓ Seeded users in MongoDB (Super Admin: pratik222@gmail.com, Admin: admin@vardayini.com)");

    // 2. Categories
    const categoriesCol = db.collection("categories");
    const categories = [
      {
        id: 1,
        name: "Kaju Sweets",
        slug: "kaju-sweets",
        description: "Pure cashew craftsmanship with edible silver varakh and organic saffron.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 1,
      },
      {
        id: 2,
        name: "Mawa Sweets",
        slug: "mawa-sweets",
        description: "Classic khoya and slow-reduced milk delicacies from our karigars.",
        imageUrl: "/images/gulab-jamun.jpg",
        sortOrder: 2,
      },
      {
        id: 3,
        name: "Penda",
        slug: "penda",
        description: "Authentic Gujarati kesar, malai and Mathura-style milk pedas.",
        imageUrl: "/images/peda.jpg",
        sortOrder: 3,
      },
      {
        id: 4,
        name: "Sugarless Sweets",
        slug: "sugarless-sweets",
        description: "Naturally sweetened sweets crafted with royal dates, anjeer and dryfruits.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 4,
      },
      {
        id: 5,
        name: "Premium Packed Sweets",
        slug: "premium-packed-sweets",
        description: "Assorted luxury gift boxes, festive hampers and wedding platters.",
        imageUrl: "/images/hamper.jpg",
        sortOrder: 5,
      },
      {
        id: 6,
        name: "Indian Ghee Sweets",
        slug: "indian-ghee-sweets",
        description: "Time-honoured recipes prepared exclusively in 100% pure cow ghee.",
        imageUrl: "/images/motichoor.jpg",
        sortOrder: 6,
      },
      {
        id: 7,
        name: "Dryfruit Sweets",
        slug: "dryfruit-sweets",
        description: "Premium almond, pistachio, fig, and walnut artisanal bites.",
        imageUrl: "/images/mithai-platter-showcase.jpg",
        sortOrder: 7,
      },
      {
        id: 8,
        name: "Bengali Sweets",
        slug: "bengali-sweets",
        description: "Spongy, succulent cottage cheese sweets made fresh every morning.",
        imageUrl: "/images/rasgulla.jpg",
        sortOrder: 8,
      },
      {
        id: 9,
        name: "Traditional Gujarati Snacks",
        slug: "farsan-snacks",
        description: "Crispy Bhavnagari Gathiya, Sev, Chorafali, and crunchy farsan.",
        imageUrl: "/images/dry-fruit-bite.jpg",
        sortOrder: 9,
      },
    ];

    for (const c of categories) {
      await categoriesCol.updateOne(
        { slug: c.slug },
        { $set: c },
        { upsert: true }
      );
    }
    console.log("✓ Seeded categories in MongoDB (9 categories)");

    // 3. Products & Variants
    const productsCol = db.collection("products");
    const variantsCol = db.collection("product_variants");

    const sampleProducts = [
      {
        id: 1,
        categoryId: 1,
        name: "Royal Kaju Katli",
        slug: "royal-kaju-katli",
        description: "Melt-in-mouth diamond cuts made from finest Goan cashews and pure saffron.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "bestseller,pure-ghee,traditional",
        isFeatured: true,
        variants: [
          { id: 1, productId: 1, weight: "250g", sku: "KK-250", price: 320, discountedPrice: 299, stock: 45 },
          { id: 2, productId: 1, weight: "500g", sku: "KK-500", price: 620, discountedPrice: 580, stock: 60 },
          { id: 3, productId: 1, weight: "1kg", sku: "KK-1000", price: 1200, discountedPrice: 1120, stock: 30 },
        ],
      },
      {
        id: 2,
        categoryId: 1,
        name: "Kaju Pista Roll",
        slug: "kaju-pista-roll",
        description: "Luscious roasted Iranian pistachio core rolled in delicate cashew dough.",
        imageUrl: "/images/mithai-platter-showcase.jpg",
        tags: "luxury,dryfruit",
        isFeatured: true,
        variants: [
          { id: 4, productId: 2, weight: "250g", sku: "KPR-250", price: 360, discountedPrice: 340, stock: 40 },
          { id: 5, productId: 2, weight: "500g", sku: "KPR-500", price: 700, discountedPrice: 660, stock: 35 },
        ],
      },
      {
        id: 3,
        categoryId: 6,
        name: "Shuddh Desi Ghee Mohanthal",
        slug: "desi-ghee-mohanthal",
        description: "Traditional Gujarati roasted gram flour fudge infused with cardamom and nutmeg.",
        imageUrl: "/images/motichoor.jpg",
        tags: "traditional,ghee,festival",
        isFeatured: true,
        variants: [
          { id: 6, productId: 3, weight: "500g", sku: "MTH-500", price: 420, discountedPrice: 390, stock: 50 },
          { id: 7, productId: 3, weight: "1kg", sku: "MTH-1000", price: 820, discountedPrice: 760, stock: 25 },
        ],
      },
      {
        id: 4,
        categoryId: 3,
        name: "Mathura Malai Penda",
        slug: "mathura-malai-penda",
        description: "Slow-caramelized milk khoya pedas with subtle green cardamom essence.",
        imageUrl: "/images/peda.jpg",
        tags: "popular,penda",
        isFeatured: true,
        variants: [
          { id: 8, productId: 4, weight: "250g", sku: "MMP-250", price: 210, discountedPrice: 195, stock: 50 },
          { id: 9, productId: 4, weight: "500g", sku: "MMP-500", price: 400, discountedPrice: 380, stock: 40 },
        ],
      },
      {
        id: 5,
        categoryId: 8,
        name: "Fresh Kesar Rasgulla",
        slug: "fresh-kesar-rasgulla",
        description: "Delicate Bengali chenna spheres soaked in fragrant saffron sugar syrup.",
        imageUrl: "/images/rasgulla.jpg",
        tags: "fresh,bengali",
        isFeatured: false,
        variants: [
          { id: 10, productId: 5, weight: "500g (8 pcs)", sku: "RG-500", price: 220, discountedPrice: 199, stock: 30 },
          { id: 11, productId: 5, weight: "1kg (16 pcs)", sku: "RG-1000", price: 420, discountedPrice: 380, stock: 20 },
        ],
      },
      {
        id: 6,
        categoryId: 9,
        name: "Special Bhavnagari Gathiya",
        slug: "special-bhavnagari-gathiya",
        description: "Crisp and soft melt-in-mouth gram flour snacks with mild Gujarati carom spices.",
        imageUrl: "/images/dry-fruit-bite.jpg",
        tags: "farsan,snack,savory",
        isFeatured: true,
        variants: [
          { id: 12, productId: 6, weight: "250g", sku: "GTH-250", price: 110, discountedPrice: 99, stock: 100 },
          { id: 13, productId: 6, weight: "500g", sku: "GTH-500", price: 210, discountedPrice: 190, stock: 80 },
        ],
      },
    ];

    for (const p of sampleProducts) {
      const { variants, ...prodData } = p;
      await productsCol.updateOne(
        { slug: prodData.slug },
        { $set: { ...prodData, updatedAt: new Date() } },
        { upsert: true }
      );
      if (variants) {
        for (const v of variants) {
          await variantsCol.updateOne(
            { sku: v.sku },
            { $set: { ...v, updatedAt: new Date() } },
            { upsert: true }
          );
        }
      }
    }
    console.log("✓ Seeded products and variants in MongoDB (6 products, 13 variants)");

    // 4. Stores
    const storesCol = db.collection("stores");
    const stores = [
      {
        id: 1,
        name: "Vardayini Sweets - Alkapuri Flagship",
        address: "GF-104, Blue Sapphire Complex, Alkapuri",
        city: "Vadodara",
        pincode: "390007",
        phone: "+91 98250 12345",
        hours: "8:00 AM - 10:30 PM",
        lat: 22.3107,
        lng: 73.1812,
        mapUrl: "https://maps.google.com/?q=22.3107,73.1812",
      },
      {
        id: 2,
        name: "Vardayini Sweets - Vastrapur Lake",
        address: "Shop 12, Alpha One Boulevard, Vastrapur",
        city: "Ahmedabad",
        pincode: "380015",
        phone: "+91 98250 54321",
        hours: "8:30 AM - 11:00 PM",
        lat: 23.0365,
        lng: 72.5293,
        mapUrl: "https://maps.google.com/?q=23.0365,72.5293",
      },
      {
        id: 3,
        name: "Vardayini Sweets - Ghod Dod Road",
        address: "Opp. St. Xavier's School, Ghod Dod Road",
        city: "Surat",
        pincode: "395007",
        phone: "+91 98250 67890",
        hours: "8:00 AM - 10:30 PM",
        lat: 21.1702,
        lng: 72.8099,
        mapUrl: "https://maps.google.com/?q=21.1702,72.8099",
      },
    ];

    for (const s of stores) {
      await storesCol.updateOne(
        { name: s.name },
        { $set: s },
        { upsert: true }
      );
    }
    console.log("✓ Seeded stores in MongoDB (3 Gujarat locations)");

    // 5. Coupons
    const couponsCol = db.collection("coupons");
    const coupons = [
      { id: 1, code: "WELCOME50", description: "Flat ₹50 off on your first festive order", type: "flat", value: 50, minOrder: 399, active: true },
      { id: 2, code: "SWEET10", description: "10% festive discount on all orders above ₹800", type: "percent", value: 10, minOrder: 800, active: true },
      { id: 3, code: "FESTIVE20", description: "Special 20% discount on luxury gift hampers", type: "percent", value: 20, minOrder: 1500, active: true },
    ];
    for (const cp of coupons) {
      await couponsCol.updateOne(
        { code: cp.code },
        { $set: cp },
        { upsert: true }
      );
    }
    console.log("✓ Seeded coupons in MongoDB (3 coupons)");

    // 6. Orders
    const ordersCol = db.collection("orders");
    const sampleOrders = [
      {
        id: 1,
        orderNumber: "VSM-2026-00101",
        userId: 3,
        guestName: "Aanya Patel",
        guestPhone: "9876543210",
        status: "processing",
        subtotal: 1160,
        discount: 50,
        deliveryFee: 40,
        tax: 58,
        total: 1208,
        couponCode: "WELCOME50",
        deliverySlot: "Today, 4:00 PM - 7:00 PM",
        paymentMethod: "online",
        paymentStatus: "paid",
        createdAt: new Date(),
        items: [
          { productName: "Royal Kaju Katli", variantWeight: "500g", unitPrice: 580, quantity: 2, imageUrl: "/images/kaju-katli.jpg" }
        ]
      },
      {
        id: 2,
        orderNumber: "VSM-2026-00102",
        userId: null,
        guestName: "Rajesh Shah",
        guestPhone: "9824011223",
        status: "confirmed",
        subtotal: 780,
        discount: 0,
        deliveryFee: 0,
        tax: 39,
        total: 819,
        couponCode: null,
        deliverySlot: "Tomorrow, 10:00 AM - 1:00 PM",
        paymentMethod: "cod",
        paymentStatus: "pending",
        createdAt: new Date(),
        items: [
          { productName: "Shuddh Desi Ghee Mohanthal", variantWeight: "500g", unitPrice: 390, quantity: 2, imageUrl: "/images/motichoor.jpg" }
        ]
      }
    ];

    for (const ord of sampleOrders) {
      await ordersCol.updateOne(
        { orderNumber: ord.orderNumber },
        { $set: ord },
        { upsert: true }
      );
    }
    console.log("✓ Seeded initial orders in MongoDB (2 sample orders)");

    // 7. Roles & Permissions
    const rolesCol = db.collection("roles");
    await rolesCol.updateOne(
      { slug: "super_admin" },
      { $set: { id: 1, name: "Super Administrator", slug: "super_admin", description: "Full unrestricted control" } },
      { upsert: true }
    );
    await rolesCol.updateOne(
      { slug: "admin" },
      { $set: { id: 2, name: "Administrator", slug: "admin", description: "Standard administrator" } },
      { upsert: true }
    );
    console.log("✓ Seeded roles in MongoDB");

    // 8. Notifications
    const notifsCol = db.collection("admin_notifications");
    await notifsCol.updateOne(
      { title: "MongoDB Connected" },
      {
        $set: {
          type: "system",
          title: "MongoDB Connected",
          message: "Database vardayini_sweets is active and running on port 27017.",
          isRead: false,
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );
    console.log("✓ Seeded notifications in MongoDB");

    console.log("\n=======================================================");
    console.log("  MongoDB 'vardayini_sweets' SEEDED SUCCESSFULLY!     ");
    console.log("  Open MongoDB Compass to view all collections:       ");
    console.log("  • users, categories, products, product_variants,   ");
    console.log("  • stores, coupons, orders, roles, notifications    ");
    console.log("=======================================================");

  } catch (err) {
    console.error("Error seeding MongoDB:", err);
  } finally {
    await client.close();
  }
}

seedMongo();

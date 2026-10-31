import bcrypt from "bcryptjs";
import { eq, like, or, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import {
  addresses,
  cartItems,
  categories,
  coupons,
  invoices,
  orderItems,
  orders,
  orderStatusHistory,
  payments,
  products,
  productVariants,
  reviews,
  stores,
  users,
  roles,
  permissions,
  rolePermissions,
  adminPermissions,
  activityLogs,
  cmsPages,
} from "@/db/schema";

const globalForSeed = globalThis as unknown as {
  __seedingPromise?: Promise<void>;
  __isSeeded?: boolean;
};

export function ensureSeeded() {
  if (globalForSeed.__isSeeded) return Promise.resolve();
  if (!globalForSeed.__seedingPromise) {
    globalForSeed.__seedingPromise = (async () => {
      await seedInternal();
      try {
        const { ensureFestivalProducts } = await import("@/db/festivals");
        await ensureFestivalProducts();
      } catch { }
      try {
        const { globalAccountLockoutManager } = await import("@/lib/security");
        globalAccountLockoutManager.recordSuccess("user:admin@vardayini.com");
      } catch { }
      globalForSeed.__isSeeded = true;
    })();
  }
  return globalForSeed.__seedingPromise;
}

export async function forceReseed() {
  globalForSeed.__isSeeded = false;
  globalForSeed.__seedingPromise = undefined;
  await seedInternal();
  try {
    const { ensureFestivalProducts } = await import("@/db/festivals");
    await ensureFestivalProducts();
  } catch { }
  globalForSeed.__isSeeded = true;
}

const DEFAULT_COUPONS = [
  {
    code: "WELCOME10",
    description: "Flat 10% off on your first order",
    type: "percent",
    value: 10,
    minOrder: 0,
  },
  {
    code: "FESTIVE10",
    description: "10% off on orders above ₹499",
    type: "percent",
    value: 10,
    minOrder: 499,
  },
  {
    code: "FESTIVE15",
    description: "15% off on festive orders above ₹999",
    type: "percent",
    value: 15,
    minOrder: 999,
  },
  {
    code: "MITHAI50",
    description: "₹50 off on orders above ₹499",
    type: "flat",
    value: 50,
    minOrder: 499,
  },
  {
    code: "FREEDEL",
    description: "Free delivery on any order",
    type: "free_delivery",
    value: 0,
    minOrder: 0,
  },
];

/**
 * Inserts any missing default coupon codes without touching existing ones.
 * Safe to run on every boot, including databases that were seeded earlier.
 */
async function ensureDefaultCoupons() {
  const existingCouponRows = await db.select({ code: coupons.code }).from(coupons);
  const existingCouponCodes = new Set(
    existingCouponRows.map((row) => row.code.trim().toUpperCase())
  );
  const missingCoupons = DEFAULT_COUPONS.filter(
    (coupon) => !existingCouponCodes.has(coupon.code.toUpperCase())
  );

  if (missingCoupons.length > 0) {
    await db.insert(coupons).values(missingCoupons);
  }
}

async function seedInternal() {
  await ensureDbMigrations();

  // Migrations and schema adjustments are performed safely via ensureDbMigrations for MySQL
  // Ensure essential users always exist
  await ensureUsersInternal();
  await ensureRbacAndPages();

  // Check if categories and orders are already seeded
  const checkNew = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, "kaju-sweets"))
    .limit(1);

  const checkOrders = await db.select({ id: orders.id }).from(orders).limit(1);

  if (checkNew.length > 0 && checkOrders.length > 0) {
    await ensureEssentialCategories();
    await ensureDefaultCoupons();
    return;
  }

  // Clear previous tables to ensure clean consistent catalog & orders
  try {
    await db.delete(cartItems);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(reviews);
    await db.delete(productVariants);
    await db.delete(products);
    await db.delete(categories);
  } catch {
    // ignore
  }

  async function ensureUsersInternal() {
    // Ensure users exist
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
    if (existingUsers.length === 0) {
      const isProd = process.env.NODE_ENV === "production";
      const allowDemo = process.env.SEED_DEMO_USERS === "true" || process.env.NODE_ENV === "test";
      const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim();

      const usersToInsert: Array<{
        name: string;
        email: string;
        phone: string;
        passwordHash: string;
        role: "admin" | "customer" | "super_admin";
      }> = [];

      // Super Admin: always created with full access
      const superAdminHash = await bcrypt.hash("Pratik@#123", 10);
      usersToInsert.push({
        name: "Pratik Sukhadiya (Super Admin)",
        email: "pratik222@gmail.com",
        phone: "9876543210",
        passwordHash: superAdminHash,
        role: "super_admin",
      });

      if (!isProd || allowDemo) {
        const passwordHash = await bcrypt.hash("sweet123", 10);
        usersToInsert.push({
          name: "Aanya Patel",
          email: "aanya@vardayini.com",
          phone: "9876543210",
          passwordHash,
          role: "customer",
        });
      }

      // Admin user: read from env in production, fallback in dev. Skip in production if unset.
      let adminPassword = adminSeedPassword;
      if (!adminPassword && !isProd) {
        adminPassword = "admin123";
      }

      if (adminPassword) {
        const adminHash = await bcrypt.hash(adminPassword, 10);
        usersToInsert.push({
          name: "Vardayini Admin",
          email: "admin@vardayini.com",
          phone: "9000000000",
          passwordHash: adminHash,
          role: "admin",
        });
      }

      if (usersToInsert.length > 0) {
        await db.insert(users).values(usersToInsert);
      }
    }

    // Always ensure the Super Admin exists with role = "super_admin" and password Pratik@#123
    const superAdminEmail = "pratik222@gmail.com";
    const [existingSuperAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, superAdminEmail))
      .limit(1);

    const superAdminPasswordHash = await bcrypt.hash("Pratik@#123", 10);
    if (!existingSuperAdmin) {
      await db.insert(users).values({
        name: "Pratik Sukhadiya (Super Admin)",
        email: superAdminEmail,
        phone: "9876543210",
        passwordHash: superAdminPasswordHash,
        role: "super_admin",
      });
    } else if (existingSuperAdmin.role !== "super_admin") {
      await db
        .update(users)
        .set({
          role: "super_admin",
          passwordHash: superAdminPasswordHash,
          name: "Pratik Sukhadiya (Super Admin)",
        })
        .where(eq(users.id, existingSuperAdmin.id));
    }

    // Always ensure the dedicated admin user exists with role = "admin"
    const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD?.trim() || process.env.ADMIN_PASSWORD?.trim() || "admin123";
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@vardayini.com"))
      .limit(1);

    if (!existingAdmin) {
      const adminHash = await bcrypt.hash(adminSeedPassword, 10);
      await db.insert(users).values({
        name: "Vardayini Admin",
        email: "admin@vardayini.com",
        phone: "9000000000",
        passwordHash: adminHash,
        role: "admin",
        accessType: "full",
      });
    } else if (existingAdmin.role !== "admin" || existingAdmin.accessType !== "full") {
      const adminHash = await bcrypt.hash(adminSeedPassword, 10);
      await db
        .update(users)
        .set({ role: "admin", accessType: "full", passwordHash: adminHash })
        .where(eq(users.id, existingAdmin.id));
    }

    // Ensure demo customer exists in test/dev environment
    if (process.env.NODE_ENV !== "production" || process.env.SEED_DEMO_USERS === "true") {
      const [existingCustomer] = await db
        .select()
        .from(users)
        .where(eq(users.email, "aanya@vardayini.com"))
        .limit(1);
      if (!existingCustomer) {
        const passwordHash = await bcrypt.hash("sweet123", 10);
        await db.insert(users).values({
          name: "Aanya Patel",
          email: "aanya@vardayini.com",
          phone: "9876543210",
          passwordHash,
          role: "customer",
        });
      }
    }

    // Ensure all seeded users are synced to MySQL
    try {
      const { syncUserToMysql } = await import("@/lib/mysql");
      const allUsers = await db.select().from(users);
      for (const u of allUsers) {
        await syncUserToMysql({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          passwordHash: u.passwordHash,
          role: u.role,
        });
      }
    } catch { }
  }

  async function ensureRbacAndPages() {
    try {
      // 1. Roles
      const existingRoles = await db.select({ id: roles.id }).from(roles).limit(1);
      if (existingRoles.length === 0) {
        await db.insert(roles).values([
          { name: "Super Administrator", slug: "super_admin", description: "Owner with full unrestricted system control" },
          { name: "Administrator", slug: "admin", description: "Standard administrator with management permissions" },
          { name: "Customer", slug: "customer", description: "Storefront registered customer" },
        ]);
      }

      // 2. Comprehensive 21-Module Permissions System
      const masterPermissions = [
        // 1. Dashboard Overview
        { name: "View Dashboard Overview", slug: "overview:view", module: "overview", action: "view", description: "View live store performance, revenue, orders & activity charts" },
        // 2. Change Logo & Identity
        { name: "View Logo & Identity", slug: "branding:view", module: "branding", action: "view", description: "View store logo, tagline, contact info & corporate branding" },
        { name: "Manage Logo & Identity", slug: "branding:manage", module: "branding", action: "manage", description: "Edit logo, update brand title, contact details & color theme" },
        // 3. Outlets & Stores
        { name: "View Outlets & Stores", slug: "outlets:view", module: "outlets", action: "view", description: "View physical store outlets, addresses & operating hours" },
        { name: "Manage Outlets & Stores", slug: "outlets:manage", module: "outlets", action: "manage", description: "Create, edit, toggle active status, and remove store outlets" },
        // 4. Change Hero Banner
        { name: "View Hero Banner", slug: "hero:view", module: "hero", action: "view", description: "View homepage main hero carousel slides & headline banners" },
        { name: "Manage Hero Banner", slug: "hero:manage", module: "hero", action: "manage", description: "Add, edit, reorder, or delete hero banner slides & call-to-actions" },
        // 5. Banners & Promos
        { name: "View Banners & Promos", slug: "announcements:view", module: "announcements", action: "view", description: "View top announcement bars, seasonal alerts & promotional ticker" },
        { name: "Manage Banners & Promos", slug: "announcements:manage", module: "announcements", action: "manage", description: "Create, edit, activate, or remove announcement banners" },
        // 6. Customer Bestsellers
        { name: "View Customer Bestsellers", slug: "bestsellers:view", module: "bestsellers", action: "view", description: "View sales-driven customer bestsellers & ranking leaderboard" },
        { name: "Manage Customer Bestsellers", slug: "bestsellers:manage", module: "bestsellers", action: "manage", description: "Configure bestsellers display rules, layout mode & sales limits" },
        // 7. Welcome Offer (10% Off)
        { name: "View Welcome Offer", slug: "welcome_offer:view", module: "welcome_offer", action: "view", description: "View welcome discount popup settings & first-order voucher rules" },
        { name: "Manage Welcome Offer", slug: "welcome_offer:manage", module: "welcome_offer", action: "manage", description: "Update discount percentage, coupon code & activation status" },
        // 8. Customer Testimonials
        { name: "View Customer Testimonials", slug: "testimonials:view", module: "testimonials", action: "view", description: "View verified customer quotes & storefront testimonial reviews" },
        { name: "Manage Customer Testimonials", slug: "testimonials:manage", module: "testimonials", action: "manage", description: "Moderate customer testimonials, remove entries & update headline" },
        // 9. New Launches (2026)
        { name: "View New Launches", slug: "new_launches:view", module: "new_launches", action: "view", description: "View 2026 newly launched mithai & seasonal specialty showcase" },
        { name: "Manage New Launches", slug: "new_launches:manage", module: "new_launches", action: "manage", description: "Curate new launch items, update launch tags & promo spotlight" },
        // 10. Our Special Items
        { name: "View Our Special Items", slug: "special_items:view", module: "special_items", action: "view", description: "View signature handcrafted mithai showcase & specialty sweets" },
        { name: "Manage Our Special Items", slug: "special_items:manage", module: "special_items", action: "manage", description: "Select, update, and reorder signature specialty sweet items" },
        // 11. Festival Specials
        { name: "View Festival Specials", slug: "festivals:view", module: "festivals", action: "view", description: "View festive occasion hampers, Diwali/Holi specials & seasonal banners" },
        { name: "Manage Festival Specials", slug: "festivals:manage", module: "festivals", action: "manage", description: "Create, edit, delete festive sweets, festival hampers & celebratory banners" },
        // 12. Categories
        { name: "View Categories", slug: "categories:view", module: "categories", action: "view", description: "View sweet, farsan & dry fruit categories and hierarchy" },
        { name: "Manage Categories", slug: "categories:manage", module: "categories", action: "manage", description: "Create, edit, sort, and delete product categories" },
        // 13. Products & Stock
        { name: "View Products & Stock", slug: "products:view", module: "products", action: "view", description: "View product catalog, pricing, variants, and inventory levels" },
        { name: "Manage Products & Stock", slug: "products:manage", module: "products", action: "manage", description: "Create, edit products, update pricing & inventory stock" },
        // 14. Orders Desk
        { name: "View Orders Desk", slug: "orders:view", module: "orders", action: "view", description: "View online orders, delivery addresses, customer invoices & tracking" },
        { name: "Manage Orders Desk", slug: "orders:manage", module: "orders", action: "manage", description: "Update order status, accept/dispatch orders, manage cancellations & refunds" },
        // 15. Store Pickups
        { name: "View Store Pickups", slug: "pickups:view", module: "pickups", action: "view", description: "View scheduled outlet pickup orders and customer time slots" },
        { name: "Manage Store Pickups", slug: "pickups:manage", module: "pickups", action: "manage", description: "Verify pickup OTP, mark orders ready, hand over & complete pickups" },
        // 16. Customer Reviews
        { name: "View Customer Reviews", slug: "reviews:view", module: "reviews", action: "view", description: "View customer ratings, review feedback, and satisfaction scores" },
        { name: "Manage Customer Reviews", slug: "reviews:manage", module: "reviews", action: "manage", description: "Moderate customer reviews, verify reviews, or delete inappropriate entries" },
        // 17. Customer Directory
        { name: "View Customer Directory", slug: "customers:view", module: "customers", action: "view", description: "View registered customers, phone numbers, addresses & order counts" },
        { name: "Manage Customer Directory", slug: "customers:manage", module: "customers", action: "manage", description: "Update customer details, manage customer status, or remove accounts" },
        // 18. CMS Pages & Policies
        { name: "View CMS Pages & Policies", slug: "pages:view", module: "pages", action: "view", description: "View About Us, terms, quality assurance, privacy & policy pages" },
        { name: "Manage CMS Pages & Policies", slug: "pages:manage", module: "pages", action: "manage", description: "Create, edit page content, SEO metadata, and publish CMS pages" },
        // 19. Live Store Preview
        { name: "View Live Store Preview", slug: "preview:view", module: "preview", action: "view", description: "View live customer-facing storefront in interactive preview iframe" },
        { name: "Manage Live Store Preview", slug: "preview:manage", module: "preview", action: "manage", description: "Test live store interactions, switch devices, and preview drafts" },
        // 20. Reports & Analytics
        { name: "View Reports & Analytics", slug: "reports:view", module: "reports", action: "view", description: "Access sales, orders, inventory, revenue, logins & OTP reports" },
        { name: "Export Reports & Analytics", slug: "reports:export", module: "reports", action: "manage", description: "Export and download report spreadsheets, audit logs & CSV data" },
        // 21. SMS Wallet & Credits
        { name: "View SMS Wallet & Credits", slug: "sms_wallet:view", module: "sms_wallet", action: "view", description: "View Fast2SMS wallet balance, DLT SMS logs & delivery stats" },
        { name: "Manage SMS Wallet & Credits", slug: "sms_wallet:manage", module: "sms_wallet", action: "manage", description: "Recharge SMS credits, configure SMS triggers, and send test SMS" },
        // Legacy compatibility
        { name: "Manage Store Settings (Legacy)", slug: "settings:manage", module: "settings", action: "manage", description: "Legacy combined store settings permission" },
        // Super Admin Exclusive
        { name: "Manage Admins", slug: "admins:manage", module: "admin_management", action: "manage", description: "Create, edit, deactivate admins & reset passwords (Super Admin only)" },
        { name: "View Activity Logs", slug: "logs:view", module: "activity_logs", action: "read", description: "Inspect administrative audit logs (Super Admin only)" },
      ];

      const currentPerms = await db.select({ slug: permissions.slug }).from(permissions);
      const existingSlugSet = new Set(currentPerms.map((p) => p.slug));

      for (const p of masterPermissions) {
        if (!existingSlugSet.has(p.slug)) {
          await db.insert(permissions).values(p);
          existingSlugSet.add(p.slug);
        }
      }

      // 3. Link permissions to Super Admin role
      const superAdminRole = await db.select().from(roles).where(eq(roles.slug, "super_admin")).limit(1);
      if (superAdminRole.length > 0) {
        const allPerms = await db.select().from(permissions);
        for (const p of allPerms) {
          const check = await db
            .select()
            .from(rolePermissions)
            .where(
              sql`${rolePermissions.roleId} = ${superAdminRole[0].id} AND ${rolePermissions.permissionId} = ${p.id}`
            )
            .limit(1);
          if (check.length === 0) {
            await db.insert(rolePermissions).values({
              roleId: superAdminRole[0].id,
              permissionId: p.id,
            });
          }
        }
      }

      // 4. Default CMS pages
      const existingPages = await db.select({ id: cmsPages.id }).from(cmsPages).limit(1);
      if (existingPages.length === 0) {
        await db.insert(cmsPages).values([
          {
            title: "About Vardayini Sweet Mart",
            slug: "about-us",
            content: "Founded in 1976 in Vadodara, Gujarat, Vardayini Sweet Mart has been handcrafting traditional mithai, crunchy Gujarati farsan, and festival celebration hampers with 100% Shuddh Desi Ghee for three generations.",
            metaTitle: "About Us | Vardayini Sweet Mart Vadodara",
            metaDescription: "Learn about Vardayini Sweet Mart's legacy of royal sweets and farsan since 1976.",
            isPublished: true,
          },
          {
            title: "Quality & Purity Assurance",
            slug: "quality-assurance",
            content: "Every batch of Kaju Katli, Mathura Penda, and Ghee Mohanthal is crafted using certified Gir cow milk ghee, premium organic dry fruits, and zero artificial preservatives.",
            metaTitle: "Quality & Purity Assurance | Vardayini Sweets",
            metaDescription: "100% Shuddh Desi Ghee, zero adulteration, master karigar craftsmanship.",
            isPublished: true,
          },
          {
            title: "Terms & Conditions",
            slug: "terms",
            content: "All orders placed through Vardayini Sweet Mart online are processed for same-day delivery in Vadodara and express courier across Gujarat. Sweets and perishable farsan are prepared fresh on order date.",
            metaTitle: "Terms & Conditions | Vardayini Sweet Mart",
            metaDescription: "Standard ordering terms and conditions.",
            isPublished: true,
          },
          {
            title: "Privacy Policy",
            slug: "privacy-policy",
            content: "We respect your privacy. Customer contact details, delivery addresses, and payment information are strictly encrypted and never shared with third parties.",
            metaTitle: "Privacy Policy | Vardayini Sweet Mart",
            metaDescription: "Privacy and data protection policy.",
            isPublished: true,
          },
        ]);
      }
    } catch (err) {
      console.warn("RBAC seed notice:", err);
    }
  }

  async function ensureEssentialCategories() {
    const essentialCats = [
      { id: 13, name: "Millet", slug: "millet", description: "Healthy wholesome snacks made with ragi, bajra and jowar.", imageUrl: "/images/namkeen.jpg", sortOrder: 13 },
      { id: 14, name: "Farali", slug: "farali", description: "Upvas and fasting-compliant potato chiwda and sabudana mixtures.", imageUrl: "/images/namkeen.jpg", sortOrder: 14 },
      { id: 15, name: "Gujarati", slug: "gujarati", description: "Iconic fresh and dry Gujarati farsan, gathiya, khaman and khandvi.", imageUrl: "/images/khandvi-showcase.jpg", sortOrder: 15 },
      { id: 16, name: "Khakhra", slug: "khakhra", description: "Crisp hand-pressed whole wheat thin crisps with traditional spices.", imageUrl: "/images/namkeen.jpg", sortOrder: 16 },
      { id: 17, name: "Roasted", slug: "roasted", description: "Diet-friendly roasted grains, pulses and light digestive snacks.", imageUrl: "/images/namkeen.jpg", sortOrder: 17 },
      { id: 18, name: "Mixture", slug: "mixture", description: "Vardayini's signature sweet & spicy chivda and royal ratlami mixtures.", imageUrl: "/images/namkeen.jpg", sortOrder: 18 },
      { id: 19, name: "Indian", slug: "indian", description: "Crisp dry samosas, khasta kachoris and all-time Indian teatime savoury treats.", imageUrl: "/images/namkeen.jpg", sortOrder: 19 },
      { id: 20, name: "Daal/Lentil", slug: "daal-lentil", description: "Protein-rich seasoned fried moong and chana lentils.", imageUrl: "/images/namkeen.jpg", sortOrder: 20 },
      { id: 21, name: "Sev", slug: "sev", description: "Gram flour sev ranging from ultra-fine nylon to bold ratlami clove spice.", imageUrl: "/images/namkeen.jpg", sortOrder: 21 },
      { id: 22, name: "Chips and Puris", slug: "chips-and-puris", description: "Authentic Gujarati farsi puris and hand-cut salted banana wafers.", imageUrl: "/images/namkeen.jpg", sortOrder: 22 },
      { id: 23, name: "Biscuits and Cookies", slug: "biscuits-and-cookies", description: "Melt-in-mouth traditional nankhatai, pista cookies and fresh bakery biscuits.", imageUrl: "/images/kaju-katli.jpg", sortOrder: 23 },
      { id: 24, name: "Toast and Khari", slug: "toast-and-khari", description: "Flaky layered butter khari and spiced teatime crunchy toasts.", imageUrl: "/images/kaju-katli.jpg", sortOrder: 24 },
    ];

    for (const c of essentialCats) {
      try {
        const [existing] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(or(eq(categories.id, c.id), eq(categories.slug, c.slug)))
          .limit(1);

        if (!existing) {
          await db.insert(categories).values(c);
        }
      } catch { }
    }
  }

  // Insert 18 Categories across Sweets, Namkeen & Bakery
  await db
    .insert(categories)
    .values([
      // --- SWEETS ---
      {
        name: "Kaju Sweets",
        slug: "kaju-sweets",
        description: "Pure cashew craftsmanship with edible silver varakh and organic saffron.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 1,
      },
      {
        name: "Mawa Sweets",
        slug: "mawa-sweets",
        description: "Classic khoya and slow-reduced milk delicacies crafted fresh for our customers.",
        imageUrl: "/images/gulab-jamun.jpg",
        sortOrder: 2,
      },
      {
        name: "Penda",
        slug: "penda",
        description: "Authentic Gujarati kesar, malai and Mathura-style milk pedas.",
        imageUrl: "/images/peda.jpg",
        sortOrder: 3,
      },
      {
        name: "Sugarless Sweets",
        slug: "sugarless-sweets",
        description: "Naturally sweetened sweets crafted with royal dates, anjeer and dryfruits.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 4,
      },
      {
        name: "Premium Packed Sweets",
        slug: "premium-packed-sweets",
        description: "Assorted luxury gift boxes, festive hampers and wedding platters.",
        imageUrl: "/images/hamper.jpg",
        sortOrder: 5,
      },
      {
        name: "Indian Ghee Sweets",
        slug: "indian-ghee-sweets",
        description: "Time-honoured recipes prepared exclusively in 100% pure cow ghee.",
        imageUrl: "/images/motichoor.jpg",
        sortOrder: 6,
      },

      // --- NAMKEEN ---
      {
        name: "Millet",
        slug: "millet",
        description: "Healthy wholesome snacks made with ragi, bajra and jowar.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 7,
      },
      {
        name: "Farali",
        slug: "farali",
        description: "Upvas and fasting-compliant potato chiwda and sabudana mixtures.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 8,
      },
      {
        name: "Gujarati",
        slug: "gujarati",
        description: "Iconic fresh and dry Gujarati farsan, gathiya, khaman and khandvi.",
        imageUrl: "/images/khandvi-showcase.jpg",
        sortOrder: 9,
      },
      {
        name: "Khakhra",
        slug: "khakhra",
        description: "Crisp hand-pressed whole wheat thin crisps with traditional spices.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 10,
      },
      {
        name: "Roasted",
        slug: "roasted",
        description: "Diet-friendly roasted grains, pulses and light digestive snacks.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 11,
      },
      {
        name: "Mixture",
        slug: "mixture",
        description: "Vardayini's signature sweet & spicy chivda and royal ratlami mixtures.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 12,
      },
      {
        name: "Indian",
        slug: "indian",
        description: "Crisp dry samosas, khasta kachoris and all-time Indian teatime savoury treats.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 13,
      },
      {
        name: "Daal/Lentil",
        slug: "daal-lentil",
        description: "Protein-rich seasoned fried moong and chana lentils.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 14,
      },
      {
        name: "Sev",
        slug: "sev",
        description: "Gram flour sev ranging from ultra-fine nylon to bold ratlami clove spice.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 15,
      },
      {
        name: "Chips and Puris",
        slug: "chips-and-puris",
        description: "Authentic Gujarati farsi puris and hand-cut salted banana wafers.",
        imageUrl: "/images/namkeen.jpg",
        sortOrder: 16,
      },

      // --- BAKERY ---
      {
        name: "Biscuits and Cookies",
        slug: "biscuits-and-cookies",
        description: "Melt-in-mouth traditional nankhatai, pista cookies and fresh bakery biscuits.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 17,
      },
      {
        name: "Toast and Khari",
        slug: "toast-and-khari",
        description: "Flaky layered butter khari and spiced teatime crunchy toasts.",
        imageUrl: "/images/kaju-katli.jpg",
        sortOrder: 18,
      },
    ]);

  const categoryRows = await db.select().from(categories);
  const cat = Object.fromEntries(categoryRows.map((row) => [row.slug, row.id]));

  const productData: {
    category: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    tags: string;
    isFeatured: boolean;
    variants: { weight: string; sku: string; price: number; discountedPrice?: number; stock: number }[];
  }[] = [
      // 1. Kaju Sweets
      {
        category: "kaju-sweets",
        name: "Kaju Katli (Royal Silver Foil)",
        slug: "kaju-katli",
        description: "Silky cashew diamonds finished with edible silver leaf. Melt-in-mouth and never grainy, made with premium whole Goan cashews.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "kaju,best_seller,silver,ghee",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "KK-250", price: 320, discountedPrice: 289, stock: 80 },
          { weight: "500 g", sku: "KK-500", price: 620, discountedPrice: 559, stock: 60 },
          { weight: "1 kg", sku: "KK-1000", price: 1199, discountedPrice: 1099, stock: 40 },
        ],
      },
      {
        category: "kaju-sweets",
        name: "Kaju Kesar Roll",
        slug: "kaju-kesar-roll",
        description: "Rich cylindrical cashew rolls filled with pure Kashmiri saffron paste and crushed pistachios.",
        imageUrl: "/images/kaju-katli-showcase.jpg",
        tags: "kaju,kesar,premium",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "KKR-250", price: 350, stock: 50 },
          { weight: "500 g", sku: "KKR-500", price: 680, discountedPrice: 620, stock: 35 },
        ],
      },
      {
        category: "kaju-sweets",
        name: "Kaju Anjeer Barfi",
        slug: "kaju-anjeer-barfi",
        description: "Dual-layer cashew fudge and slow-cooked sun-dried Afghan figs with natural nutty aroma.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "kaju,anjeer,dryfruit",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "KAB-250", price: 360, stock: 45 },
          { weight: "500 g", sku: "KAB-500", price: 700, stock: 30 },
        ],
      },

      // 2. Mawa Sweets
      {
        category: "mawa-sweets",
        name: "Shahi Gulab Jamun",
        slug: "gulab-jamun",
        description: "Slow-fried pure mawa khoya spheres soaked overnight in aromatic rose, cardamom and saffron syrup.",
        imageUrl: "/images/gulab-jamun.jpg",
        tags: "mawa,khoya,best_seller",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "GJ-250", price: 180, stock: 90 },
          { weight: "500 g", sku: "GJ-500", price: 340, discountedPrice: 319, stock: 70 },
          { weight: "1 kg", sku: "GJ-1000", price: 640, discountedPrice: 599, stock: 40 },
        ],
      },
      {
        category: "mawa-sweets",
        name: "Kesar Mawa Barfi",
        slug: "kesar-mawa-barfi",
        description: "Creamy reduced milk barfi infused with natural saffron threads and garnished with roasted almonds.",
        imageUrl: "/images/peda.jpg",
        tags: "mawa,barfi,saffron",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "KMB-250", price: 220, stock: 60 },
          { weight: "500 g", sku: "KMB-500", price: 420, stock: 40 },
        ],
      },
      {
        category: "mawa-sweets",
        name: "Mawa Gujiya / Ghughra",
        slug: "mawa-gujiya",
        description: "Festive flaky pastry shells packed with rich khoya, grated coconut, dryfruits and green cardamom.",
        imageUrl: "/images/motichoor.jpg",
        tags: "mawa,ghughra,gujiya",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "MG-250", price: 240, stock: 45 },
          { weight: "500 g", sku: "MG-500", price: 460, stock: 35 },
        ],
      },

      // 3. Penda
      {
        category: "penda",
        name: "Kesar Malai Penda",
        slug: "kesar-malai-penda",
        description: "Authentic Vadodara dairy penda cooked from fresh full-cream milk, saffron, and cardamom. Silky and aromatic.",
        imageUrl: "/images/peda.jpg",
        tags: "penda,kesar,best_seller",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "KMP-250", price: 210, stock: 75 },
          { weight: "500 g", sku: "KMP-500", price: 399, discountedPrice: 369, stock: 50 },
          { weight: "1 kg", sku: "KMP-1000", price: 780, stock: 30 },
        ],
      },
      {
        category: "penda",
        name: "Rajkot Brown Penda",
        slug: "rajkot-brown-penda",
        description: "Traditional caramelised slow-roasted brown penda with a distinct grainy texture and intense mawa flavour.",
        imageUrl: "/images/peda.jpg",
        tags: "penda,brown,traditional",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "RBP-250", price: 200, stock: 65 },
          { weight: "500 g", sku: "RBP-500", price: 380, stock: 45 },
        ],
      },
      {
        category: "penda",
        name: "Thabdi Penda (Saurashtra Style)",
        slug: "thabdi-penda",
        description: "Rustic Saurashtra specialty prepared with curdled milk and caramelized sugar, rich in texture and aroma.",
        imageUrl: "/images/peda.jpg",
        tags: "penda,thabdi,heritage",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "TP-250", price: 220, stock: 50 },
          { weight: "500 g", sku: "TP-500", price: 420, stock: 35 },
        ],
      },

      // 4. Sugarless Sweets
      {
        category: "sugarless-sweets",
        name: "Sugarfree Anjeer & Date Delight",
        slug: "sugarfree-anjeer-delight",
        description: "Zero refined sugar. Made entirely from premium Turkish figs, Arabian dates, pistachios and California almonds.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "sugarless,sugarfree,healthy,diet",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "SAD-250", price: 380, stock: 50 },
          { weight: "500 g", sku: "SAD-500", price: 740, stock: 35 },
        ],
      },
      {
        category: "sugarless-sweets",
        name: "Sugarfree Dryfruit Khajur Roll",
        slug: "sugarfree-khajur-roll",
        description: "Naturally sweet date logs rolled in toasted poppy seeds and packed with roasted nuts.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "sugarless,khajur,dryfruit",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "SDK-250", price: 360, stock: 45 },
          { weight: "500 g", sku: "SDK-500", price: 700, stock: 30 },
        ],
      },

      // 5. Premium Packed Sweets
      {
        category: "premium-packed-sweets",
        name: "Shahi Royal Festive Platter",
        slug: "shahi-festive-platter",
        description: "Gilded festive hamper featuring Kaju Katli, Mawa Penda, Motichoor Ladoo, and roasted dry fruits in an ornate box.",
        imageUrl: "/images/mithai-platter-showcase.jpg",
        tags: "hamper,gift,platter,festive",
        isFeatured: true,
        variants: [
          { weight: "500 g", sku: "SFP-500", price: 650, stock: 40 },
          { weight: "1 kg", sku: "SFP-1000", price: 1250, stock: 25 },
        ],
      },
      {
        category: "premium-packed-sweets",
        name: "Vardayini Signature Gift Hamper",
        slug: "vardayini-signature-hamper",
        description: "Our signature luxury Diwali and wedding gift trunk with assorted sweets, khakhra, namkeen and dryfruits.",
        imageUrl: "/images/hamper.jpg",
        tags: "hamper,signature,gift",
        isFeatured: true,
        variants: [
          { weight: "1.2 kg Box", sku: "VGH-1200", price: 1499, discountedPrice: 1349, stock: 30 },
        ],
      },

      // 6. Indian Ghee Sweets
      {
        category: "indian-ghee-sweets",
        name: "Motichoor Ladoo (Pure Desi Ghee)",
        slug: "motichoor-ladoo",
        description: "Micro boondi pearls fried in pure cow ghee, steeped in saffron cardamom syrup and rolled fresh daily.",
        imageUrl: "/images/motichoor-showcase.jpg",
        tags: "ghee,ladoo,best_seller",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "ML-250", price: 220, stock: 70 },
          { weight: "500 g", sku: "ML-500", price: 420, discountedPrice: 389, stock: 55 },
          { weight: "1 kg", sku: "ML-1000", price: 799, discountedPrice: 749, stock: 35 },
        ],
      },
      {
        category: "indian-ghee-sweets",
        name: "Mohanthal (Traditional Gujarati)",
        slug: "mohanthal",
        description: "Granular roasted besan confection simmered in shuddh desi ghee and spiced with nutmeg and saffron.",
        imageUrl: "/images/motichoor.jpg",
        tags: "ghee,mohanthal,gujarati",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "MH-250", price: 240, stock: 60 },
          { weight: "500 g", sku: "MH-500", price: 460, stock: 40 },
        ],
      },
      {
        category: "indian-ghee-sweets",
        name: "Besan Ladoo (Shuddh Desi Ghee)",
        slug: "besan-ladoo",
        description: "Slow-roasted coarse gram flour ladoos with pure cow ghee and cardamom. The warmth of home.",
        imageUrl: "/images/motichoor.jpg",
        tags: "ghee,ladoo,besan",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "BL-250", price: 200, stock: 80 },
          { weight: "500 g", sku: "BL-500", price: 380, stock: 50 },
        ],
      },
      {
        category: "indian-ghee-sweets",
        name: "Mysore Pak (Ghee Rich)",
        slug: "mysore-pak",
        description: "Porous, ghee-dripping royal Mysore Pak that dissolves into golden crumbs on your tongue.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "ghee,mysore_pak",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "MPK-250", price: 240, stock: 50 },
          { weight: "500 g", sku: "MPK-500", price: 460, stock: 30 },
        ],
      },

      // 7. Millet
      {
        category: "millet",
        name: "Roasted Ragi & Bajra Crisps",
        slug: "roasted-ragi-bajra-crisps",
        description: "Crunchy multigrain crisps made from finger millet and pearl millet with roasted cumin seasoning.",
        imageUrl: "/images/namkeen.jpg",
        tags: "millet,healthy,ragi,bajra",
        isFeatured: true,
        variants: [
          { weight: "200 g", sku: "RBC-200", price: 120, stock: 65 },
          { weight: "400 g", sku: "RBC-400", price: 230, stock: 40 },
        ],
      },
      {
        category: "millet",
        name: "Jowar Puffs Masala Namkeen",
        slug: "jowar-puffs-namkeen",
        description: "Light-as-air roasted sorghum puffs tossed in rock salt, turmeric and mild green chili spices.",
        imageUrl: "/images/namkeen.jpg",
        tags: "millet,jowar,diet",
        isFeatured: false,
        variants: [
          { weight: "150 g", sku: "JPN-150", price: 110, stock: 70 },
          { weight: "300 g", sku: "JPN-300", price: 210, stock: 45 },
        ],
      },

      // 8. Farali
      {
        category: "farali",
        name: "Farali Potato Chiwda (Sweet & Salt)",
        slug: "farali-potato-chiwda",
        description: "Crispy shredded potato sticks tossed with roasted peanuts, raisins, cashews and sendha namak for fasting.",
        imageUrl: "/images/namkeen.jpg",
        tags: "farali,fasting,upvas,chiwda",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "FPC-250", price: 130, stock: 80 },
          { weight: "500 g", sku: "FPC-500", price: 250, stock: 55 },
        ],
      },
      {
        category: "farali",
        name: "Sabudana Farali Mixture",
        slug: "sabudana-farali-mixture",
        description: "Puffed sago pearls, roasted peanuts and sun-dried potatoes seasoned with rock salt and black pepper.",
        imageUrl: "/images/namkeen.jpg",
        tags: "farali,sabudana,upvas",
        isFeatured: false,
        variants: [
          { weight: "200 g", sku: "SFM-200", price: 120, stock: 60 },
          { weight: "400 g", sku: "SFM-400", price: 230, stock: 40 },
        ],
      },

      // 9. Gujarati
      {
        category: "gujarati",
        name: "Nylon Khaman (Live Morning Steamed)",
        slug: "nylon-khaman",
        description: "Spongy, juicy steamed besan cakes tempered with mustard seeds, green chilies and fresh coriander.",
        imageUrl: "/images/khaman-showcase.jpg",
        tags: "gujarati,farsan,khaman,live",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "NK-250", price: 90, stock: 100 },
          { weight: "500 g", sku: "NK-500", price: 170, stock: 80 },
        ],
      },
      {
        category: "gujarati",
        name: "Surati Khandvi (Tempered Coconut)",
        slug: "surati-khandvi",
        description: "Delicate gram flour rolls tempered with sesame and mustard seeds, garnished with grated coconut.",
        imageUrl: "/images/khandvi-showcase.jpg",
        tags: "gujarati,khandvi,farsan",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "SK-250", price: 110, stock: 75 },
          { weight: "500 g", sku: "SK-500", price: 210, stock: 50 },
        ],
      },
      {
        category: "gujarati",
        name: "Bhavnagari Gathiya",
        slug: "bhavnagari-gathiya",
        description: "Soft melt-in-mouth thick gram flour gathiya seasoned with black pepper and carom seeds.",
        imageUrl: "/images/namkeen.jpg",
        tags: "gujarati,gathiya,farsan",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "BG-250", price: 110, stock: 85 },
          { weight: "500 g", sku: "BG-500", price: 210, stock: 60 },
        ],
      },

      // 10. Khakhra
      {
        category: "khakhra",
        name: "Methi Handcrafted Khakhra",
        slug: "methi-khakhra",
        description: "Crispy roasted whole wheat thin crisps spiced with aromatic fenugreek leaves and carom seeds.",
        imageUrl: "/images/namkeen.jpg",
        tags: "khakhra,methi,gujarati",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "MK-250", price: 95, stock: 90 },
          { weight: "500 g", sku: "MK-500", price: 180, stock: 65 },
        ],
      },
      {
        category: "khakhra",
        name: "Masala Vacuum Packed Khakhra",
        slug: "masala-khakhra",
        description: "Spicy roasted Gujarati khakhra vacuum-sealed to preserve crisp oven freshness for weeks.",
        imageUrl: "/images/namkeen.jpg",
        tags: "khakhra,masala",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "MSK-250", price: 95, stock: 85 },
          { weight: "500 g", sku: "MSK-500", price: 180, stock: 60 },
        ],
      },

      // 11. Roasted
      {
        category: "roasted",
        name: "Diet Roasted Chana Jor",
        slug: "roasted-chana-jor",
        description: "Healthy flat-pressed black chickpeas roasted with tangy chaat masala. Zero guilt snacking.",
        imageUrl: "/images/namkeen.jpg",
        tags: "roasted,diet,chana",
        isFeatured: true,
        variants: [
          { weight: "200 g", sku: "RCJ-200", price: 100, stock: 80 },
          { weight: "400 g", sku: "RCJ-400", price: 190, stock: 50 },
        ],
      },
      {
        category: "roasted",
        name: "Roasted 5-Grain Mixture",
        slug: "roasted-5-grain-mixture",
        description: "Dry roasted wheat flakes, rice flakes, soya, chana, and watermelon seeds seasoned with sea salt.",
        imageUrl: "/images/namkeen.jpg",
        tags: "roasted,multigrain,healthy",
        isFeatured: false,
        variants: [
          { weight: "200 g", sku: "R5G-200", price: 120, stock: 60 },
          { weight: "400 g", sku: "R5G-400", price: 230, stock: 40 },
        ],
      },

      // 12. Mixture
      {
        category: "mixture",
        name: "Special Vadodara Royal Mixture",
        slug: "special-vadodara-mixture",
        description: "A blend of spicy sev, fried lentils, peanuts, cashews and sweet raisins. Our all-time bestseller.",
        imageUrl: "/images/namkeen.jpg",
        tags: "mixture,chivda,vadodara,best_seller",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "SVM-250", price: 120, stock: 90 },
          { weight: "500 g", sku: "SVM-500", price: 230, stock: 70 },
        ],
      },
      {
        category: "mixture",
        name: "Ratlami Spicy Mixture",
        slug: "ratlami-mixture",
        description: "Fiery Malwa-style mixture featuring clove-spiced sev, boondi and crispy pulses with sharp kick.",
        imageUrl: "/images/namkeen.jpg",
        tags: "mixture,spicy,ratlami",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "RM-250", price: 120, stock: 75 },
          { weight: "500 g", sku: "RM-500", price: 230, stock: 50 },
        ],
      },

      // 13. Indian
      {
        category: "indian",
        name: "Punjabi Mini Dry Samosa",
        slug: "punjabi-dry-samosa",
        description: "Bite-sized crispy triangular pastries stuffed with sweet & spicy dry masala, cashews and raisins.",
        imageUrl: "/images/namkeen.jpg",
        tags: "indian,samosa,farsan,snacks",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "PDS-250", price: 110, stock: 80 },
          { weight: "500 g", sku: "PDS-500", price: 210, stock: 60 },
        ],
      },
      {
        category: "indian",
        name: "Khasta Moong Daal Kachori",
        slug: "khasta-moong-kachori",
        description: "Flaky round savoury pastries filled with spiced yellow moong lentil mix. Long shelf-life.",
        imageUrl: "/images/namkeen.jpg",
        tags: "indian,kachori,farsan",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "KMK-250", price: 120, stock: 70 },
          { weight: "500 g", sku: "KMK-500", price: 230, stock: 50 },
        ],
      },

      // 14. Daal/Lentil
      {
        category: "daal-lentil",
        name: "Crispy Salted Moong Daal",
        slug: "crispy-moong-daal",
        description: "Golden fried split yellow lentils tossed with just the right amount of pure sea salt.",
        imageUrl: "/images/namkeen.jpg",
        tags: "daal,lentil,moong,protein",
        isFeatured: true,
        variants: [
          { weight: "200 g", sku: "CMD-200", price: 95, stock: 85 },
          { weight: "400 g", sku: "CMD-400", price: 180, stock: 60 },
        ],
      },
      {
        category: "daal-lentil",
        name: "Spicy Chana Daal Namkeen",
        slug: "spicy-chana-daal",
        description: "Crunchy Bengal gram lentils spiced with red chili, mango amchur and black salt.",
        imageUrl: "/images/namkeen.jpg",
        tags: "daal,chana,spicy",
        isFeatured: false,
        variants: [
          { weight: "200 g", sku: "SCD-200", price: 95, stock: 75 },
          { weight: "400 g", sku: "SCD-400", price: 180, stock: 50 },
        ],
      },

      // 15. Sev
      {
        category: "sev",
        name: "Nylon Sev (Fine Golden Bhel Sev)",
        slug: "nylon-sev",
        description: "Ultra-fine crispy gram flour sev essential for chaat, poha, dabeli, and sev puri.",
        imageUrl: "/images/namkeen.jpg",
        tags: "sev,nylon,chaat,best_seller",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "NS-250", price: 95, stock: 100 },
          { weight: "500 g", sku: "NS-500", price: 180, stock: 80 },
        ],
      },
      {
        category: "sev",
        name: "Ratlami Clove & Pepper Sev",
        slug: "ratlami-clove-sev",
        description: "Thick gram flour sev intensely scented with crushed cloves, black pepper and hing.",
        imageUrl: "/images/namkeen.jpg",
        tags: "sev,ratlami,clove",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "RCS-250", price: 110, stock: 80 },
          { weight: "500 g", sku: "RCS-500", price: 210, stock: 60 },
        ],
      },

      // 16. Chips and Puris
      {
        category: "chips-and-puris",
        name: "Yellow Banana Wafers (Mari & Salt)",
        slug: "banana-wafers",
        description: "Wafer-thin raw Kerala banana chips fried in fresh oil and seasoned with crushed black pepper.",
        imageUrl: "/images/namkeen.jpg",
        tags: "chips,banana,wafers,puris",
        isFeatured: true,
        variants: [
          { weight: "200 g", sku: "BW-200", price: 110, stock: 90 },
          { weight: "400 g", sku: "BW-400", price: 210, stock: 65 },
        ],
      },
      {
        category: "chips-and-puris",
        name: "Farsi Puri (Black Pepper Ghee Crisps)",
        slug: "farsi-puri",
        description: "Traditional flaky discs prepared with whole wheat, pure ghee and coarse peppercorns.",
        imageUrl: "/images/namkeen.jpg",
        tags: "puri,farsi,gujarati",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "FP-250", price: 120, stock: 80 },
          { weight: "500 g", sku: "FP-500", price: 230, stock: 55 },
        ],
      },

      // 17. Biscuits and Cookies
      {
        category: "biscuits-and-cookies",
        name: "Traditional Nankhatai Biscuits",
        slug: "traditional-nankhatai",
        description: "Old-world Indian shortbread cookies baked with semolina, ghee, cardamom and crushed pistachio.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "bakery,biscuits,cookies,nankhatai",
        isFeatured: true,
        variants: [
          { weight: "250 g", sku: "NKH-250", price: 140, stock: 70 },
          { weight: "500 g", sku: "NKH-500", price: 270, stock: 50 },
        ],
      },
      {
        category: "biscuits-and-cookies",
        name: "Pista Butter Cookies",
        slug: "pista-butter-cookies",
        description: "Rich buttery tea cookies embedded with roasted green pistachios and fragrant vanilla.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "bakery,cookies,pista",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "PBC-250", price: 160, stock: 60 },
          { weight: "500 g", sku: "PBC-500", price: 310, stock: 40 },
        ],
      },

      // 18. Toast and Khari
      {
        category: "toast-and-khari",
        name: "Maskati Butter Khari",
        slug: "maskati-butter-khari",
        description: "Golden flaky multi-layered puff pastry baked to perfection. A breakfast staple with masala chai.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "bakery,khari,toast,butter",
        isFeatured: true,
        variants: [
          { weight: "200 g", sku: "MBK-200", price: 100, stock: 85 },
          { weight: "400 g", sku: "MBK-400", price: 190, stock: 60 },
        ],
      },
      {
        category: "toast-and-khari",
        name: "Jeera Crunchy Teatime Toast",
        slug: "jeera-crunchy-toast",
        description: "Twice-baked crispy rusk bread infused with toasted cumin seeds and gentle fennel notes.",
        imageUrl: "/images/kaju-katli.jpg",
        tags: "bakery,toast,rusk,jeera",
        isFeatured: false,
        variants: [
          { weight: "250 g", sku: "JCT-250", price: 95, stock: 80 },
          { weight: "500 g", sku: "JCT-500", price: 180, stock: 55 },
        ],
      },
    ];

  for (const item of productData) {
    const categoryId = cat[item.category];
    if (!categoryId) continue;

    const [insRes] = await db
      .insert(products)
      .values({
        categoryId,
        name: item.name,
        slug: item.slug,
        description: item.description,
        imageUrl: item.imageUrl,
        tags: item.tags,
        isFeatured: item.isFeatured,
      });

    const productId = (insRes as any).insertId;

    await db.insert(productVariants).values(
      item.variants.map((variant) => ({
        productId,
        weight: variant.weight,
        sku: variant.sku,
        price: variant.price,
        discountedPrice: variant.discountedPrice ?? null,
        stock: variant.stock,
      })),
    );
  }

  // Ensure coupons exist (insert only the missing codes, never wipe custom ones)
  await ensureDefaultCoupons();

  // Ensure stores exist
  const existingStores = await db.select({ id: stores.id }).from(stores).limit(1);
  if (existingStores.length === 0) {
    await db.insert(stores).values([
      {
        name: "Vardayini Mandvi (Heritage Flagship)",
        address: "12, Mandvi Pol, opposite Mahalaxmi Temple, Mandvi",
        city: "Vadodara",
        pincode: "390001",
        phone: "+91 265 242 1186",
        hours: "8:00 AM – 10:30 PM (All 7 Days)",
        openingTime: "08:00",
        closingTime: "22:30",
        slotIntervalMinutes: 60,
        slotCapacity: 15,
        prepTimeMinutes: 45,
        isActive: true,
        pickupEnabled: true,
        holidays: "",
        lat: "22.307200",
        lng: "73.181200",
        mapUrl: "https://maps.google.com/maps?q=Vardayini+Sweet+Mandvi+Vadodara",
      },
      {
        name: "Vardayini Alkapuri (Premium Counter)",
        address: "33, RC Dutt Road, Alkapuri",
        city: "Vadodara",
        pincode: "390007",
        phone: "+91 265 233 4411",
        hours: "9:00 AM – 10:00 PM (All 7 Days)",
        openingTime: "09:00",
        closingTime: "22:00",
        slotIntervalMinutes: 60,
        slotCapacity: 12,
        prepTimeMinutes: 30,
        isActive: true,
        pickupEnabled: true,
        holidays: "",
        lat: "22.313500",
        lng: "73.171800",
        mapUrl: "https://maps.google.com/maps?q=Vardayini+Alkapuri+Vadodara",
      },
      {
        name: "Vardayini CG Road",
        address: "Ground Floor, Heritage Plaza, CG Road, Navrangpura",
        city: "Ahmedabad",
        pincode: "380009",
        phone: "+91 79 2646 5522",
        hours: "9:00 AM – 11:00 PM (All 7 Days)",
        openingTime: "09:00",
        closingTime: "23:00",
        slotIntervalMinutes: 60,
        slotCapacity: 10,
        prepTimeMinutes: 60,
        isActive: true,
        pickupEnabled: true,
        holidays: "",
        lat: "23.033000",
        lng: "72.565000",
        mapUrl: "https://maps.google.com/maps?q=Vardayini+CG+Road+Ahmedabad",
      },
      {
        name: "Coming to London, Ontario",
        address: "820 Blythwood Rd, London, ON N6H 5T8",
        city: "London, Ontario",
        pincode: "N6H 5T8",
        phone: "+1 (519) 641-8988",
        hours: "Coming Soon · 10:00 AM – 9:00 PM",
        openingTime: "10:00",
        closingTime: "21:00",
        slotIntervalMinutes: 60,
        slotCapacity: 5,
        prepTimeMinutes: 60,
        isActive: false,
        pickupEnabled: false,
        holidays: "",
        lat: "42.990897",
        lng: "-81.298634",
        mapUrl: "https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5",
      },
    ]);
  }

  try {
    await db
      .update(stores)
      .set({
        openingTime: "08:00",
        closingTime: "22:30",
        slotIntervalMinutes: 60,
        slotCapacity: 15,
        prepTimeMinutes: 45,
        isActive: true,
        pickupEnabled: true,
        mapUrl: "https://maps.google.com/maps?q=Vardayini+Sweet+Mandvi+Vadodara",
      })
      .where(like(stores.name, "%Mandvi%"));
    await db
      .update(stores)
      .set({
        openingTime: "09:00",
        closingTime: "22:00",
        slotIntervalMinutes: 60,
        slotCapacity: 12,
        prepTimeMinutes: 30,
        isActive: true,
        pickupEnabled: true,
        mapUrl: "https://maps.google.com/maps?q=Vardayini+Alkapuri+Vadodara",
      })
      .where(like(stores.name, "%Alkapuri%"));
    await db
      .update(stores)
      .set({
        openingTime: "09:00",
        closingTime: "23:00",
        slotIntervalMinutes: 60,
        slotCapacity: 10,
        prepTimeMinutes: 60,
        isActive: true,
        pickupEnabled: true,
        mapUrl: "https://maps.google.com/maps?q=Vardayini+CG+Road+Ahmedabad",
      })
      .where(like(stores.name, "%CG Road%"));
    await db
      .update(stores)
      .set({
        isActive: false,
        pickupEnabled: false,
        mapUrl: "https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5",
      })
      .where(like(stores.name, "%London%"));

    // Ensure Kalol Flagship (6A, Navjivan Shopping Center, Kalol) has exact coordinates
    const [kalolStore] = await db.select().from(stores).where(or(like(stores.address, "%navjivan%"), like(stores.name, "%kalol%"))).limit(1);
    if (kalolStore) {
      await db.update(stores).set({
        name: "Vardayini Sweet Mart",
        address: "6A, Navjivan Shopping Center, Kalol",
        city: "Kalol, Gujarat",
        pincode: "382721",
        phone: "+91 63531 19329",
        hours: "8:00 AM – 8:30 PM (All 7 Days)",
        openingTime: "08:00",
        closingTime: "20:30",
        isActive: true,
        pickupEnabled: true,
        lat: "23.246300",
        lng: "72.508600",
        mapUrl: "https://maps.google.com/maps?q=23.2463,72.5086",
      }).where(eq(stores.id, kalolStore.id));
    } else {
      await db.insert(stores).values({
        name: "Vardayini Sweet Mart (Kalol Flagship)",
        address: "6A, Navjivan Shopping Center, Kalol",
        city: "Kalol, Gujarat",
        pincode: "382721",
        phone: "+91 63531 19329",
        hours: "8:00 AM – 8:30 PM (All 7 Days)",
        openingTime: "08:00",
        closingTime: "20:30",
        slotIntervalMinutes: 60,
        slotCapacity: 15,
        prepTimeMinutes: 30,
        isActive: true,
        pickupEnabled: true,
        holidays: "",
        lat: "23.246300",
        lng: "72.508600",
        mapUrl: "https://maps.google.com/maps?q=23.2463,72.5086",
      });
    }

    // Ensure Rupal counter has exact coordinates
    const [rupalStore] = await db.select().from(stores).where(like(stores.name, "%rupal%")).limit(1);
    if (rupalStore) {
      await db.update(stores).set({
        lat: "23.310000",
        lng: "72.596900",
        mapUrl: "https://maps.google.com/maps?q=23.3100,72.5969",
      }).where(eq(stores.id, rupalStore.id));
    }
  } catch { }

  // Ensure 9 Customers exist
  const existingUsersCount = await db.select({ id: users.id }).from(users);
  if (existingUsersCount.length < 10) {
    const passwordHash = await bcrypt.hash("sweet123", 10);
    const customersList = [
      { name: "Aanya Patel", email: "aanya@vardayini.com", phone: "9876543210" },
      { name: "Pratik Sukhadiya", email: "pratik@vardayini.com", phone: "9825019760" },
      { name: "Rajesh Shah", email: "rajesh@gmail.com", phone: "9824155220" },
      { name: "Meera Joshi", email: "meera@gmail.com", phone: "9909944331" },
      { name: "Bhavin Desai", email: "bhavin@yahoo.com", phone: "9426011223" },
      { name: "Neha Dave", email: "neha@gmail.com", phone: "9825277889" },
      { name: "Chirag Mehta", email: "chirag@mehta.com", phone: "9879512345" },
      { name: "Priya Parikh", email: "priya@parikh.in", phone: "9427098765" },
      { name: "Kiritbhai Gandhi", email: "kirit@gandhi.com", phone: "9825123456" },
    ];
    for (const c of customersList) {
      try {
        await db.insert(users).values({
          name: c.name,
          email: c.email,
          phone: c.phone,
          passwordHash,
          role: "customer",
        });
      } catch {
        // ignore duplicate
      }
    }
  }

  // Ensure Admin user exists
  const [existingMasterAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1);
  if (!existingMasterAdmin) {
    const passwordHash = await bcrypt.hash("sweet123", 10);
    try {
      await db.insert(users).values({
        name: "Vardayini Master Admin",
        email: "admin@vardayini.com",
        phone: "9825019760",
        passwordHash,
        role: "admin",
      });
    } catch { }
  }

  // Ensure addresses exist for all users
  const existingAddresses = await db.select({ id: addresses.id }).from(addresses).limit(1);
  if (existingAddresses.length === 0) {
    const allCurrentUsers = await db.select().from(users);
    const userMapByEmail = new Map(allCurrentUsers.map((u) => [u.email, u.id]));

    const userAddressList = [
      { email: "pratik@vardayini.com", label: "Home", line1: "14, Heritage Enclave, Near Mandvi Gate, Mandvi", city: "Vadodara", state: "Gujarat", pincode: "390001", phone: "9825019760" },
      { email: "pratik@vardayini.com", label: "Office", line1: "Level 4, Karigar Corporate Hub, RC Dutt Road, Alkapuri", city: "Vadodara", state: "Gujarat", pincode: "390007", phone: "9825019760" },
      { email: "aanya@vardayini.com", label: "Home", line1: "B-402, Samruddhi Heights, Alkapuri", city: "Vadodara", state: "Gujarat", pincode: "390007", phone: "9876543210" },
      { email: "admin@vardayini.com", label: "Headquarters", line1: "12, Mandvi Pol, Opp. Mahalaxmi Temple, Mandvi", city: "Vadodara", state: "Gujarat", pincode: "390001", phone: "9000000000" },
      { email: "rajesh@gmail.com", label: "Home", line1: "12, Shanti Kunj Society, Near Law Garden, Ellisbridge", city: "Ahmedabad", state: "Gujarat", pincode: "380006", phone: "9824155220" },
      { email: "meera@gmail.com", label: "Home", line1: "7, Navrang Row House, Race Course Road", city: "Vadodara", state: "Gujarat", pincode: "390015", phone: "9909944331" },
      { email: "bhavin@yahoo.com", label: "Home", line1: "45, Gokul Residency, Ring Road, Athwa Lines", city: "Surat", state: "Gujarat", pincode: "395001", phone: "9426011223" },
      { email: "neha@gmail.com", label: "Home", line1: "23, Amrapali Bungalows, Gotri Sevasi Road", city: "Vadodara", state: "Gujarat", pincode: "390021", phone: "9825277889" },
      { email: "chirag@mehta.com", label: "Home", line1: "58, Swastik Society, Navrangpura", city: "Ahmedabad", state: "Gujarat", pincode: "380009", phone: "9879512345" },
      { email: "priya@parikh.in", label: "Home", line1: "19, Anand Vihar, Vidyanagar Road", city: "Anand", state: "Gujarat", pincode: "388001", phone: "9427098765" },
      { email: "kirit@gandhi.com", label: "Home", line1: "88, Mahalaxmi Pol, Raopura", city: "Vadodara", state: "Gujarat", pincode: "390001", phone: "9825123456" },
    ];

    for (const addr of userAddressList) {
      const uId = userMapByEmail.get(addr.email);
      if (uId) {
        try {
          await db.insert(addresses).values({
            userId: uId,
            label: addr.label,
            line1: addr.line1,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            phone: addr.phone,
          });
        } catch {
          // ignore
        }
      }
    }
  }

  // Ensure authentic verified customer reviews exist in the database
  const existingReviews = await db.select({ id: reviews.id }).from(reviews);
  if (existingReviews.length < 5) {
    try {
      await db.delete(reviews);
    } catch {}

    const allCurrentProducts = await db.select().from(products);
    const prodMap = new Map(allCurrentProducts.map((p) => [p.slug, p.id]));
    const allUsersList = await db.select().from(users);
    const userMap = new Map(allUsersList.map((u) => [u.name, u.id]));

    const reviewsToSeed = [
      {
        productSlug: "kaju-katli",
        userName: "Pratik Sukhadiya",
        rating: 5,
        comment: "The authentic taste of pure ghee Mohanthal, Kaju Katli and Kesar Peda is unmatched. Best sweet shop in Kalol and Gandhinagar district!",
      },
      {
        productSlug: "kaju-katli",
        userName: "Rajeshbhai Shah",
        rating: 5,
        comment: "Ordered 5 kg Kaju Katli and Nylon Khaman for our family gathering. Reached fresh, neatly packed, and every guest praised the authentic traditional taste.",
      },
      {
        productSlug: "motichoor-ladoo",
        userName: "Aanya Patel",
        rating: 5,
        comment: "The Desi Ghee Motichoor Ladoo and Besan Mohanthal melt right in the mouth. Authentic Vadodara heritage taste without any artificial sweetness.",
      },
      {
        productSlug: "kesar-malai-penda",
        userName: "Kiritbhai Gandhi",
        rating: 5,
        comment: "Our family has been buying sweets from Vardayini since the 1980s. The quality of dryfruit sweets and morning farsan has remained pure and royal.",
      },
      {
        productSlug: "shahi-festive-platter",
        userName: "Bhavin Desai",
        rating: 5,
        comment: "Ordered the festive gift hamper for Diwali. Vacuum-sealed packaging kept the sweets fresh for weeks. Excellent service and taste.",
      },
      {
        productSlug: "kesar-malai-penda",
        userName: "Meera Joshi",
        rating: 5,
        comment: "Best Kesar Peda in Gujarat! Pure Gir cow ghee aroma and fresh milk khoya. Highly recommended for all festive celebrations.",
      },
      {
        productSlug: "gulab-jamun",
        userName: "Chirag Mehta",
        rating: 5,
        comment: "The Shahi Gulab Jamun are melt-in-mouth soft with genuine rose and green cardamom aroma. Truly unmatched purity.",
      },
    ];

    for (const r of reviewsToSeed) {
      const pId = prodMap.get(r.productSlug) || allCurrentProducts[0]?.id || 1;
      const uId = userMap.get(r.userName) || null;
      try {
        await db.insert(reviews).values({
          productId: pId,
          userId: uId,
          userName: r.userName,
          rating: r.rating,
          comment: r.comment,
          isVerified: true,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 20 + 2) * 86400 * 1000),
        });
      } catch {}
    }
  }

  // Ensure Orders exist matching operational breakdown:
  // 120 pending, 31 confirmed, 1 packed, 10 delivered, 4 cancelled, 18 shipped
  const existingOrders = await db.select({ id: orders.id }).from(orders).limit(1);
  if (existingOrders.length === 0) {
    const allUsersList = await db.select().from(users);
    const userMapByName = new Map(allUsersList.map((u) => [u.name, u.id]));

    // Fetch some variants to link
    const allVariants = await db
      .select({
        id: productVariants.id,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        weight: productVariants.weight,
        productName: products.name,
        imageUrl: products.imageUrl,
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .limit(20);

    const orderDefs = [
      { status: "pending", count: 110, label: "Awaiting Processing" },
      { status: "confirmed", count: 31, label: "Processing" },
      { status: "packed", count: 2, label: "Ready for Pickup" },
      { status: "shipped", count: 18, label: "In Transit" },
      { status: "delivered", count: 10, label: "Delivered & Fulfilled" },
      { status: "cancelled", count: 4, label: "Canceled" },
    ];

    const customerNames = [
      "Pratik Sukhadiya", "Aanya Patel", "Rajesh Shah", "Meera Joshi", "Bhavin Desai",
      "Neha Dave", "Chirag Mehta", "Priya Parikh", "Kiritbhai Gandhi"
    ];

    const slots = [
      "Morning Batch (8:00 AM – 11:30 AM)",
      "Afternoon Dispatch (1:00 PM – 4:00 PM)",
      "Evening Fresh (5:30 PM – 8:30 PM)"
    ];

    const cities = ["Vadodara", "Ahmedabad", "Surat", "Anand"];

    let seq = 1000;
    const now = Date.now();

    for (const def of orderDefs) {
      for (let i = 0; i < def.count; i++) {
        seq++;
        const cust = customerNames[(seq + i) % customerNames.length];
        const custUserId = userMapByName.get(cust) || null;

        // Scenario 4: Specific Inter-state test order (VSM-2026-1004 or index 3 of delivered)
        const isInterState = def.status === "delivered" && (seq === 1004 || i === 3);
        const city = isInterState ? "Mumbai" : cities[i % cities.length];
        const state = isInterState ? "Maharashtra" : "Gujarat";
        const stateCode = isInterState ? "27" : "24";
        const pincode = isInterState ? "400050" : "390001";

        const timeOffsetHours = (i * 4) % (30 * 24);
        const orderDate = new Date(now - (timeOffsetHours + 2) * 3600 * 1000);

        // Select 1 to 2 variants for this order
        const v1 = allVariants[(seq + i) % allVariants.length];
        const v2 = allVariants[(seq + i + 3) % allVariants.length];
        const selectedVariants = v1 ? (i % 2 === 0 && v2 ? [v1, v2] : [v1]) : [];

        let subtotal = 0;
        const lineItemsData = selectedVariants.map((v, itemIdx) => {
          const unitPrice = v.discountedPrice && v.discountedPrice > 0 ? v.discountedPrice : v.price;
          const qty = itemIdx === 0 ? 1 : 2;
          const gross = unitPrice * qty;
          subtotal += gross;
          return {
            variantId: v.id,
            productName: v.productName,
            variantWeight: v.weight,
            unitPrice,
            quantity: qty,
            imageUrl: v.imageUrl,
            hsnCode: "21069099",
            taxRate: 5,
            taxableAmount: gross,
            cgstAmount: isInterState ? "0.00" : (gross * 0.025).toFixed(2),
            sgstAmount: isInterState ? "0.00" : (gross * 0.025).toFixed(2),
            igstAmount: isInterState ? (gross * 0.05).toFixed(2) : "0.00",
            totalAmount: gross,
          };
        });

        if (subtotal === 0) {
          subtotal = 500;
        }

        const deliveryFee = subtotal >= 799 ? 0 : 49;
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + deliveryFee + tax;

        const isDelivered = def.status === "delivered";
        const isShipped = def.status === "shipped" || isDelivered;
        const isCancelled = def.status === "cancelled";

        const deliveredDate = isDelivered ? new Date(orderDate.getTime() + 36 * 3600 * 1000) : null;
        const expectedDelivery = new Date(orderDate.getTime() + 48 * 3600 * 1000);

        const guestPhone = `+91 98250 ${String(10000 + (seq % 89999)).slice(1)}`;

        const addressSnapshotJson = JSON.stringify({
          name: cust,
          phone: guestPhone,
          line1: `${12 + (i % 30)}, Heritage Bazaar, ${city === "Mumbai" ? "Bandra West" : "Near Mandvi Clock Tower"}`,
          city,
          state,
          stateCode,
          pincode,
        });

        const [ordRes] = await db.insert(orders).values({
          orderNumber: `VSM-2026-${seq}`,
          userId: custUserId,
          guestName: cust,
          guestPhone,
          status: def.status,
          subtotal,
          discount: 0,
          deliveryFee,
          tax,
          total,
          addressSnapshot: addressSnapshotJson,
          deliverySlot: slots[i % slots.length],
          paymentMethod: i % 2 === 0 ? "UPI" : "COD",
          paymentStatus: isCancelled ? "refunded" : def.status === "pending" ? "pending" : "completed",
          courierName: isShipped ? "Blue Dart Express" : null,
          trackingNumber: isShipped ? `BD-${seq}789` : null,
          trackingUrl: isShipped ? `https://www.bluedart.com/tracking?track=BD-${seq}789` : null,
          expectedDeliveryDate: expectedDelivery,
          deliveredAt: deliveredDate,
          cancelledAt: isCancelled ? new Date(orderDate.getTime() + 2 * 3600 * 1000) : null,
          cancelReason: isCancelled ? "Requested by customer before shipping" : null,
          returnStatus: "none",
          refundStatus: isCancelled ? "processed" : "none",
          refundAmount: isCancelled ? total : 0,
          createdAt: orderDate,
        });

        const orderId = (ordRes as any).insertId;

        // Insert items
        if (orderId) {
          for (const itemData of lineItemsData) {
            await db.insert(orderItems).values({
              orderId,
              ...itemData,
            });
          }

          // Insert payment record
          await db.insert(payments).values({
            orderId,
            paymentMethod: i % 2 === 0 ? "upi" : "cod",
            paymentStatus: isCancelled ? "refunded" : def.status === "pending" ? "pending" : "completed",
            transactionId: `TXN-UPI-${seq}-${Date.now() % 100000}`,
            amount: total,
            currency: "INR",
            createdAt: orderDate,
            updatedAt: orderDate,
          });

          // Insert order status history
          await db.insert(orderStatusHistory).values({
            orderId,
            status: "placed",
            note: "Order placed successfully online",
            location: "Vadodara Web Desk",
            changedBy: "system",
            createdAt: orderDate,
          });

          if (def.status !== "pending") {
            await db.insert(orderStatusHistory).values({
              orderId,
              status: "confirmed",
              note: "Payment verified, sweets batch confirmed with kitchen",
              location: "Raopura Main Kitchen",
              changedBy: "admin",
              createdAt: new Date(orderDate.getTime() + 1 * 3600 * 1000),
            });
          }

          if (def.status === "packed" || def.status === "shipped" || def.status === "delivered") {
            await db.insert(orderStatusHistory).values({
              orderId,
              status: "packed",
              note: "Packaged in hygienic hermetic tins with aroma seal",
              location: "Packaging Section, Vadodara",
              changedBy: "admin",
              createdAt: new Date(orderDate.getTime() + 4 * 3600 * 1000),
            });
          }

          if (def.status === "shipped" || def.status === "delivered") {
            await db.insert(orderStatusHistory).values({
              orderId,
              status: "shipped",
              note: `Handed over to Blue Dart Express (AWB: BD-${seq}789)`,
              location: "Vadodara Logistics Hub",
              changedBy: "admin",
              createdAt: new Date(orderDate.getTime() + 8 * 3600 * 1000),
            });
          }

          if (def.status === "delivered") {
            await db.insert(orderStatusHistory).values({
              orderId,
              status: "delivered",
              note: "Package handed over to recipient. OTP verified.",
              location: `${city} Local Delivery`,
              changedBy: "system",
              createdAt: deliveredDate!,
            });
          }

          if (isCancelled) {
            await db.insert(orderStatusHistory).values({
              orderId,
              status: "cancelled",
              note: "Order cancelled by customer before dispatch",
              location: "Vadodara Support Desk",
              changedBy: "customer",
              createdAt: new Date(orderDate.getTime() + 2 * 3600 * 1000),
            });
          }
        }
      }
    }
  }

  // Ensure all seeded entities are synchronized to MySQL
  await syncEntireDatabaseToMysql();
}

/**
 * Synchronize all entities in Drizzle to MySQL (phpMyAdmin)
 */
export async function syncEntireDatabaseToMysql() {
  try {
    const {
      ensureMysqlTables,
      syncCategoryToMysql,
      syncProductToMysql,
      syncProductVariantToMysql,
      syncStoreToMysql,
      syncOrderToMysql,
      syncUserToMysql,
    } = await import("@/lib/mysql");

    await ensureMysqlTables();

    // 1. Users
    const allUsers = await db.select().from(users);
    for (const u of allUsers) {
      await syncUserToMysql({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash: u.passwordHash,
        role: u.role,
      });
    }

    // 2. Categories
    const allCategories = await db.select().from(categories);
    for (const c of allCategories) {
      await syncCategoryToMysql({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
      });
    }

    // 3. Products
    const allProducts = await db.select().from(products);
    for (const p of allProducts) {
      await syncProductToMysql({
        id: p.id,
        categoryId: p.categoryId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        imageUrl: p.imageUrl,
        tags: p.tags,
        isFeatured: p.isFeatured,
      });
    }

    // 4. Product Variants
    const allVariants = await db.select().from(productVariants);
    for (const v of allVariants) {
      await syncProductVariantToMysql({
        id: v.id,
        productId: v.productId,
        weight: v.weight,
        sku: v.sku,
        price: v.price,
        discountedPrice: v.discountedPrice,
        stock: v.stock,
      });
    }

    // 5. Stores
    const allStores = await db.select().from(stores);
    for (const s of allStores) {
      await syncStoreToMysql({
        id: s.id,
        name: s.name,
        address: s.address,
        city: s.city,
        pincode: s.pincode,
        phone: s.phone,
        hours: s.hours,
        lat: s.lat,
        lng: s.lng,
        mapUrl: (s as any).mapUrl || null,
      });
    }

    // 6. Orders & Items
    const allOrders = await db.select().from(orders);
    const allOrderItems = await db.select().from(orderItems);
    for (const o of allOrders) {
      const items = allOrderItems
        .filter((it) => it.orderId === o.id)
        .map((it) => ({
          productName: it.productName,
          variantWeight: it.variantWeight,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          imageUrl: it.imageUrl,
        }));
      await syncOrderToMysql(
        {
          orderNumber: o.orderNumber,
          userId: o.userId,
          guestName: o.guestName,
          guestPhone: o.guestPhone,
          status: o.status,
          subtotal: o.subtotal,
          discount: o.discount,
          deliveryFee: o.deliveryFee,
          tax: o.tax,
          total: o.total,
          couponCode: o.couponCode,
          addressSnapshot: o.addressSnapshot,
          deliverySlot: o.deliverySlot,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
        },
        items
      );
    }
  } catch (err) {
    console.warn("MySQL full catalog seed sync skipped/notice:", err);
  }
}


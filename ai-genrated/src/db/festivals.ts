import { eq, or, sql } from "drizzle-orm";
import { db, ensureDbMigrations } from "@/db";
import { categories, products, productVariants } from "@/db/schema";
import { getUiConfigSafe, writeUiConfigSafe } from "@/lib/ui-config";

export interface FestivalProductDefinition {
  legacyId: number;
  sku: string;
  slug: string;
  name: string;
  gujaratiName: string;
  badge: string;
  festivalId: string;
  festivalName: string;
  description: string;
  imageUrl: string;
  tags: string[];
  price: number;
  comparePrice: number;
  weight: string;
  stock: number;
}

export const FESTIVAL_DEFINITIONS: FestivalProductDefinition[] = [
  // DIWALI
  {
    legacyId: 901,
    sku: "FEST-901",
    slug: "shahi-diwali-royal-sweets-hamper",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "શાહી દિવાળી ગિફ્ટ હેમ્પર",
    name: "Shahi Diwali Royal Sweets Hamper",
    badge: "Bestseller Hamper",
    description: "Ornate royal festive box filled with premium Kaju Katli, Kesar Peda, Anjeer Roll, and Dry Fruit Bites.",
    imageUrl: "/images/hamper.jpg",
    price: 1450,
    comparePrice: 1750,
    weight: "1 kg",
    stock: 100,
    tags: ["Diwali", "Gift Box", "Pure Ghee", "festival", "diwali"],
  },
  {
    legacyId: 902,
    sku: "FEST-902",
    slug: "silver-leaf-kaju-katli-festive-box",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "સિલ્વર કાજુ કતરી બોક્સ",
    name: "Silver Leaf Kaju Katli Festive Box",
    badge: "Traditional Purity",
    description: "Authentic diamond-cut cashew fudge made with 100% Goan cashews and 99.9% pure silver foil (chandi vark).",
    imageUrl: "/images/kaju-katli-showcase.jpg",
    price: 950,
    comparePrice: 1100,
    weight: "1 kg",
    stock: 100,
    tags: ["Diwali", "Silver Vark", "Cashew", "festival", "diwali"],
  },
  {
    legacyId: 903,
    sku: "FEST-903",
    slug: "heritage-mohanthal-surat-ghari-box",
    festivalId: "diwali",
    festivalName: "Diwali Special",
    gujaratiName: "શુદ્ધ ઘી મોહનથાળ & ઘારી",
    name: "Heritage Mohanthal & Surat Ghari Box",
    badge: "Gujarati Authentic",
    description: "Slow-roasted gram flour mohanthal in Gir cow ghee with pistachios, paired with Surati mawa ghari.",
    imageUrl: "/images/mithai-platter-showcase.jpg",
    price: 880,
    comparePrice: 990,
    weight: "800g",
    stock: 100,
    tags: ["Diwali", "Desi Ghee", "Gujarati Heritage", "festival", "diwali"],
  },

  // DUSSEHRA & NAVRATRI
  {
    legacyId: 904,
    sku: "FEST-904",
    slug: "golden-kesar-jalebi-papdi-fafda-combo",
    festivalId: "dussehra",
    festivalName: "Dussehra & Navratri",
    gujaratiName: "દશેરા સ્પેશ્યલ જલેબી-ફાફડા",
    name: "Golden Kesar Jalebi & Papdi Fafda Combo",
    badge: "Dussehra Tradition",
    description: "Crispy freshly fried saffron-infused jalebi with hot crunchy fafda, raw papaya sambharo, and green kadhi.",
    imageUrl: "/images/jalebi.jpg",
    price: 650,
    comparePrice: 750,
    weight: "500g Jalebi + 250g Fafda",
    stock: 100,
    tags: ["Dussehra", "Morning Live", "Kesar Jalebi", "festival", "dussehra"],
  },
  {
    legacyId: 905,
    sku: "FEST-905",
    slug: "navratri-farali-upvas-sweet-platter",
    festivalId: "dussehra",
    festivalName: "Navratri Special",
    gujaratiName: "નવરાત્રી ફરાળી સ્વીટ્સ બોક્સ",
    name: "Navratri Farali Upvas Sweet Platter",
    badge: "Fasting Pure",
    description: "100% Upvas-friendly farali mithai made with Rajgara flour, roasted makhana, dates, and pure cow ghee.",
    imageUrl: "/images/gujarati-mithai-showcase.jpg",
    price: 720,
    comparePrice: 850,
    weight: "600g",
    stock: 100,
    tags: ["Navratri", "Farali", "Upvas Special", "festival", "navratri"],
  },

  // RAKSHA BANDHAN
  {
    legacyId: 906,
    sku: "FEST-906",
    slug: "rakhi-prem-sweets-box-with-designer-rakhi",
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujaratiName: "રક્ષાબંધન સ્પેશ્યલ ભાઈ-બહેન બોક્સ",
    name: "Rakhi Prem Sweets Box with Designer Rakhi",
    badge: "Sister's Choice",
    description: "Handcrafted Motichoor Ladoo, Kaju Katli, and Roli-Chawal paired with an eco-friendly designer rakhi.",
    imageUrl: "/images/motichoor-showcase.jpg",
    price: 850,
    comparePrice: 990,
    weight: "750g",
    stock: 100,
    tags: ["Rakhi", "Motichoor", "Free Rakhi", "festival", "rakhi"],
  },
  {
    legacyId: 907,
    sku: "FEST-907",
    slug: "sugar-free-anjeer-dry-fruit-roll",
    festivalId: "rakhi",
    festivalName: "Raksha Bandhan",
    gujaratiName: "ડ્રાયફ્રૂટ્સ અંજીર-ખજૂર રોલ",
    name: "Sugar-Free Anjeer & Dry Fruit Roll",
    badge: "Healthy Gifting",
    description: "Naturally sweetened with premium Afghan figs, dates, almonds, and pistachios. No refined sugar.",
    imageUrl: "/images/kaju-katli.jpg",
    price: 1100,
    comparePrice: 1250,
    weight: "500g",
    stock: 100,
    tags: ["Rakhi", "Sugar Free", "Dry Fruits", "festival", "rakhi"],
  },

  // GANESH CHATURTHI
  {
    legacyId: 908,
    sku: "FEST-908",
    slug: "shuddh-desi-ghee-modak-bhog-21-pieces",
    festivalId: "ganesh",
    festivalName: "Ganesh Chaturthi",
    gujaratiName: "શુદ્ધ ઘી મોદક પ્રસાદ બોક્સ",
    name: "Shuddh Desi Ghee Modak Bhog (21 Pieces)",
    badge: "Bapano Bhog",
    description: "Sacred 21-modak assortment: Kesar Mawa Modak, Kaju Modak, Coconut Jaggery Modak, and Malai Peda Modak.",
    imageUrl: "/images/peda.jpg",
    price: 780,
    comparePrice: 890,
    weight: "21 Pcs (800g)",
    stock: 100,
    tags: ["Ganesh Utsav", "21 Modak", "Prasad", "festival", "ganesh"],
  },

  // HOLI & DHULETI
  {
    legacyId: 909,
    sku: "FEST-909",
    slug: "khoya-dry-fruit-gujiya-thandai-peda",
    festivalId: "holi",
    festivalName: "Holi & Dhuleti",
    gujaratiName: "હોળી સ્પેશ્યલ માવા ગુજિયા & ઠંડાઈ પેંડા",
    name: "Khoya Dry Fruit Gujiya & Thandai Peda",
    badge: "Holi Celebration",
    description: "Crispy ghee-fried gujiya stuffed with mawa, cardamom, and roasted nuts, accompanied by saffron thandai peda.",
    imageUrl: "/images/rasmalai.jpg",
    price: 820,
    comparePrice: 950,
    weight: "700g",
    stock: 100,
    tags: ["Holi", "Gujiya", "Thandai", "festival", "holi"],
  },

  // MAKAR SANKRANTI (UTTARAYAN)
  {
    legacyId: 910,
    sku: "FEST-910",
    slug: "uttarayan-royal-chikki-tal-ladoo-hamper",
    festivalId: "uttarayan",
    festivalName: "Makar Sankranti",
    gujaratiName: "ઉત્તરાયણ સ્પેશ્યલ તલ-સીંગ ચીકી હેમ્પર",
    name: "Uttarayan Royal Chikki & Tal Ladoo Hamper",
    badge: "Kite Festival",
    description: "Crunchy Til Chikki, Sing Chikki, Mamra Ladoo, and Organic Jaggery Tal Sankali made in Anand workshop.",
    imageUrl: "/images/namkeen.jpg",
    price: 580,
    comparePrice: 680,
    weight: "1 kg Assortment",
    stock: 100,
    tags: ["Uttarayan", "Chikki", "Jaggery & Sesame", "festival", "uttarayan"],
  },
];

let festivalSeedPromise: Promise<void> | null = null;

export async function ensureFestivalProducts(): Promise<void> {
  if (festivalSeedPromise) return festivalSeedPromise;

  festivalSeedPromise = (async () => {
    await ensureDbMigrations();

    // 1. Ensure category "Festival Specials"
    let [festCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, "festival-specials"))
      .limit(1);

    if (!festCat) {
      try {
        await db
          .insert(categories)
          .values({
            name: "Festival Specials",
            slug: "festival-specials",
            description: "Royal festive gift hampers, pure desi ghee prasad, and traditional celebratory sweet boxes.",
            imageUrl: "/images/hamper.jpg",
            sortOrder: 19,
          });
      } catch {}
      const [fallback] = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, "festival-specials"))
        .limit(1);
      festCat = fallback;
    }

    if (!festCat) return;

    // 2. Insert/Verify all 10 festival products and their variants
    for (const item of FESTIVAL_DEFINITIONS) {
      let [prod] = await db
        .select()
        .from(products)
        .where(eq(products.slug, item.slug))
        .limit(1);

      if (!prod) {
        try {
          await db
            .insert(products)
            .values({
              categoryId: festCat.id,
              name: item.name,
              slug: item.slug,
              description: item.description,
              imageUrl: item.imageUrl,
              tags: item.tags.join(","),
              isFeatured: true,
            });
        } catch {}
        const [existing] = await db
          .select()
          .from(products)
          .where(eq(products.slug, item.slug))
          .limit(1);
        prod = existing;
      }

      if (!prod) continue;

      // Check variant by SKU or legacy ID
      let [variant] = await db
        .select()
        .from(productVariants)
        .where(
          or(
            eq(productVariants.sku, item.sku),
            eq(productVariants.id, item.legacyId),
            eq(productVariants.productId, prod.id)
          )
        )
        .limit(1);

      if (!variant) {
        try {
          await db
            .insert(productVariants)
            .values({
              id: item.legacyId,
              productId: prod.id,
              weight: item.weight,
              sku: item.sku,
              price: item.price,
              discountedPrice: item.comparePrice,
              stock: item.stock,
            });
        } catch {
          try {
            await db
              .insert(productVariants)
              .values({
                productId: prod.id,
                weight: item.weight,
                sku: item.sku,
                price: item.price,
                discountedPrice: item.comparePrice,
                stock: item.stock,
              });
          } catch {}
        }
        const [vFound] = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, prod.id))
          .limit(1);
        variant = vFound;
      } else {
        // If variant exists, ensure stock is healthy (> 0) and prices match
        if (variant.stock <= 0 || variant.price !== item.price) {
          try {
            await db
              .update(productVariants)
              .set({
                stock: Math.max(variant.stock, item.stock),
                price: item.price,
                discountedPrice: item.comparePrice,
              })
              .where(eq(productVariants.id, variant.id));
          } catch {}
        }
      }
    }
  })();

  return festivalSeedPromise;
}

export interface ResolvedFestivalProduct extends FestivalProductDefinition {
  dbProductId: number;
  dbVariantId: number;
  actualStock: number;
  enabled?: boolean;
}

export async function getFestivalProductsWithVariants(): Promise<ResolvedFestivalProduct[]> {
  await ensureFestivalProducts();

  const cfg = getUiConfigSafe();
  const customProducts = cfg?.festivalPage?.customProducts;

  // If custom products array is defined in UI config and has items, use that as the active catalog
  const sourceList: FestivalProductDefinition[] =
    Array.isArray(customProducts) && customProducts.length > 0
      ? customProducts.filter((p: any) => p.enabled !== false)
      : FESTIVAL_DEFINITIONS;

  const results: ResolvedFestivalProduct[] = [];

  for (const item of sourceList) {
    let [row] = await db
      .select({
        productId: products.id,
        variantId: productVariants.id,
        price: productVariants.price,
        discountedPrice: productVariants.discountedPrice,
        stock: productVariants.stock,
        weight: productVariants.weight,
        imageUrl: products.imageUrl,
        name: products.name,
      })
      .from(products)
      .innerJoin(productVariants, eq(productVariants.productId, products.id))
      .where(
        item.slug
          ? eq(products.slug, item.slug)
          : item.legacyId
          ? eq(productVariants.id, item.legacyId)
          : sql`1 = 0`
      )
      .limit(1);

    if (!row && item.name) {
      // If product does not exist in DB yet (e.g. newly added via customProducts), ensure it's in DB
      try {
        let [festCat] = await db
          .select()
          .from(categories)
          .where(eq(categories.slug, "festival-specials"))
          .limit(1);

        if (festCat) {
          const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
          const sku = item.sku || "FEST-" + Math.floor(1000 + Math.random() * 9000);

          const [pInsert] = await db
            .insert(products)
            .values({
              categoryId: festCat.id,
              name: item.name,
              slug,
              description: item.description || "Festive Gujarati delicacy.",
              imageUrl: item.imageUrl || "/images/hamper.jpg",
              tags: Array.isArray(item.tags) ? item.tags.join(",") : item.tags || "festival",
              isFeatured: true,
            });

          const [vInsert] = await db
            .insert(productVariants)
            .values({
              productId: pInsert.insertId,
              sku,
              weight: item.weight || "1 kg",
              price: item.price || 500,
              discountedPrice: item.comparePrice || item.price || 500,
              stock: item.stock || 50,
            });

          results.push({
            ...item,
            slug,
            sku,
            dbProductId: pInsert.insertId,
            dbVariantId: vInsert.insertId,
            actualStock: item.stock || 50,
          });
          continue;
        }
      } catch (err) {
        console.warn("[Festivals] Auto-insert into DB error:", err);
      }
    }

    if (row) {
      results.push({
        ...item,
        dbProductId: row.productId,
        dbVariantId: row.variantId,
        actualStock: row.stock,
        price: row.price,
        comparePrice: row.discountedPrice ?? item.comparePrice,
        weight: row.weight || item.weight,
        imageUrl: row.imageUrl || item.imageUrl,
      });
    } else {
      results.push({
        ...item,
        dbProductId: item.legacyId || 901,
        dbVariantId: item.legacyId || 901,
        actualStock: item.stock || 50,
      });
    }
  }

  return results;
}

export async function saveFestivalProductInDb(item: any): Promise<ResolvedFestivalProduct> {
  await ensureFestivalProducts();

  // Find existing product & variant
  let prodId = item.dbProductId || (item.id && item.id < 900 ? item.id : undefined);
  let varId = item.dbVariantId;

  if (!prodId && item.slug) {
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, item.slug))
      .limit(1);
    if (existing) prodId = existing.id;
  }

  if (prodId) {
    // Update product
    await db
      .update(products)
      .set({
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        tags: Array.isArray(item.tags) ? item.tags.join(",") : item.tags,
      })
      .where(eq(products.id, prodId));

    // Update variant
    if (varId) {
      await db
        .update(productVariants)
        .set({
          price: Number(item.price),
          discountedPrice: item.comparePrice ? Number(item.comparePrice) : null,
          weight: item.weight,
          stock: Number(item.stock),
        })
        .where(eq(productVariants.id, varId));
    } else {
      // Find variant by productId
      const [vRow] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(eq(productVariants.productId, prodId))
        .limit(1);
      if (vRow) {
        varId = vRow.id;
        await db
          .update(productVariants)
          .set({
            price: Number(item.price),
            discountedPrice: item.comparePrice ? Number(item.comparePrice) : null,
            weight: item.weight,
            stock: Number(item.stock),
          })
          .where(eq(productVariants.id, vRow.id));
      }
    }
  } else {
    // Insert new product
    let [festCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, "festival-specials"))
      .limit(1);

    const slug = item.slug || item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    const sku = item.sku || "FEST-" + Math.floor(1000 + Math.random() * 9000);

    const [pInsert] = await db.insert(products).values({
      categoryId: festCat ? festCat.id : 1,
      name: item.name,
      slug,
      description: item.description || "Festive sweet treat.",
      imageUrl: item.imageUrl || "/images/hamper.jpg",
      tags: Array.isArray(item.tags) ? item.tags.join(",") : item.tags || "festival",
      isFeatured: true,
    });

    prodId = pInsert.insertId;

    const [vInsert] = await db.insert(productVariants).values({
      productId: prodId,
      sku,
      weight: item.weight || "1 kg",
      price: Number(item.price) || 500,
      discountedPrice: item.comparePrice ? Number(item.comparePrice) : null,
      stock: Number(item.stock) || 50,
    });

    varId = vInsert.insertId;
  }

  // Update in ui-config.json customProducts
  const cfg = getUiConfigSafe() || {};
  const festPage = cfg.festivalPage || {};
  let customProds: any[] = festPage.customProducts || [];

  if (customProds.length === 0) {
    // Seed with all current definitions first
    customProds = FESTIVAL_DEFINITIONS.map((d) => ({ ...d }));
  }

  const existingIdx = customProds.findIndex(
    (p) =>
      (item.id && p.id === item.id) ||
      (item.legacyId && p.legacyId === item.legacyId) ||
      (item.slug && p.slug === item.slug) ||
      (p.name && p.name.toLowerCase() === item.name.toLowerCase())
  );

  const updatedItem = {
    ...item,
    id: item.id || varId || prodId,
    legacyId: item.legacyId || varId || prodId,
    dbProductId: prodId,
    dbVariantId: varId,
    price: Number(item.price),
    comparePrice: Number(item.comparePrice) || Number(item.price),
    stock: Number(item.stock),
  };

  if (existingIdx >= 0) {
    customProds[existingIdx] = { ...customProds[existingIdx], ...updatedItem };
  } else {
    customProds.push(updatedItem);
  }

  festPage.customProducts = customProds;
  cfg.festivalPage = festPage;
  writeUiConfigSafe(cfg);

  return {
    ...updatedItem,
    actualStock: Number(item.stock),
  };
}

export async function deleteFestivalProductFromDb(idOrLegacyId: number): Promise<boolean> {
  const cfg = getUiConfigSafe() || {};
  const festPage = cfg.festivalPage || {};
  let customProds: any[] = festPage.customProducts || [];

  if (customProds.length === 0) {
    customProds = FESTIVAL_DEFINITIONS.map((d) => ({ ...d }));
  }

  // Remove or set enabled: false
  const updatedProds = customProds.filter(
    (p) => p.id !== idOrLegacyId && p.legacyId !== idOrLegacyId && p.dbVariantId !== idOrLegacyId && p.dbProductId !== idOrLegacyId
  );

  festPage.customProducts = updatedProds;
  cfg.festivalPage = festPage;
  writeUiConfigSafe(cfg);

  return true;
}


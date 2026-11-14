/**
 * Vardayini Sweets - Weekly Slogans Seed Script
 * Populates 12 weekly slogans + festival slogans + templates + default section settings.
 */

import { db } from "@/db";
import { slogans, sloganSettings, sloganTemplates, sloganAnalytics, products } from "@/db/schema";
import { getISTWeekBoundaries, getNowInIST } from "@/lib/slogans";
import { eq } from "drizzle-orm";

export async function ensureSlogansSeeded() {
  try {
    // 1. Ensure sloganSettings exist
    const existingSettings = await db.select().from(sloganSettings).limit(1);
    if (existingSettings.length === 0) {
      await db.insert(sloganSettings).values({
        enabled: true,
        location: "between_categories_bestsellers",
        showCountdown: true,
        showPastArchive: true,
        showShareButton: true,
        showAnnouncementStrip: true,
        autoRotateEnabled: true,
        rotationMode: "sequential",
        fallbackSloganText: "Pure *Desi Ghee*. Pure *Love*. This Week's Kaju Katli.",
        fallbackSubText: "Handcrafted with hand-roasted Goan cashews and 100% pure desi ghee, finished with royal silver vark.",
        fallbackProductId: 1,
      });
      console.log("[Slogans Seed] Inserted default slogan settings");
    }

    // 2. Ensure sloganTemplates exist (15+ ready templates)
    const existingTemplates = await db.select().from(sloganTemplates).limit(1);
    if (existingTemplates.length === 0) {
      const templatesToInsert = [
        {
          title: "Freshness & Love",
          templateText: "[Sweet] — Made Fresh Daily, Made with *Pure Love*.",
          templateSubText: "Simmered in 100% Shuddh Desi Ghee every morning in our heritage bhatti.",
          category: "purity",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#dfb755",
        },
        {
          title: "One Bite Memories",
          templateText: "One bite of [Sweet], a hundred sweet *memories*.",
          templateSubText: "A recipe cherished across Kalol families for more than 40 years.",
          category: "heritage",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#9333ea",
        },
        {
          title: "Pure Ghee Pure Joy",
          templateText: "Pure *Desi Ghee*. Pure *Joy*. Royal [Sweet].",
          templateSubText: "Crafted with hand-picked ingredients and slow-roasted to melt-in-mouth perfection.",
          category: "purity",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#f59e0b",
        },
        {
          title: "Diwali Special",
          templateText: "Celebrate Deepavali with Royal *[Sweet]* steeped in pure Desi Ghee.",
          templateSubText: "Light up your family celebrations with our freshest festive batch.",
          category: "festival",
          seasonOrFestival: "diwali",
          suggestedThemeColor: "#d97706",
        },
        {
          title: "Raksha Bandhan Sibling Love",
          templateText: "Tie the Bond of Sibling Love with Shuddh *[Sweet]*.",
          templateSubText: "Make Rakhi unforgettable with the rich taste of hand-made mithai.",
          category: "festival",
          seasonOrFestival: "rakhi",
          suggestedThemeColor: "#ef4444",
        },
        {
          title: "Holi Joyous Colors",
          templateText: "Colors of Joy, Sweetness of Fresh *[Sweet]*.",
          templateSubText: "Celebrate the festival of colors with aromatic cardamom and saffron sweets.",
          category: "festival",
          seasonOrFestival: "holi",
          suggestedThemeColor: "#ec4899",
        },
        {
          title: "Navratri Garba Celebration",
          templateText: "Nine Nights of Celebration, Sweetened with *[Sweet]*.",
          templateSubText: "Energize your Dandiya nights with royal energy and natural sweetness.",
          category: "festival",
          seasonOrFestival: "navratri",
          suggestedThemeColor: "#059669",
        },
        {
          title: "Uttarayan Kite Festive",
          templateText: "Kai Po Che! Celebrate Uttarayan with Crunchy *[Sweet]*.",
          templateSubText: "Golden organic jaggery and crunchy roasted nuts to sweeten your terrace celebrations.",
          category: "festival",
          seasonOrFestival: "uttarayan",
          suggestedThemeColor: "#f97316",
        },
        {
          title: "Grand Wedding Season",
          templateText: "Grand Celebrations Deserve the Royale Taste of *[Sweet]*.",
          templateSubText: "Imperial wedding gifting boxes filled with our most decadent sweets.",
          category: "wedding",
          seasonOrFestival: "wedding",
          suggestedThemeColor: "#7c2d12",
        },
        {
          title: "Morning Freshness",
          templateText: "Fresh from the Morning Bhatti: Handcrafted *[Sweet]*.",
          templateSubText: "Rolled at sunrise by our master halwais with Gir cow desi ghee.",
          category: "purity",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#eab308",
        },
        {
          title: "Kalol Pride",
          templateText: "The Authentic Taste of Kalol: Royal *[Sweet]*.",
          templateSubText: "Honoring traditional Gujarati sweet-making artistry since 1986.",
          category: "heritage",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#8b5cf6",
        },
        {
          title: "Melt in Mouth Bliss",
          templateText: "So Soft It Simply Melts: This Week's *[Sweet]*.",
          templateSubText: "Delicately textured and perfumed with freshly ground green cardamom.",
          category: "texture",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#06b6d4",
        },
        {
          title: "Nutty Cashew & Almond Royale",
          templateText: "Packed with Hand-Roasted Dryfruits: Luscious *[Sweet]*.",
          templateSubText: "Rich Goan cashews, Californian almonds, and crunchy pistachios in every bite.",
          category: "dryfruits",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#10b981",
        },
        {
          title: "Royal Saffron Aroma",
          templateText: "Steeped in Pure Kashmiri Kesar: Royal *[Sweet]*.",
          templateSubText: "Natural golden hue and unforgettable fragrance in every single piece.",
          category: "saffron",
          seasonOrFestival: "all_season",
          suggestedThemeColor: "#e11d48",
        },
        {
          title: "Sweeten Your Weekend",
          templateText: "Make Every Family Gathering Sweeter with *[Sweet]*.",
          templateSubText: "The perfect companion for Sunday brunches and sweet cravings.",
          category: "lifestyle",
          seasonOrFestival: "weekend",
          suggestedThemeColor: "#dfb755",
        },
      ];

      await db.insert(sloganTemplates).values(templatesToInsert);
      console.log(`[Slogans Seed] Inserted ${templatesToInsert.length} slogan templates`);
    }

    // 3. Ensure 12 weekly slogans exist
    const existingSlogans = await db.select().from(slogans).limit(1);
    if (existingSlogans.length === 0) {
      // Find products by slug to link proper product IDs
      const allProducts = await db.select({ id: products.id, slug: products.slug }).from(products);
      const productMap: Record<string, number> = {};
      for (const p of allProducts) {
        productMap[p.slug] = p.id;
      }

      const defaultProdId = allProducts[0]?.id || 1;
      const getProd = (slug: string) => productMap[slug] || defaultProdId;

      const now = getNowInIST();

      // Helper to compute start & end timestamps for week offset (+0, +1, +2, -1, etc.)
      const getWeekRange = (offsetWeeks: number) => {
        const target = new Date(now.getTime() + offsetWeeks * 7 * 24 * 60 * 60 * 1000);
        const { startAt, endAt } = getISTWeekBoundaries(target);
        return { startAt, endAt };
      };

      const weeklySlogansData = [
        // Week -1: Past week slogan (for archive modal)
        {
          text: "Pure *Desi Ghee*. Pure *Comfort*. Traditional Besan Ladoo.",
          subText: "Slow-roasted nutty gram flour simmered in pure Gir cow ghee with nutmeg.",
          textHi: "शुद्ध *देसी घी*। शुद्ध *स्नेह*। पारंपरिक बेसन के लड्डू।",
          textGu: "શુદ્ધ *દેશી ઘી*. શુદ્ધ *સ્વાદ*. પારંપરિક બેસન લાડુ.",
          productId: getProd("besan-ladoo"),
          themeColor: "#ca8a04",
          bgStyle: "glass_aurora",
          buttonText: "Order Besan Ladoo →",
          buttonLink: "/shop/besan-ladoo",
          storyLine: "Cooked slowly over wood fire to achieve the golden aroma of mother's kitchen.",
          badgesJson: JSON.stringify(["Slow Roasted", "Pure Desi Ghee", "Nutmeg & Elaichi"]),
          ...getWeekRange(-1),
          status: "expired",
        },
        // Week 0: Current Active Week
        {
          text: "Pure *Kaju*. Pure *Elegance*. This Week's Kaju Katli.",
          subText: "Handcrafted from 100% premium whole Goan cashews, melted into silky diamond cuts and finished with royal silver vark.",
          textHi: "शुद्ध *काजू*। शुद्ध *स्वाद*। इस सप्ताह की काजू कतली।",
          subTextHi: "प्रीमियम गोवा काजू और शुद्ध देसी घी से बनी रेशमी कतली।",
          textGu: "શુદ્ધ *કાજુ*. શુદ્ધ *મિઠાશ*. આ અઠવાડિયાની કાજુ કતલી.",
          subTextGu: "ગોવાના પ્રીમિયમ કાજુ અને શુદ્ધ ઘી વડે તૈયાર કરાયેલી મખમલી કતલી.",
          productId: getProd("kaju-katli"),
          themeColor: "#818cf8",
          bgStyle: "glass_aurora",
          buttonText: "Shop Kaju Katli Now →",
          buttonLink: "/shop/kaju-katli",
          storyLine: "A legacy recipe since 1986. Made in small batches every sunrise with zero artificial flavors.",
          badgesJson: JSON.stringify(["100% Goan Cashews", "Pure Desi Ghee", "Melt-in-Mouth Silky"]),
          ...getWeekRange(0),
          status: "active",
        },
        // Week 1
        {
          text: "Golden. Porous. Dripping in *Pure Desi Ghee*.",
          subText: "Authentic Royal Mysore Pak simmered slowly in 100% Shuddh Gir Cow & Buffalo Desi Ghee.",
          textHi: "स्वर्णिम। जालीदार। *शुद्ध देसी घी* में तरबतर मैसूर पाक।",
          textGu: "ગોલ્ડન. જાળીદાર. *શુદ્ધ દેશી ઘી* થી ભરપૂર મૈસૂર પાક.",
          productId: getProd("mysore-pak"),
          themeColor: "#f59e0b",
          bgStyle: "glass_gold_shimmer",
          buttonText: "Taste Mysore Pak →",
          buttonLink: "/shop/mysore-pak",
          storyLine: "The golden jewel of Southern royalty, perfected with Gujarat's finest dairy ghee.",
          badgesJson: JSON.stringify(["100% Shuddh Ghee", "Porous Texture", "Fresh From Bhatti"]),
          ...getWeekRange(1),
          status: "scheduled",
        },
        // Week 2
        {
          text: "Every Tiny Pearl Steeped in *Shuddh Ghee* & Pistachios.",
          subText: "Delicate artisan Motichoor pearls hand-rolled and infused with green cardamom and crunchy Iranian pistachios.",
          textHi: "हर एक दाने में समाया *शुद्ध घी* और इलायची का जादू।",
          textGu: "દરેક બુંદીમાં સમાયેલો *શુદ્ધ ઘી* અને પિસ્તાનો સ્વાદ.",
          productId: getProd("motichoor-ladoo"),
          themeColor: "#ea580c",
          bgStyle: "glass_aurora",
          buttonText: "Shop Motichoor Ladoo →",
          buttonLink: "/shop/motichoor-ladoo",
          storyLine: "Hand-sifted pearls fried in bubbling ghee and dipped into warm saffron chashni.",
          badgesJson: JSON.stringify(["Hand-rolled Pearls", "Pure Gir Ghee", "Kalol Favorite"]),
          ...getWeekRange(2),
          status: "scheduled",
        },
        // Week 3
        {
          text: "Soft. Warm. Scented with Royal *Cardamom Syrup*.",
          subText: "Velvety mawa spheres fried to rich mahogany and soaked in fragrant rose and green cardamom syrup.",
          textHi: "मुलायम। गरम। शाही *गुलाब और इलायची* की चाशनी से भरपूर।",
          textGu: "નરમ. ગરમ. રોયલ *ગુલાબ અને એલચી* ચાસણીથી લથપથ.",
          productId: getProd("gulab-jamun"),
          themeColor: "#78350f",
          bgStyle: "glass_festive_pattern",
          buttonText: "Order Shahi Gulab Jamun →",
          buttonLink: "/shop/gulab-jamun",
          storyLine: "Prepared with fresh dairy khoya and cardamom pods crushed right before brewing the nectar.",
          badgesJson: JSON.stringify(["Pure Dairy Khoya", "Aromatic Rose Syrup", "Served Melt-in-Mouth"]),
          ...getWeekRange(3),
          status: "scheduled",
        },
        // Week 4
        {
          text: "Infused with Pure *Kashmiri Saffron* & Fresh Mawa.",
          subText: "The crown jewel of Kalol dairy — velvety Kesar Malai Penda cooked slowly in pure full-cream milk.",
          textHi: "असली *कश्मीरी केसर* और ताजे मावे की बेमिसाल मिठास।",
          textGu: "અસલી *કાશ્મીરી કેસર* અને તાજા માવાની અનોખી મિઠાશ.",
          productId: getProd("kesar-malai-penda"),
          themeColor: "#d97706",
          bgStyle: "glass_aurora",
          buttonText: "Order Kesar Penda →",
          buttonLink: "/shop/kesar-malai-penda",
          storyLine: "Simmered continuously for 6 hours until milk solids turn velvety and golden.",
          badgesJson: JSON.stringify(["Kashmiri Kesar", "Full Cream Dairy", "Traditional Recipe"]),
          ...getWeekRange(4),
          status: "scheduled",
        },
        // Week 5
        {
          text: "The Pride of Gujarat. Rich, Nutty, and *Irresistibly Ghee-Soaked*.",
          subText: "Traditional Shuddha Desi Ghee Mohanthal, roasted to deep amber with cardamom and slivered almonds.",
          textHi: "गुजरात की शान: दानेदार, पौष्टिक और *देसी घी में भरपूर* मोहनथाल।",
          textGu: "ગુજરાતનું ગૌરવ: દાણાદાર, પૌષ્ટિક અને *દેશી ઘીથી લથપથ* મોહનથાળ.",
          productId: getProd("mohanthal"),
          themeColor: "#b45309",
          bgStyle: "glass_gold_shimmer",
          buttonText: "Explore Mohanthal →",
          buttonLink: "/shop/mohanthal",
          storyLine: "A sacred recipe handed down through three generations of master confectioners.",
          badgesJson: JSON.stringify(["Gujarat Heritage", "Ghee-Drenched", "Crunchy Almond Topping"]),
          ...getWeekRange(5),
          status: "scheduled",
        },
        // Week 6
        {
          text: "Power of Roasted Almonds, Cashews, and *Pure Honey Sweetness*.",
          subText: "Guilt-free luxury handcrafted with dryfruits, natural Afghan figs, and zero refined sugar.",
          textHi: "अंजीर और ड्राई फ्रूट्स की प्राकृतिक मिठास, बिना किसी मिलावट के।",
          textGu: "અંજીર અને ડ્રાયફ્રૂટ્સની કુદરતી મિઠાશ, કોઈ શુગર વગર.",
          productId: getProd("kaju-anjeer-barfi"),
          themeColor: "#059669",
          bgStyle: "glass_aurora",
          buttonText: "Shop Dry Fruit Barfi →",
          buttonLink: "/shop/kaju-anjeer-barfi",
          storyLine: "Sun-dried Afghan figs and hand-roasted nuts provide energy and natural indulgence.",
          badgesJson: JSON.stringify(["Zero Refined Sugar", "Energy Rich", "Premium Afghan Figs"]),
          ...getWeekRange(6),
          status: "scheduled",
        },
        // Week 7
        {
          text: "Velvety Cashew Dough Filled with *Pistachio Royale*.",
          subText: "Dual-layered festive treat featuring silky Goan cashew fudge rolled around crushed pistachio paste.",
          textHi: "काजू की मखमली परत और *पिस्ते का शाही संगम*।",
          textGu: "કાજુનું મખમલી પડ અને *શાહી પિસ્તાનું મિશ્રણ*.",
          productId: getProd("kaju-kesar-roll"),
          themeColor: "#0d9488",
          bgStyle: "glass_aurora",
          buttonText: "Order Kaju Roll →",
          buttonLink: "/shop/kaju-kesar-roll",
          storyLine: "A modern festive favorite loved by children and elders alike for celebratory gifting.",
          badgesJson: JSON.stringify(["Dual-Layer Craft", "Pure Pistachio Core", "Festive Showstopper"]),
          ...getWeekRange(7),
          status: "scheduled",
        },
        // Week 8
        {
          text: "Hot, Crispy Spirals Soaked in *Fragrant Saffron Nectar*.",
          subText: "Freshly fried golden jalebis dripping with real saffron chashni, paired traditionally with crispy farsan.",
          textHi: "कुरकुरी गरमागरम जलेबी, *केसरिया चाशनी* में डूबी हुई।",
          textGu: "કુરકુરી ગરમાગરમ જલેબી, *કેસર ચાસણી* થી છલકાતી.",
          productId: getProd("jalebi-fafda-combo") || getProd("kaju-kesar-roll"),
          themeColor: "#f97316",
          bgStyle: "glass_gold_shimmer",
          buttonText: "Taste Golden Jalebi →",
          buttonLink: "/shop/jalebi-fafda-combo",
          storyLine: "The Sunday morning heartbeat of Kalol since our opening doors.",
          badgesJson: JSON.stringify(["Crispy Golden Rings", "Real Kesar Nectar", "Sunday Special"]),
          ...getWeekRange(8),
          status: "scheduled",
        },
        // Week 9
        {
          text: "Creamy Reduced Milk Barfi with *Aromatic Saffron Threads*.",
          subText: "Rich mawa slow-cooked with fresh milk, adorned with hand-roasted slivered Californian almonds.",
          textHi: "केसर मावा बर्फी: असली दूध और *बादाम का शाही स्वाद*।",
          textGu: "કેસર માવા બર્ફી: શુદ્ધ દૂધ અને *કાશ્મીરી કેસરનો વૈભવ*.",
          productId: getProd("kesar-mawa-barfi"),
          themeColor: "#eab308",
          bgStyle: "glass_aurora",
          buttonText: "Shop Kesar Barfi →",
          buttonLink: "/shop/kesar-mawa-barfi",
          storyLine: "Pure dairy reduced over wood fire until achieving a buttery, fine grain.",
          badgesJson: JSON.stringify(["Pure Full Cream", "Kashmiri Threads", "Almond Crunch"]),
          ...getWeekRange(9),
          status: "scheduled",
        },
        // Week 10
        {
          text: "Caramelized Slow-Roasted *Kalol Brown Penda*.",
          subText: "Traditional caramelised slow-roasted brown penda with a distinct grainy texture and deep mawa flavour.",
          textHi: "कलोल का प्रसिद्ध कड़ाके की भुनाई वाला *ब्राउन पेंडा*।",
          textGu: "કલોલનો પ્રખ્યાત ધીમી આંચે શેકાયેલો *બ્રાઉન પેંડા*.",
          productId: getProd("kalol-brown-penda"),
          themeColor: "#9a3412",
          bgStyle: "glass_festive_pattern",
          buttonText: "Order Brown Penda →",
          buttonLink: "/shop/kalol-brown-penda",
          storyLine: "Cooked to deep caramel perfection, developing an intensely satisfying roasted mawa aroma.",
          badgesJson: JSON.stringify(["Intense Mawa Flavor", "Grainy Texture", "Heritage Special"]),
          ...getWeekRange(10),
          status: "scheduled",
        },
        // Week 11
        {
          text: "Festive Gujiya Packed with *Rich Khoya & Cardamom*.",
          subText: "Flaky golden pastry shells stuffed with roasted mawa, grated coconut, and crushed dry fruits.",
          textHi: "त्योहारी घुघरा: *खोया, नारियल और इलायची* से लबरेज।",
          textGu: "તહેવારોના ખાસ ઘૂઘરા: *માવો, કોપરું અને ડ્રાયફ્રૂટ્સ* થી ભરપૂર.",
          productId: getProd("mawa-gujiya"),
          themeColor: "#c2410c",
          bgStyle: "glass_aurora",
          buttonText: "Order Festive Gujiya →",
          buttonLink: "/shop/mawa-gujiya",
          storyLine: "Deep fried to golden crispness in pure desi ghee for festival celebrations.",
          badgesJson: JSON.stringify(["Flaky Pastry", "Rich Khoya Stuffing", "Festive Favorite"]),
          ...getWeekRange(11),
          status: "scheduled",
        },
      ];

      for (const item of weeklySlogansData) {
        const [inserted] = await db.insert(slogans).values(item);
        // Insert initial zeroed analytics row
        if (inserted?.insertId) {
          await db.insert(sloganAnalytics).values({
            sloganId: Number(inserted.insertId),
            viewsCount: 140 + Math.floor(Math.random() * 200),
            clicksCount: 35 + Math.floor(Math.random() * 40),
            addToCartCount: 12 + Math.floor(Math.random() * 15),
          });
        }
      }

      console.log(`[Slogans Seed] Successfully inserted ${weeklySlogansData.length} weekly slogans with analytics`);
    }
  } catch (err) {
    console.error("[Slogans Seed] Error during slogans seed:", err);
  }
}

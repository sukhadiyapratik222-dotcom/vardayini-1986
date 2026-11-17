"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";
import { toast } from "@/lib/toast";

type SubTab = "tagging" | "builder" | "personalities" | "settings" | "simulator" | "leads";

const QUESTION_TEMPLATES = [
  {
    id: "festival_season",
    title: "Which sacred festival or family celebration are you preparing for?",
    subtitle: "Tailors recommendations for auspicious occasions, rituals, and gifts",
    icon: "🪔",
    badge: "Festivals & Poojas",
    weight: 25,
    isStrictFilter: false,
    options: [
      { key: "diwali", label: "Diwali & New Year Splendour", description: "Rich Golden Kesar Kaju Katli & Royal Hampers", icon: "🎆", tagMapping: { occasions: "festival" } },
      { key: "rakhi", label: "Raksha Bandhan Sibling Bond", description: "Velvety Mawa Pedas, Pistachio Rolls & Sweets", icon: "🧵", tagMapping: { occasions: "festival" } },
      { key: "ganesh", label: "Ganesh Utsav & Home Pooja", description: "Pure Desi Cow Ghee Modaks & Shuddh Boondi Ladoos", icon: "🌺", tagMapping: { occasions: "festival" } },
      { key: "wedding", label: "Wedding & Milestone Gift Box", description: "Luxury Assorted Dry Fruit Gift Hampers", icon: "💍", tagMapping: { occasions: "wedding_gifting" } },
      { key: "everyday", label: "Everyday Evening Tea Cravings", description: "Fresh Mohanthal, Kopra Pak & Crisp Namkeen", icon: "☕", tagMapping: { occasions: "everyday" } },
    ],
  },
  {
    id: "texture_preference",
    title: "What mouthfeel texture delights your sweet tooth the most?",
    subtitle: "Every recipe has its own tactile signature and richness",
    icon: "🌰",
    badge: "Texture & Feel",
    weight: 20,
    isStrictFilter: false,
    options: [
      { key: "melt_in_mouth", label: "Silky Melt-in-Mouth", description: "Ultra-fine Cashew dough & delicate Kesar Penda", icon: "🧈", tagMapping: { texture: "melt_in_mouth" } },
      { key: "crisp_flaky", label: "Crisp & Golden Flaky", description: "Honeycomb Mysore Pak & Desi Ghee Mohanthal", icon: "🥞", tagMapping: { texture: "crisp" } },
      { key: "nutty_crunch", label: "Nut-Rich & Crunchy", description: "Almond Katli, Pista Rolls & Roasted Dry Fruit Bites", icon: "🥜", tagMapping: { containsNuts: "yes" } },
      { key: "rich_chewy", label: "Rich & Soft Chewy", description: "Anjeer Dry Fruit Halwa & Traditional Ladoos", icon: "🍯", tagMapping: { texture: "chewy" } },
    ],
  },
  {
    id: "dietary_lifestyle",
    title: "Do you have any dietary or health preferences?",
    subtitle: "We craft pure treats tailored to wellness-conscious sweet lovers",
    icon: "🌿",
    badge: "Diet & Health",
    weight: 30,
    isStrictFilter: false,
    options: [
      { key: "sugarless", label: "Sugar-Free / Natural Fig & Dates", description: "Zero refined cane sugar, sweetened only with anjeer & dates", icon: "🍃", tagMapping: { sweetnessLevel: "low", dietaryTags: "sugar_free" } },
      { key: "pure_cow_ghee", label: "100% Gir Cow Desi Ghee", description: "Golden aroma, nourishing and traditional heritage purity", icon: "🥛", tagMapping: { dietaryTags: "pure_ghee" } },
      { key: "dryfruit_dense", label: "Nut & Protein Dense", description: "Loaded with California Almonds & Whole W-240 Cashews", icon: "🌰", tagMapping: { containsNuts: "yes" } },
      { key: "classic_festive", label: "Classic Heritage Richness", description: "Authentic full festive sweet intensity with chandi varq", icon: "👑", tagMapping: { sweetnessLevel: "high" } },
    ],
  },
  {
    id: "gifting_intent",
    title: "Who is this royal sweet box meant for?",
    subtitle: "We customize packaging elegance and flavour balance for your recipient",
    icon: "🎁",
    badge: "Gifting Recipient",
    weight: 20,
    isStrictFilter: false,
    options: [
      { key: "elders", label: "Elders & Traditional Connoisseurs", description: "Nostalgic 1976 recipes like Magas, Mohanthal & Penda", icon: "👴", tagMapping: { occasions: "everyday,festival" } },
      { key: "corporate", label: "Corporate VIP Clients & Colleagues", description: "Sophisticated luxury packaging & dry fruit assortment", icon: "💼", tagMapping: { occasions: "wedding_gifting" } },
      { key: "family", label: "Family & Cousins Gathering", description: "Crowd-pleasers: Kaju Katli, Motichoor Ladoo & Crisp Sev", icon: "👨‍👩‍👧‍👦", tagMapping: { occasions: "festival" } },
      { key: "self", label: "Personal Weekend Sweet Indulgence", description: "Fresh morning batch handcrafted just for you", icon: "🛋️", tagMapping: { occasions: "everyday" } },
    ],
  },
  {
    id: "sweet_savory_balance",
    title: "Do you crave pure sweets or a sweet + crunchy farsan pairing?",
    subtitle: "The timeless Gujarati custom of sweet and crisp balance",
    icon: "🌶️",
    badge: "Sweet vs Savory",
    weight: 25,
    isStrictFilter: false,
    options: [
      { key: "sweet_only", label: "Pure Sweets Only", description: "100% decadent royal mithai indulgence", icon: "🍬", tagMapping: { categorySlug: "sweets" } },
      { key: "sweet_and_salty", label: "Sweet & Crunchy Farsan Duet", description: "Mithai paired with Banana Wafers & Farsi Puri crisps", icon: "🥟", tagMapping: { occasions: "everyday" } },
      { key: "farsan_focused", label: "Crisp Farsan & Savory Focus", description: "Tikha Gathiya, Nylon Khaman & Roasted crisps", icon: "🧂", tagMapping: { categorySlug: "farsan" } },
    ],
  },
  {
    id: "culinary_era",
    title: "Which culinary generation speaks to your palate?",
    subtitle: "Choose between authentic 1976 recipes or contemporary chef creations",
    icon: "🏛️",
    badge: "Heritage vs Modern",
    weight: 20,
    isStrictFilter: false,
    options: [
      { key: "classic_1976", label: "Authentic 1976 Heritage Recipes", description: "Pure Desi Ghee Mohanthal, Kopra Pak & Boondi Ladoo", icon: "📜", tagMapping: { dietaryTags: "pure_ghee" } },
      { key: "modern_fusion", label: "2026 Modern Artisanal Twists", description: "Baked Kaju Tarts, Mango Bites & Fusion Halwa", icon: "🎨", tagMapping: { dietaryTags: "modern" } },
      { key: "both_worlds", label: "Best of Both Generations", description: "Curated harmonious balance of heritage & new launches", icon: "⚖️", tagMapping: {} },
    ],
  },
];

export function TasteQuizTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("tagging");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Tagging State
  const [products, setProducts] = useState<any[]>([]);
  const [tagStats, setTagStats] = useState({ total: 0, tagged: 0, untagged: 0 });
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [savingProductId, setSavingProductId] = useState<number | null>(null);

  // 2. Questions Builder State
  const [questions, setQuestions] = useState<any[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [genMode, setGenMode] = useState<"preset" | "ai" | "custom">("preset");
  const [aiTopic, setAiTopic] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);
  const [expandedOptionsQKey, setExpandedOptionsQKey] = useState<string | null>(null);

  const [newQuestionDraft, setNewQuestionDraft] = useState({
    key: "",
    title: "",
    subtitle: "",
    icon: "✨",
    weight: 20,
    isStrictFilter: false,
    isEnabled: true,
    options: [
      { key: "opt_1", label: "Option 1", description: "", icon: "🍯", tagMapping: {} },
      { key: "opt_2", label: "Option 2", description: "", icon: "🌰", tagMapping: {} },
      { key: "opt_3", label: "Option 3", description: "", icon: "✨", tagMapping: {} },
    ],
  });

  // 3. Personalities State
  const [personalities, setPersonalities] = useState<any[]>([]);
  const [editingPersonality, setEditingPersonality] = useState<any | null>(null);
  const [savingPersonality, setSavingPersonality] = useState(false);

  // 4. Settings State
  const [settings, setSettings] = useState<any>({
    isEnabled: true,
    leadCaptureEnabled: true,
    leadCaptureHeading: "Where should we send your mithai match?",
    leadCaptureSubheading: "Save your personalized taste profile & unlock a special festive welcome code.",
    maxResults: 4,
    comboDiscountPercent: 10,
    allergyDisclaimer: "",
    pinnedProductId: null,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // 5. Simulator State
  const [simAnswers, setSimAnswers] = useState<Record<string, string>>({
    sweetness: "medium",
    nuts: "love_nuts",
    occasion: "festival",
    budget: "500_1000",
    type: "dry",
  });
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);

  // 6. Leads State
  const [leads, setLeads] = useState<any[]>([]);

  const showNotice = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [tagsRes, qRes, pRes, sRes, lRes] = await Promise.all([
        api.getQuizTags().catch(() => ({ products: [], stats: { total: 0, tagged: 0, untagged: 0 } })),
        api.getQuizQuestions().catch(() => ({ questions: [] })),
        api.getQuizPersonalities().catch(() => ({ personalities: [] })),
        api.getQuizSettings().catch(() => ({ settings: {} })),
        api.getQuizLeads().catch(() => ({ leads: [], totalCount: 0 })),
      ]);

      setProducts(tagsRes.products || []);
      setTagStats(tagsRes.stats || { total: 0, tagged: 0, untagged: 0 });
      setQuestions(qRes.questions || []);
      setPersonalities(pRes.personalities || []);
      if (sRes.settings) setSettings(sRes.settings);
      setLeads(lRes.leads || []);
    } catch (err: any) {
      showNotice("error", err.message || "Failed to load taste quiz data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handle single product tag update
  const handleSaveProductTags = async (product: any) => {
    try {
      setSavingProductId(product.id);
      await api.updateQuizTags(product.id, {
        sweetnessLevel: product.sweetnessLevel || "medium",
        containsNuts: product.containsNuts || "no",
        mithaiType: product.mithaiType || "dry",
        occasions: product.occasions || "everyday",
        dietaryTags: product.dietaryTags || "pure_ghee",
        quizDescription: product.quizDescription || "",
        isFeaturedInQuiz: Boolean(product.isFeaturedInQuiz),
      });
      showNotice("success", `Saved tags for "${product.name}"`);
      // Update local stats
      setTagStats((prev) => ({
        ...prev,
        tagged: prev.tagged + (product.tagId ? 0 : 1),
        untagged: Math.max(0, prev.untagged - (product.tagId ? 0 : 1)),
      }));
    } catch (err: any) {
      showNotice("error", err.message || "Failed to save tags");
    } finally {
      setSavingProductId(null);
    }
  };

  // Auto-tag all products
  const handleAutoTagAll = async () => {
    try {
      setLoading(true);
      const res = await api.autoTagQuizProducts();
      showNotice("success", res.message || "Auto-tagged products successfully!");
      await loadAllData();
    } catch (err: any) {
      showNotice("error", err.message || "Auto-tagging failed");
    } finally {
      setLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.updateQuizSettings(settings);
      showNotice("success", "Taste Quiz settings saved!");
    } catch (err: any) {
      showNotice("error", err.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // QUESTION GENERATION & MANAGEMENT HANDLERS
  // ─────────────────────────────────────────────────────────────

  // Select a preset curated template
  const handleSelectPresetTemplate = (tpl: (typeof QUESTION_TEMPLATES)[0]) => {
    const cleanKey = `${tpl.id}_${Date.now().toString().slice(-4)}`;
    setNewQuestionDraft({
      key: cleanKey,
      title: tpl.title,
      subtitle: tpl.subtitle,
      icon: tpl.icon,
      weight: tpl.weight,
      isStrictFilter: tpl.isStrictFilter,
      isEnabled: true,
      options: tpl.options.map((opt) => ({ ...opt })),
    });
    toast.success(`Loaded "${tpl.badge}" template! Review details below and click Add.`);
  };

  // Generate question using AI prompt
  const handleGenerateAiQuestion = () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a topic or theme to generate a question.");
      return;
    }
    setGeneratingAi(true);

    const topic = aiTopic.trim().toLowerCase();
    const cleanKey = `q_${topic.replace(/[^a-z0-9]+/g, "_").slice(0, 30)}_${Date.now().toString().slice(-4)}`;

    setTimeout(() => {
      let icon = "✨";
      let title = `What is your preference regarding ${aiTopic.trim()}?`;
      let subtitle = `Personalize your mithai box with your preferred ${aiTopic.trim()}`;
      let options = [
        { key: "opt_classic", label: `Traditional ${aiTopic.trim()}`, description: "Authentic traditional style with time-honored preparation", icon: "👑", tagMapping: {} },
        { key: "opt_light", label: `Light & Subtle ${aiTopic.trim()}`, description: "Milder, balanced profile for everyday enjoyment", icon: "🍃", tagMapping: {} },
        { key: "opt_premium", label: `Royal Premium ${aiTopic.trim()}`, description: "Richly crafted with premium ingredients and nuts", icon: "⭐", tagMapping: {} },
      ];

      if (topic.includes("spice") || topic.includes("namkeen") || topic.includes("farsan") || topic.includes("chili")) {
        icon = "🌶️";
        title = "What spiciness and crispness level do you enjoy in your farsan?";
        subtitle = "From mild aromatic crunch to bold Gujarati peppery punch";
        options = [
          { key: "mild", label: "Mild & Buttery Crunch", description: "Bhavnagari Gathiya & Salted Banana Wafers", icon: "🥟", tagMapping: { categorySlug: "farsan" } },
          { key: "medium", label: "Medium Spiced & Tangy", description: "Nylon Khaman & Mixed Farsan with green chillies", icon: "🥗", tagMapping: { categorySlug: "farsan" } },
          { key: "spicy", label: "Bold & Peppery Tikha", description: "Tikha Gathiya & Mari Black Pepper Farsi Puri", icon: "🔥", tagMapping: { categorySlug: "farsan" } },
        ];
      } else if (topic.includes("ghee") || topic.includes("milk") || topic.includes("dairy") || topic.includes("mawa")) {
        icon = "🥛";
        title = "Do you prefer Desi Ghee richness or creamy milk Mawa sweets?";
        subtitle = "The two foundations of Gujarat's finest royal sweet-making";
        options = [
          { key: "ghee", label: "Pure Desi Cow Ghee Dominance", description: "Aromatic Mohanthal, Mysore Pak & Churma Ladoo", icon: "🧈", tagMapping: { mithaiType: "ghee_based" } },
          { key: "mawa", label: "Velvety Milk Mawa / Khoya", description: "Kesar Penda, Mathura Peda & Gulab Jamun", icon: "🥛", tagMapping: { mithaiType: "milk_based" } },
          { key: "dryfruit", label: "Dry Fruit Base (Ghee & Mawa Light)", description: "Kaju Katli, Badam Bites & Anjeer Rolls", icon: "🌰", tagMapping: { mithaiType: "dry" } },
        ];
      } else if (topic.includes("winter") || topic.includes("cold") || topic.includes("gundar") || topic.includes("adadiya")) {
        icon = "❄️";
        title = "Which seasonal winter warmth treats do you relish?";
        subtitle = "Nutrient-packed winter vitality batches crafted with warming herbs";
        options = [
          { key: "adadiya", label: "Adadiya Pak", description: "Rich black urad & warming ayurvedic spices", icon: "🥣", tagMapping: { occasions: "winter" } },
          { key: "gundar", label: "Gundar Pak & Methi Ladoo", description: "Edible gum, almond & pure ghee strength", icon: "💪", tagMapping: { occasions: "winter" } },
          { key: "khajur", label: "Khajur Dry Fruit Roll", description: "Natural dates, figs & toasted sesame crunch", icon: "🌴", tagMapping: { occasions: "winter" } },
        ];
      } else if (topic.includes("packaging") || topic.includes("box") || topic.includes("hamper") || topic.includes("gift")) {
        icon = "📦";
        title = "What style of gift packaging suits your celebration?";
        subtitle = "From eco-conscious craft boxes to luxury gold foil hampers";
        options = [
          { key: "heritage_tin", label: "Royal Heritage Tin / Crest Box", description: "Keepsake embossed tin box with satin ribbon", icon: "🎖️", tagMapping: { occasions: "wedding_gifting" } },
          { key: "luxury_hamper", label: "Luxury Tiered Festival Hamper", description: "Multi-compartment velvet box with sweets & farsan", icon: "🎁", tagMapping: { occasions: "wedding_gifting" } },
          { key: "eco_fresh", label: "Fresh Daily Eco-Kraft Box", description: "Recyclable minimal box designed for immediate serving", icon: "🌿", tagMapping: { occasions: "everyday" } },
        ];
      }

      setNewQuestionDraft({
        key: cleanKey,
        title,
        subtitle,
        icon,
        weight: 20,
        isStrictFilter: false,
        isEnabled: true,
        options,
      });

      setGeneratingAi(false);
      toast.success("✨ Question generated! You can preview and edit it below.");
    }, 450);
  };

  // Add the newly created draft question to active quiz flow
  const handleAddQuestionToQuiz = () => {
    if (!newQuestionDraft.title.trim()) {
      toast.error("Question title is required.");
      return;
    }
    const finalKey = (newQuestionDraft.key || `q_${Date.now()}`).trim();
    if (questions.some((q) => q.key === finalKey)) {
      toast.error(`Question key "${finalKey}" already exists. Please choose a unique key.`);
      return;
    }
    const newQ = {
      ...newQuestionDraft,
      key: finalKey,
      stepNumber: questions.length + 1,
      isNew: true,
    };
    setQuestions((prev) => [...prev, newQ]);
    setShowQuestionModal(false);
    toast.success(`✓ Question added as Step ${questions.length + 1}! Click "Save & Make Live" to publish.`);
  };

  // Step reordering
  const handleMoveQUp = (idx: number) => {
    if (idx <= 0) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = temp;
      return copy.map((q, i) => ({ ...q, stepNumber: i + 1 }));
    });
  };

  const handleMoveQDown = (idx: number) => {
    if (idx >= questions.length - 1) return;
    setQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = temp;
      return copy.map((q, i) => ({ ...q, stepNumber: i + 1 }));
    });
  };

  // Delete question
  const handleDeleteQuestion = (qKey: string) => {
    if (!confirm(`Are you sure you want to delete this question?`)) return;
    setQuestions((prev) =>
      prev
        .filter((q) => q.key !== qKey)
        .map((q, i) => ({ ...q, stepNumber: i + 1 }))
    );
    toast.info("Question removed from flow. Click Save to apply live.");
  };

  // Option management for existing questions
  const handleAddOptionToQuestion = (qKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = q.options || [];
        const newOpt = {
          key: `opt_${Date.now().toString().slice(-4)}`,
          label: `New Choice ${opts.length + 1}`,
          description: "Freshly added taste choice",
          icon: "✨",
          sortOrder: opts.length + 1,
          tagMapping: {},
        };
        return { ...q, options: [...opts, newOpt] };
      })
    );
  };

  const handleDeleteOptionFromQuestion = (qKey: string, optKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = (q.options || []).filter((o: any) => o.key !== optKey);
        return { ...q, options: opts };
      })
    );
  };

  // Master Save Questions to DB
  const handleSaveQuestions = async () => {
    try {
      setSavingQuestions(true);
      const res = await api.updateQuizQuestions(questions);
      if (res?.questions) {
        setQuestions(res.questions);
      }
      showNotice("success", "✓ Taste Quiz questions saved and now LIVE on /find-your-mithai!");
      toast.success("✓ Taste Quiz updated! New questions are now LIVE on /find-your-mithai");
    } catch (err: any) {
      showNotice("error", err.message || "Failed to update questions");
      toast.error(err.message || "Failed to update questions");
    } finally {
      setSavingQuestions(false);
    }
  };

  // Save Personality Modal
  const handleSavePersonality = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPersonality) return;
    try {
      setSavingPersonality(true);
      await api.updateQuizPersonality(editingPersonality);
      showNotice("success", `Updated personality "${editingPersonality.name}"`);
      setEditingPersonality(null);
      const res = await api.getQuizPersonalities();
      setPersonalities(res.personalities || []);
    } catch (err: any) {
      showNotice("error", err.message || "Failed to save personality");
    } finally {
      setSavingPersonality(false);
    }
  };

  // Run Simulator
  const handleRunSimulation = async () => {
    try {
      setSimulating(true);
      const res = await api.testQuizSimulation(simAnswers);
      setSimResult(res.result);
      showNotice("success", `Simulation complete: Matched ${res.result?.personality?.name}`);
    } catch (err: any) {
      showNotice("error", err.message || "Simulation failed");
    } finally {
      setSimulating(false);
    }
  };

  // Filtered Products for Tagging
  const displayedProducts = products.filter((p) => {
    if (filterUntagged && p.tagId) return false;
    if (tagSearch.trim()) {
      const q = tagSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.categoryName || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-md transition ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0b2f8a] via-[#143a99] to-[#071c54] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest bg-[#dfb755] text-[#071c54]">
            <span>✨ AI Taste Match Engine</span>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-extrabold text-[#dfb755]">
            &ldquo;Find Your Mithai&rdquo; Taste Quiz Builder
          </h1>
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
            Personalize your store visitors&apos; shopping journey with an interactive 5-question taste quiz. Configure questions, tag products, edit personalities, and capture qualified leads.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="http://localhost:9449/find-your-mithai"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition flex items-center gap-2"
          >
            <span>Live Customer Quiz</span>
            <span>↗</span>
          </a>
          <button
            type="button"
            onClick={loadAllData}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#dfb755] hover:bg-[#c9a243] text-[#071c54] shadow-md transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* SubTab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { id: "tagging", label: "Product Tags & Bulk Editor", icon: "🏷️", badge: tagStats.untagged > 0 ? `⚠️ ${tagStats.untagged} untagged` : undefined },
          { id: "builder", label: "Questions & Weights", icon: "❓" },
          { id: "personalities", label: "Mithai Personalities", icon: "👑" },
          { id: "settings", label: "Quiz & Lead Settings", icon: "⚙️" },
          { id: "simulator", label: "Interactive Simulator", icon: "🧪" },
          { id: "leads", label: "Captured Leads", icon: "👥", badge: leads.length || undefined },
        ].map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id as SubTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                isActive
                  ? "bg-[#0b2f8a] text-white shadow-md shadow-[#0b2f8a]/20"
                  : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? "bg-[#dfb755] text-[#071c54]" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 1: PRODUCT TAGS & BULK EDITOR
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "tagging" && (
        <div className="space-y-4">
          {/* Stats & Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Catalog</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{tagStats.total}</p>
              <p className="text-[10px] text-slate-400">Products in active catalog</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-xs font-bold text-emerald-800 uppercase">Tagged for Quiz</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">{tagStats.tagged}</p>
              <p className="text-[10px] text-emerald-700">Ready for taste matching</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 uppercase">Untagged Warning</span>
                <p className="text-2xl font-black text-amber-900 mt-1">{tagStats.untagged}</p>
                <p className="text-[10px] text-amber-700">Missing taste attributes</p>
              </div>
              <button
                type="button"
                onClick={handleAutoTagAll}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-xs"
              >
                Auto-Tag All ✨
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[240px]">
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full max-w-sm px-3.5 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#0b2f8a]"
              />
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterUntagged}
                  onChange={(e) => setFilterUntagged(e.target.checked)}
                  className="rounded text-[#0b2f8a] focus:ring-[#0b2f8a]"
                />
                <span>Show Untagged Only ({tagStats.untagged})</span>
              </label>
            </div>

            <div className="text-xs font-bold text-slate-500">
              Showing {displayedProducts.length} of {products.length} products
            </div>
          </div>

          {/* Tagging Table */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Sweetness</th>
                  <th className="p-3.5">Contains Nuts?</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Occasion</th>
                  <th className="p-3.5">Quiz &ldquo;Why it suits&rdquo;</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedProducts.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    {/* Product Name & Image */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                          <Image src={p.imageUrl || "/images/kaju-katli.jpg"} alt={p.name} fill className="object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.categoryName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Sweetness */}
                    <td className="p-3.5">
                      <select
                        value={p.sweetnessLevel || "medium"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProducts((prev) =>
                            prev.map((item) => (item.id === p.id ? { ...item, sweetnessLevel: val } : item))
                          );
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      >
                        <option value="low">Low / Subtle</option>
                        <option value="medium">Medium / Balanced</option>
                        <option value="high">High / Rich</option>
                        <option value="none">None (Namkeen)</option>
                      </select>
                    </td>

                    {/* Nuts */}
                    <td className="p-3.5">
                      <select
                        value={p.containsNuts || "no"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProducts((prev) =>
                            prev.map((item) => (item.id === p.id ? { ...item, containsNuts: val } : item))
                          );
                        }}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-semibold ${
                          p.containsNuts === "yes"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : "bg-emerald-50 text-emerald-900 border-emerald-300"
                        }`}
                      >
                        <option value="no">No Nuts (Allergy Safe)</option>
                        <option value="yes">Contains Nuts</option>
                        <option value="may_contain">May Contain</option>
                      </select>
                    </td>

                    {/* Mithai Type */}
                    <td className="p-3.5">
                      <select
                        value={p.mithaiType || "dry"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProducts((prev) =>
                            prev.map((item) => (item.id === p.id ? { ...item, mithaiType: val } : item))
                          );
                        }}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                      >
                        <option value="dry">Dry Sweet (Barfi, Kaju)</option>
                        <option value="milk_based">Milk-based (Peda, Mawa)</option>
                        <option value="ghee_based">Ghee-based (Mohanthal)</option>
                        <option value="namkeen">Namkeen / Farsan</option>
                        <option value="bakery">Bakery / Biscuit</option>
                      </select>
                    </td>

                    {/* Occasion */}
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={p.occasions || "everyday"}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProducts((prev) =>
                            prev.map((item) => (item.id === p.id ? { ...item, occasions: val } : item))
                          );
                        }}
                        placeholder="festival,everyday..."
                        className="w-32 px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </td>

                    {/* Why this suits you custom description */}
                    <td className="p-3.5">
                      <input
                        type="text"
                        value={p.quizDescription || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProducts((prev) =>
                            prev.map((item) => (item.id === p.id ? { ...item, quizDescription: val } : item))
                          );
                        }}
                        placeholder="e.g. Rich cashew diamonds with pure edible silver foil..."
                        className="w-56 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </td>

                    {/* Action */}
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        disabled={savingProductId === p.id}
                        onClick={() => handleSaveProductTags(p)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-xs disabled:opacity-50"
                      >
                        {savingProductId === p.id ? "Saving..." : "Save Tags"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 2: QUIZ QUESTIONS & WEIGHTS BUILDER + GENERATOR
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "builder" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🪄</span>
                <h2 className="text-base font-bold text-slate-900">Quiz Questions &amp; Recommendation Flow</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#0b2f8a]">
                  {questions.length} Steps
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate new questions, reorder steps, edit choices, and publish live to <code>/find-your-mithai</code>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setShowQuestionModal(true);
                  setGenMode("preset");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span>✨</span>
                <span>Generate New Question</span>
              </button>

              <button
                type="button"
                disabled={savingQuestions}
                onClick={handleSaveQuestions}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <span>{savingQuestions ? "Saving..." : "Save & Make Live 🚀"}</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const isOptionsExpanded = expandedOptionsQKey === q.key;
              return (
                <div
                  key={q.key || idx}
                  className={`p-5 rounded-2xl bg-white border shadow-xs space-y-4 transition ${
                    q.isNew ? "border-amber-400 bg-amber-50/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-xl bg-slate-100">{q.icon || "🍯"}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            Step {idx + 1} of {questions.length}
                          </span>
                          {q.isNew && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              🌟 New (Unsaved)
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">key: {q.key}</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">{q.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      {/* Step Reordering Controls */}
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveQUp(idx)}
                          title="Move step up"
                          className="h-7 w-7 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs transition"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === questions.length - 1}
                          onClick={() => handleMoveQDown(idx)}
                          title="Move step down"
                          className="h-7 w-7 rounded-lg bg-white disabled:opacity-30 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shadow-2xs transition"
                        >
                          ↓
                        </button>
                      </div>

                      <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <span>Weight:</span>
                        <input
                          type="number"
                          value={q.weight ?? 20}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setQuestions((prev) =>
                              prev.map((item) => (item.key === q.key ? { ...item, weight: val } : item))
                            );
                          }}
                          className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                      </label>

                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(q.isStrictFilter)}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setQuestions((prev) =>
                              prev.map((item) => (item.key === q.key ? { ...item, isStrictFilter: val } : item))
                            );
                          }}
                          className="rounded text-[#0b2f8a]"
                        />
                        <span>Strict Filter</span>
                      </label>

                      <label className="flex items-center gap-1.5 font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.isEnabled !== false}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setQuestions((prev) =>
                              prev.map((item) => (item.key === q.key ? { ...item, isEnabled: val } : item))
                            );
                          }}
                          className="rounded text-[#0b2f8a]"
                        />
                        <span>Live</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.key)}
                        title="Delete question"
                        className="h-8 w-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center text-xs transition cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Question Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Question Title</label>
                      <input
                        type="text"
                        value={q.title || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item) => (item.key === q.key ? { ...item, title: val } : item))
                          );
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Subtitle / Hint</label>
                      <input
                        type="text"
                        value={q.subtitle || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions((prev) =>
                            prev.map((item) => (item.key === q.key ? { ...item, subtitle: val } : item))
                          );
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  {/* Options List & Editor */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Choices &amp; Options ({q.options?.length || 0})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAddOptionToQuestion(q.key)}
                          className="text-[11px] font-bold text-[#0b2f8a] hover:underline"
                        >
                          + Add Choice
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedOptionsQKey(isOptionsExpanded ? null : q.key)}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                        >
                          {isOptionsExpanded ? "Collapse Editor ▲" : "Edit Choices Details ▼"}
                        </button>
                      </div>
                    </div>

                    {isOptionsExpanded ? (
                      <div className="space-y-2">
                        {q.options?.map((opt: any, optIdx: number) => (
                          <div
                            key={opt.key || optIdx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                          >
                            <div className="sm:col-span-1">
                              <input
                                type="text"
                                value={opt.icon || "✨"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions((prev) =>
                                    prev.map((item) => {
                                      if (item.key !== q.key) return item;
                                      const nextOpts = item.options.map((o: any) =>
                                        o.key === opt.key ? { ...o, icon: val } : o
                                      );
                                      return { ...item, options: nextOpts };
                                    })
                                  );
                                }}
                                className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={opt.label || ""}
                                placeholder="Choice Label"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions((prev) =>
                                    prev.map((item) => {
                                      if (item.key !== q.key) return item;
                                      const nextOpts = item.options.map((o: any) =>
                                        o.key === opt.key ? { ...o, label: val } : o
                                      );
                                      return { ...item, options: nextOpts };
                                    })
                                  );
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 font-bold"
                              />
                            </div>
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                value={opt.description || ""}
                                placeholder="Description / Hint"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions((prev) =>
                                    prev.map((item) => {
                                      if (item.key !== q.key) return item;
                                      const nextOpts = item.options.map((o: any) =>
                                        o.key === opt.key ? { ...o, description: val } : o
                                      );
                                      return { ...item, options: nextOpts };
                                    })
                                  );
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200"
                              />
                            </div>
                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteOptionFromQuestion(q.key, opt.key)}
                                className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                                title="Remove choice"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {q.options?.map((opt: any) => (
                          <div
                            key={opt.key}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                          >
                            <div className="flex items-center gap-2 font-bold text-slate-800">
                              <span>{opt.icon || "✨"}</span>
                              <span>{opt.label}</span>
                            </div>
                            {opt.description && (
                              <p className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              MODAL: GENERATE NEW QUESTION (TEMPLATES + AI + CUSTOM)
             ───────────────────────────────────────────────────────────── */}
          {showQuestionModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
              <div className="max-w-3xl w-full bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto no-scrollbar">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-lg text-amber-800">
                      ✨
                    </span>
                    <div>
                      <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold text-slate-900">
                        Generate New Taste Quiz Question
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Choose a pre-calibrated heritage template or let AI draft a custom question.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition"
                  >
                    ✕
                  </button>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setGenMode("preset")}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      genMode === "preset" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🎯 Heritage Templates (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode("ai")}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      genMode === "ai" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    🤖 Smart AI Generator
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenMode("custom")}
                    className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      genMode === "custom" ? "bg-white text-[#0b2f8a] shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    ✏️ Blank Custom Draft
                  </button>
                </div>

                {/* MODE 1: PRESET TEMPLATES */}
                {genMode === "preset" && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-700">
                      Select one of our 6 pre-configured Vardayini Sweet Mart question models:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {QUESTION_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectPresetTemplate(tpl)}
                          className="flex items-start gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-[#0b2f8a] hover:bg-blue-50/30 text-left transition shadow-2xs group cursor-pointer"
                        >
                          <span className="text-2xl p-2 rounded-xl bg-slate-100 group-hover:bg-amber-100 transition shrink-0">
                            {tpl.icon}
                          </span>
                          <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                              {tpl.badge}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0b2f8a] transition leading-snug">
                              {tpl.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{tpl.subtitle}</p>
                            <p className="text-[10px] font-medium text-emerald-700">
                              ✓ {tpl.options.length} calibrated choices included
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODE 2: AI PROMPT GENERATOR */}
                {genMode === "ai" && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <h4 className="text-xs font-bold text-[#0b2f8a]">
                        Type any sweet, snack, or customer taste preference topic:
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={aiTopic}
                        onChange={(e) => setAiTopic(e.target.value)}
                        placeholder="e.g., Spicy farsan crunch, Winter warm sweets, Wedding favor packaging, Ghee vs Mawa"
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs"
                      />
                      <button
                        type="button"
                        disabled={generatingAi}
                        onClick={handleGenerateAiQuestion}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-xs disabled:opacity-50 shrink-0 cursor-pointer"
                      >
                        {generatingAi ? "Generating..." : "Generate ✨"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                      <span>Quick ideas:</span>
                      {["Spicy farsan", "Winter vitality", "Pure Cow Ghee", "Luxury packaging"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setAiTopic(t)}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-[#0b2f8a] text-slate-700"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DRAFT PREVIEW & EDITING AREA */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      📝 Question Preview &amp; Configuration:
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Review and customize before appending to quiz flow
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#faf8f5] border border-amber-200/70 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Icon</label>
                        <input
                          type="text"
                          value={newQuestionDraft.icon}
                          onChange={(e) =>
                            setNewQuestionDraft({ ...newQuestionDraft, icon: e.target.value })
                          }
                          className="w-full text-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-base"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Question Title</label>
                        <input
                          type="text"
                          value={newQuestionDraft.title}
                          placeholder="e.g. Which festival or occasion are you celebrating?"
                          onChange={(e) =>
                            setNewQuestionDraft({ ...newQuestionDraft, title: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Key (Slug)</label>
                        <input
                          type="text"
                          value={newQuestionDraft.key}
                          placeholder="festival_season"
                          onChange={(e) =>
                            setNewQuestionDraft({ ...newQuestionDraft, key: e.target.value })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Subtitle / Customer Guidance
                      </label>
                      <input
                        type="text"
                        value={newQuestionDraft.subtitle}
                        placeholder="Subtle guidance explaining why we ask this..."
                        onChange={(e) =>
                          setNewQuestionDraft({ ...newQuestionDraft, subtitle: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                      />
                    </div>

                    {/* Choices in Draft */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">
                          Question Choices ({newQuestionDraft.options.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newOpt = {
                              key: `opt_${Date.now().toString().slice(-4)}`,
                              label: `Choice ${newQuestionDraft.options.length + 1}`,
                              description: "",
                              icon: "✨",
                              tagMapping: {},
                            };
                            setNewQuestionDraft({
                              ...newQuestionDraft,
                              options: [...newQuestionDraft.options, newOpt],
                            });
                          }}
                          className="text-[11px] font-bold text-[#0b2f8a] hover:underline"
                        >
                          + Add Another Choice
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {newQuestionDraft.options.map((opt, optIdx) => (
                          <div
                            key={opt.key || optIdx}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 relative group"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={opt.icon || "✨"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = newQuestionDraft.options.map((o, i) =>
                                    i === optIdx ? { ...o, icon: val } : o
                                  );
                                  setNewQuestionDraft({ ...newQuestionDraft, options: updated });
                                }}
                                className="w-8 text-center px-1 py-0.5 rounded border border-slate-200 text-sm"
                              />
                              <input
                                type="text"
                                value={opt.label}
                                placeholder="Choice Label"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = newQuestionDraft.options.map((o, i) =>
                                    i === optIdx ? { ...o, label: val } : o
                                  );
                                  setNewQuestionDraft({ ...newQuestionDraft, options: updated });
                                }}
                                className="flex-1 px-2 py-0.5 rounded border border-slate-200 font-bold"
                              />
                              {newQuestionDraft.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = newQuestionDraft.options.filter((_, i) => i !== optIdx);
                                    setNewQuestionDraft({ ...newQuestionDraft, options: updated });
                                  }}
                                  className="text-slate-400 hover:text-rose-600 text-xs font-bold"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={opt.description || ""}
                              placeholder="Description hint"
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = newQuestionDraft.options.map((o, i) =>
                                  i === optIdx ? { ...o, description: val } : o
                                );
                                setNewQuestionDraft({ ...newQuestionDraft, options: updated });
                              }}
                              className="w-full px-2 py-0.5 rounded border border-slate-200 text-[11px] text-slate-600"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuestionToQuiz}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-md transition active:scale-95 cursor-pointer"
                  >
                    Add to Quiz Flow →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 3: MITHAI PERSONALITIES
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "personalities" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Mithai Personalities</h2>
            <p className="text-xs text-slate-500">
              Customize the fun personality profiles calculated for users on the quiz results screen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {personalities.map((p) => (
              <div
                key={p.slug}
                className="rounded-3xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900">
                      {p.badge || "Heritage"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">/{p.slug}</span>
                  </div>

                  <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#0b2f8a]">
                    {p.name}
                  </h3>

                  <p className="text-xs font-semibold text-[#8d6715] italic">
                    &ldquo;{p.tagline}&rdquo;
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    ⭐ {p.recommendedSweet || "Signature Sweet"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingPersonality({ ...p })}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Personality Modal */}
          {editingPersonality && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Edit Personality: {editingPersonality.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setEditingPersonality(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSavePersonality} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Personality Name</label>
                    <input
                      type="text"
                      required
                      value={editingPersonality.name || ""}
                      onChange={(e) => setEditingPersonality({ ...editingPersonality, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tagline</label>
                    <input
                      type="text"
                      required
                      value={editingPersonality.tagline || ""}
                      onChange={(e) => setEditingPersonality({ ...editingPersonality, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Description Paragraph</label>
                    <textarea
                      rows={3}
                      required
                      value={editingPersonality.description || ""}
                      onChange={(e) => setEditingPersonality({ ...editingPersonality, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Badge Text</label>
                      <input
                        type="text"
                        value={editingPersonality.badge || ""}
                        onChange={(e) => setEditingPersonality({ ...editingPersonality, badge: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Recommended Sweet</label>
                      <input
                        type="text"
                        value={editingPersonality.recommendedSweet || ""}
                        onChange={(e) => setEditingPersonality({ ...editingPersonality, recommendedSweet: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingPersonality(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingPersonality}
                      className="px-5 py-2 rounded-xl bg-[#0b2f8a] text-white font-bold hover:bg-[#071c54] disabled:opacity-50"
                    >
                      {savingPersonality ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 4: SETTINGS & CONTROLS
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-3xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Quiz &amp; Lead Capture Settings</h2>
            <p className="text-xs text-slate-500">Configure global matching thresholds, lead capture and allergy rules.</p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 text-xs">
            {/* Master Toggle */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="font-bold text-slate-900">Enable Taste Quiz Feature</p>
                <p className="text-[11px] text-slate-500">Shows &ldquo;Find Your Mithai&rdquo; CTA on homepage, shop, and menu.</p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.isEnabled)}
                onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })}
                className="h-5 w-5 rounded text-[#0b2f8a]"
              />
            </label>

            {/* Lead Capture Toggle */}
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div>
                <p className="font-bold text-slate-900">Enable Lead Capture Step</p>
                <p className="text-[11px] text-slate-500">
                  Asks customer name &amp; WhatsApp/email before results with an optional &ldquo;Skip&rdquo; button.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(settings.leadCaptureEnabled)}
                onChange={(e) => setSettings({ ...settings, leadCaptureEnabled: e.target.checked })}
                className="h-5 w-5 rounded text-[#0b2f8a]"
              />
            </label>

            {/* Lead Capture Heading & Subheading */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lead Capture Heading</label>
                <input
                  type="text"
                  value={settings.leadCaptureHeading || ""}
                  onChange={(e) => setSettings({ ...settings, leadCaptureHeading: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lead Capture Subheading</label>
                <input
                  type="text"
                  value={settings.leadCaptureSubheading || ""}
                  onChange={(e) => setSettings({ ...settings, leadCaptureSubheading: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Results count & combo discount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Matched Results Count (3 to 5)</label>
                <input
                  type="number"
                  min={3}
                  max={5}
                  value={settings.maxResults || 4}
                  onChange={(e) => setSettings({ ...settings, maxResults: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Combo Box Discount Percent (%)</label>
                <input
                  type="number"
                  min={0}
                  max={40}
                  value={settings.comboDiscountPercent ?? 10}
                  onChange={(e) => setSettings({ ...settings, comboDiscountPercent: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Allergy Disclaimer */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Allergy &amp; Dietary Disclaimer Text</label>
              <textarea
                rows={3}
                value={settings.allergyDisclaimer || ""}
                onChange={(e) => setSettings({ ...settings, allergyDisclaimer: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs leading-relaxed"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-md disabled:opacity-50"
              >
                {savingSettings ? "Saving Settings..." : "Save Quiz Settings"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 5: INTERACTIVE SIMULATOR / TESTER
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "simulator" && (
        <div className="space-y-6 max-w-4xl">
          <div>
            <h2 className="text-base font-bold text-slate-900">Taste Matching Simulator</h2>
            <p className="text-xs text-slate-500">
              Test what sweet recommendations and personality profile the algorithm yields for any answer combination.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sweetness</label>
                <select
                  value={simAnswers.sweetness}
                  onChange={(e) => setSimAnswers({ ...simAnswers, sweetness: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="low">Mild / Low Sweetness</option>
                  <option value="medium">Balanced / Just Right</option>
                  <option value="high">Rich / Sweet Tooth</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nuts Preference</label>
                <select
                  value={simAnswers.nuts}
                  onChange={(e) => setSimAnswers({ ...simAnswers, nuts: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="love_nuts">I Love Nuts (Cashews, Almonds)</option>
                  <option value="no_nuts">Strictly No Nuts (Allergy)</option>
                  <option value="neutral">Doesn&apos;t Matter</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Occasion</label>
                <select
                  value={simAnswers.occasion}
                  onChange={(e) => setSimAnswers({ ...simAnswers, occasion: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="festival">Festivals (Diwali, Rakhi...)</option>
                  <option value="birthday_anniversary">Birthday or Anniversary</option>
                  <option value="wedding_gifting">Wedding &amp; Family Gifting</option>
                  <option value="everyday">Everyday Chai Snack</option>
                  <option value="corporate">Corporate Gifting</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Budget</label>
                <select
                  value={simAnswers.budget}
                  onChange={(e) => setSimAnswers({ ...simAnswers, budget: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="under_500">Under ₹500</option>
                  <option value="500_1000">₹500 to ₹1,000</option>
                  <option value="1000_2000">₹1,000 to ₹2,000</option>
                  <option value="above_2000">Above ₹2,000</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mithai Type</label>
                <select
                  value={simAnswers.type}
                  onChange={(e) => setSimAnswers({ ...simAnswers, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                >
                  <option value="dry">Dry Sweets (Barfi, Ladoo, Kaju)</option>
                  <option value="milk_based">Milk-based (Peda, Mawa)</option>
                  <option value="ghee_based">Ghee-based (Mohanthal)</option>
                  <option value="surprise_me">Surprise Me</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={simulating}
                  onClick={handleRunSimulation}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-md disabled:opacity-50"
                >
                  {simulating ? "Calculating..." : "Run Test Simulation 🚀"}
                </button>
              </div>
            </div>

            {/* Simulation Results Display */}
            {simResult && (
              <div className="pt-5 border-t border-slate-200 space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-800">Calculated Personality</span>
                    <span className="text-xs font-bold text-emerald-800">
                      {simResult.matches?.length} Matched Products
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{simResult.personality?.name}</h3>
                  <p className="text-xs text-amber-900/80 italic">&ldquo;{simResult.personality?.tagline}&rdquo;</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {simResult.matches?.map((m: any) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-white">
                        <Image src={m.imageUrl || "/images/kaju-katli.jpg"} alt={m.name} fill className="object-cover" />
                        <span className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-700 text-white">
                          {m.matchPercentage}%
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs truncate">{m.name}</p>
                        <p className="text-[10px] text-[#6b1d1d] font-bold font-mono">₹{m.discountedPrice || m.price}</p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 italic">
                          &ldquo;{m.whySuitsYou}&rdquo;
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUBTAB 6: CAPTURED LEADS TABLE
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "leads" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Captured Quiz Leads ({leads.length})</h2>
              <p className="text-xs text-slate-500">Contact information provided by quiz participants.</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Phone / Email</th>
                  <th className="p-3.5">Mithai Personality</th>
                  <th className="p-3.5">Marketing Consent</th>
                  <th className="p-3.5">Captured At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No customer leads recorded yet.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">{lead.name || "Anonymous"}</td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {lead.phone !== "-" ? lead.phone : lead.email}
                      </td>
                      <td className="p-3.5">
                        <span className="rounded-md px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900">
                          {lead.personalitySlug}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {lead.marketingConsent ? (
                          <span className="text-emerald-700 font-bold">✓ Opted-in</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">
                        {new Date(lead.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


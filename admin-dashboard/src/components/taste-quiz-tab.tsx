"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/lib/api";

type SubTab = "tagging" | "builder" | "personalities" | "settings" | "simulator" | "leads";

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

  // Save Questions
  const handleSaveQuestions = async () => {
    try {
      setSavingQuestions(true);
      await api.updateQuizQuestions(questions);
      showNotice("success", "Quiz questions updated!");
    } catch (err: any) {
      showNotice("error", err.message || "Failed to update questions");
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
          SUBTAB 2: QUIZ QUESTIONS & WEIGHTS BUILDER
         ───────────────────────────────────────────────────────────── */}
      {activeSubTab === "builder" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quiz Questions &amp; Weights</h2>
              <p className="text-xs text-slate-500">Edit titles, options, weights and strict filter flags.</p>
            </div>
            <button
              type="button"
              disabled={savingQuestions}
              onClick={handleSaveQuestions}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0b2f8a] text-white hover:bg-[#071c54] transition shadow-md disabled:opacity-50"
            >
              {savingQuestions ? "Saving..." : "Save Questions"}
            </button>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.key || idx} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 rounded-xl bg-slate-100">{q.icon || "🍯"}</span>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Step {q.stepNumber}</span>
                      <h3 className="text-sm font-bold text-slate-900">{q.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
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

                    <label className="flex items-center gap-1.5 font-semibold text-slate-700">
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

                    <label className="flex items-center gap-1.5 font-semibold text-slate-700">
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
                      <span>Enabled</span>
                    </label>
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

                {/* Options List */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Options ({q.options?.length || 0})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {q.options?.map((opt: any) => (
                      <div key={opt.key} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <span>{opt.icon || "✨"}</span>
                          <span>{opt.label}</span>
                        </div>
                        {opt.description && <p className="text-[10px] text-slate-500 line-clamp-1">{opt.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
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


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type AdminStore = {
  id: number;
  name: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  hours: string;
  lat: string | number;
  lng: string | number;
  mapUrl?: string | null;
};

const CITY_PRESETS = [
  { label: "Kalol (Navjivan Center)", lat: "23.246300", lng: "72.508600", city: "Kalol", pincode: "382721", mapUrl: "https://maps.google.com/maps?q=23.2463,72.5086" },
  { label: "Gandhinagar (Rupal)", lat: "23.310000", lng: "72.596900", city: "Gandhinagar", pincode: "382630", mapUrl: "https://maps.google.com/maps?q=23.3100,72.5969" },
  { label: "Kalol (Station Road)", lat: "23.243500", lng: "72.501200", city: "Kalol", pincode: "382721", mapUrl: "https://maps.google.com/maps?q=23.2435,72.5012" },
  { label: "Kalol (Tower Bazar)", lat: "23.245100", lng: "72.504300", city: "Kalol", pincode: "382721", mapUrl: "https://maps.google.com/maps?q=23.2451,72.5043" },
  { label: "Kalol (Highway Express)", lat: "23.251000", lng: "72.518000", city: "Kalol", pincode: "382721", mapUrl: "https://maps.google.com/maps?q=23.2510,72.5180" },
  { label: "London, Ontario", lat: "42.990897", lng: "-81.298634", city: "London, Ontario", pincode: "N6H 5T8", mapUrl: "https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5" },
];

export function AdminOutletsManager() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<AdminStore | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new store
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "Kalol",
    pincode: "382721",
    phone: "+91 63531 19329",
    hours: "8:00 AM – 8:30 PM (All 7 Days)",
    lat: "23.246300",
    lng: "72.508600",
    mapUrl: "",
  });

  async function loadStores() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stores");
      const data = await res.json();
      setStores(data.stores || []);
    } catch (err: any) {
      setError("Failed to load stores: " + (err.message || String(err)));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
  }, []);

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  async function handleCreateStore(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create outlet");
      }

      showSuccess(`Outlet "${formData.name}" created successfully!`);
      setIsAddOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "Kalol",
        pincode: "382721",
        phone: "+91 63531 19329",
        hours: "8:00 AM – 8:30 PM (All 7 Days)",
        lat: "23.246300",
        lng: "72.508600",
        mapUrl: "",
      });
      loadStores();
    } catch (err: any) {
      setError(err.message || "Failed to create outlet");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateStore(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStore) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStore),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update outlet");
      }

      showSuccess(`Outlet "${editingStore.name}" updated successfully!`);
      setEditingStore(null);
      loadStores();
    } catch (err: any) {
      setError(err.message || "Failed to update outlet");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteStore(id: number) {
    if (!confirm("Are you sure you want to delete this outlet? This will remove it from the public store locator.")) {
      return;
    }
    setDeletingId(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/stores?id=${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete outlet");
      }

      showSuccess("Outlet deleted successfully.");
      loadStores();
    } catch (err: any) {
      setError(err.message || "Failed to delete outlet");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mithai-card rounded-3xl p-6 sm:p-8 bg-white border border-[#6b1d1d]/15 shadow-sm">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#6b1d1d]/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">
            Store Locator &amp; Map Management
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-[#6b1d1d] mt-1">
            Outlets &amp; Stores
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your physical shop counters, locations, opening hours, contact numbers, and Google Map coordinates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/stores"
            target="_blank"
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Preview Public Locator ↗
          </Link>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="btn-gold rounded-full px-5 py-2 text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span>+ Add New Outlet</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <span>✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {error && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Stores Grid / List */}
      <div className="mt-6">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading outlets from database...
          </div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-base font-semibold text-slate-700">No outlets configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;+ Add New Outlet&quot; above to add your first store location.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            {stores.map((store) => (
              <div
                key={store.id}
                className="relative rounded-2xl border border-slate-200 bg-[#faf6ee]/50 p-5 hover:border-[#6b1d1d]/30 transition hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-full bg-[#d97706]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#d97706] uppercase tracking-wider">
                        {store.city} Counter
                      </span>
                      <h3 className="font-bold text-base sm:text-lg text-[#24142e] mt-1">
                        {store.name}
                      </h3>
                    </div>
                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#3b1e54]/10 text-xs font-bold text-[#3b1e54]">
                      #{store.id}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <p className="flex items-start gap-2">
                      <span className="shrink-0 text-amber-600 font-bold">📍</span>
                      <span className="leading-relaxed">
                        {store.address}, {store.city} - {store.pincode}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="shrink-0 text-amber-600 font-bold">📞</span>
                      <span className="font-semibold text-slate-800">{store.phone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="shrink-0 text-amber-600 font-bold">⏰</span>
                      <span>{store.hours}</span>
                    </p>
                    <p className="flex items-center gap-2 text-xs">
                      <span className="shrink-0 text-amber-600 font-bold">🗺️</span>
                      {store.mapUrl ? (
                        <a
                          href={store.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#0b2f8a] font-semibold hover:underline truncate"
                        >
                          {store.mapUrl}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No direct link (using GPS coords)</span>
                      )}
                    </p>
                    <p className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Coords:</span>
                      <span className="font-mono">{store.lat}, {store.lng}</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <a
                    href={store.mapUrl || `https://maps.google.com/maps?q=${encodeURIComponent(`${store.lat},${store.lng}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#0b2f8a] hover:underline flex items-center gap-1"
                  >
                    Open on Google Maps ↗
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingStore(store)}
                      className="rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[#d97706] px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === store.id}
                      onClick={() => handleDeleteStore(store.id)}
                      className="rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === store.id ? "Deleting..." : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD NEW OUTLET
         ───────────────────────────────────────────────────────────── */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-amber-900/10 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
                  Add New Outlet
                </h3>
                <p className="text-xs text-slate-500">Configure a new store counter or branch</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              {/* Presets Helper */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs">
                <span className="font-bold text-[#d97706]">Quick Presets: </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {CITY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          name: prev.name || `Vardayini ${p.label}`,
                          city: p.city,
                          pincode: p.pincode,
                          lat: p.lat,
                          lng: p.lng,
                          mapUrl: p.mapUrl || "",
                        }))
                      }
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-amber-200 hover:bg-amber-100/50 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Outlet Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vardayini Express (Kalol)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kalol"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 382721"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 14, Ghod Dod Road, opposite Royal Complex"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Counter *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 265 242 1186"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Hours *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="8:00 AM – 10:30 PM"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#6b1d1d] flex items-center gap-1.5">
                    <span>📍 Google Map Link (Direct Store / Share Link)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Paste your direct Google Maps store link. Customers clicking <strong>Get Directions</strong> or <strong>Open in Google Maps</strong> will be directed straight to your business on Google Maps.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    placeholder="22.307200"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    placeholder="73.181200"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-full px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold rounded-full px-6 py-2 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Save Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT OUTLET
         ───────────────────────────────────────────────────────────── */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-amber-900/10 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[#6b1d1d]">
                  Edit Outlet #{editingStore.id}
                </h3>
                <p className="text-xs text-slate-500">Update address, timings, or coordinates</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Outlet Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingStore.name}
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStore.city}
                    onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStore.pincode}
                    onChange={(e) => setEditingStore({ ...editingStore, pincode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Street Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={editingStore.address}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Counter *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operating Hours *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStore.hours}
                    onChange={(e) => setEditingStore({ ...editingStore, hours: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#6b1d1d] flex items-center gap-1.5">
                    <span>📍 Google Map Link (Direct Store / Share Link)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <input
                  type="url"
                  placeholder="e.g. https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                  value={editingStore.mapUrl || ""}
                  onChange={(e) => setEditingStore({ ...editingStore, mapUrl: e.target.value })}
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm focus:border-[#6b1d1d] focus:outline-hidden"
                />
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Paste your direct Google Maps store link to directly open this outlet.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={editingStore.lat}
                    onChange={(e) => setEditingStore({ ...editingStore, lat: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={editingStore.lng}
                    onChange={(e) => setEditingStore({ ...editingStore, lng: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-[#6b1d1d] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="rounded-full px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold rounded-full px-6 py-2 text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Updating..." : "Update Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

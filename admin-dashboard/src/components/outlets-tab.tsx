"use client";

import { useEffect, useState } from "react";
import { AdminStoreOutlet, api } from "@/lib/api";
import { toast } from "@/lib/toast";

const CITY_PRESETS = [
  { label: "Kalol (Navjivan Center)", lat: "23.246300", lng: "72.508600", city: "Kalol", pincode: "382721", mapUrl: "https://maps.google.com/maps?q=23.2463,72.5086" },
  { label: "Gandhinagar (Rupal)", lat: "23.310000", lng: "72.596900", city: "Gandhinagar", pincode: "382630", mapUrl: "https://maps.google.com/maps?q=23.3100,72.5969" },
  { label: "Vadodara (Mandvi)", lat: "22.307200", lng: "73.181200", city: "Vadodara", pincode: "390001", mapUrl: "https://maps.app.goo.gl/9iCg12yLzFw4nC6f7" },
  { label: "Vadodara (Alkapuri)", lat: "22.313500", lng: "73.171800", city: "Vadodara", pincode: "390007", mapUrl: "https://maps.app.goo.gl/5rVzJdGq4pZ6B38T8" },
  { label: "Ahmedabad (CG Road)", lat: "23.033000", lng: "72.565000", city: "Ahmedabad", pincode: "380009", mapUrl: "https://maps.app.goo.gl/3wG28YxN44Jk5rK7A" },
  { label: "Surat", lat: "21.170240", lng: "72.831061", city: "Surat", pincode: "395007", mapUrl: "https://maps.app.goo.gl/e4Ua8tZg4oZ6C71T9" },
  { label: "London, Ontario (Canada)", lat: "42.990897", lng: "-81.298634", city: "London, Ontario", pincode: "N6H 5T8", mapUrl: "https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5" },
];

export function OutletsTab() {
  const [stores, setStores] = useState<AdminStoreOutlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<(AdminStoreOutlet & { holidaysStr?: string }) | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "Vadodara",
    pincode: "390001",
    phone: "+91 265 242 1186",
    hours: "8:00 AM – 10:30 PM (All 7 Days)",
    lat: "22.307200",
    lng: "73.181200",
    mapUrl: "",
    openingTime: "08:00",
    closingTime: "22:00",
    slotIntervalMinutes: 60,
    slotCapacity: 5,
    prepTimeMinutes: 30,
    isActive: true,
    pickupEnabled: true,
    holidaysStr: "",
  });

  async function loadStores() {
    setLoading(true);
    try {
      const data = await api.getStores();
      setStores(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load outlets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedHolidays = formData.holidaysStr
        ? formData.holidaysStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
        : [];

      const created = await api.createStore({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        phone: formData.phone,
        hours: formData.hours,
        lat: formData.lat,
        lng: formData.lng,
        mapUrl: formData.mapUrl,
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        slotIntervalMinutes: Number(formData.slotIntervalMinutes) || 60,
        slotCapacity: Number(formData.slotCapacity) || 5,
        prepTimeMinutes: Number(formData.prepTimeMinutes) || 30,
        isActive: formData.isActive,
        pickupEnabled: formData.pickupEnabled,
        holidays: parsedHolidays,
      });

      toast.success(`Outlet "${created.name}" created successfully!`);
      setIsAddOpen(false);
      setFormData({
        name: "",
        address: "",
        city: "Vadodara",
        pincode: "390001",
        phone: "+91 265 242 1186",
        hours: "8:00 AM – 10:30 PM (All 7 Days)",
        lat: "22.307200",
        lng: "73.181200",
        mapUrl: "",
        openingTime: "08:00",
        closingTime: "22:00",
        slotIntervalMinutes: 60,
        slotCapacity: 5,
        prepTimeMinutes: 30,
        isActive: true,
        pickupEnabled: true,
        holidaysStr: "",
      });
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Failed to create outlet");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStore) return;
    setSaving(true);
    try {
      const parsedHolidays = editingStore.holidaysStr !== undefined
        ? editingStore.holidaysStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
        : Array.isArray(editingStore.holidays)
        ? editingStore.holidays
        : [];

      const updated = await api.updateStore({
        id: editingStore.id,
        name: editingStore.name,
        address: editingStore.address,
        city: editingStore.city,
        pincode: editingStore.pincode,
        phone: editingStore.phone,
        hours: editingStore.hours,
        lat: editingStore.lat,
        lng: editingStore.lng,
        mapUrl: editingStore.mapUrl || "",
        openingTime: editingStore.openingTime || "08:00",
        closingTime: editingStore.closingTime || "22:00",
        slotIntervalMinutes: Number(editingStore.slotIntervalMinutes) || 60,
        slotCapacity: Number(editingStore.slotCapacity) || 5,
        prepTimeMinutes: Number(editingStore.prepTimeMinutes) || 30,
        isActive: editingStore.isActive !== false,
        pickupEnabled: editingStore.pickupEnabled !== false,
        holidays: parsedHolidays,
      });

      toast.success(`Outlet "${updated.name}" updated!`);
      setEditingStore(null);
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Failed to update outlet");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(store: AdminStoreOutlet) {
    try {
      const newStatus = !(store.isActive !== false);
      await api.updateStore({
        id: store.id,
        isActive: newStatus,
      });
      toast.success(`Store "${store.name}" is now ${newStatus ? "Active" : "Inactive"}.`);
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      await api.deleteStore(id);
      toast.success("Outlet deleted successfully");
      setDeletingId(null);
      loadStores();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete outlet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
              <span>📍 Physical Outlets & Store Branches</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              Manage Outlets & Pickup Schedules
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Configure addresses, timings, slot capacity, preparation time, holidays, and active status for store pickups.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6b1d1d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#832323] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Outlet</span>
            </button>
            <a
              href="http://localhost:9449/stores"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span>Preview Public Locator</span>
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Outlets Grid */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-r-transparent"></div>
          <p className="mt-3 text-sm">Loading outlets...</p>
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-600">No outlets registered yet.</p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="mt-4 rounded-xl bg-[#6b1d1d] px-4 py-2 text-sm font-medium text-white hover:bg-[#832323]"
          >
            Create Your First Outlet
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stores.map((store) => {
            const isActive = store.isActive !== false;
            const isPickup = store.pickupEnabled !== false;

            return (
              <div
                key={store.id}
                className={`flex flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition ${
                  isActive ? "border-slate-200" : "border-slate-300 opacity-75 bg-slate-50/50"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 border border-amber-200">
                      {store.city} · {store.pincode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-300"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">ID #{store.id}</span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-slate-900">{store.name}</h3>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    <span className="font-semibold text-slate-700">📍 Address: </span>
                    {store.address}
                  </p>

                  {/* Pickup Specs Badge Bar */}
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    <span
                      className={`rounded-md px-2 py-0.5 font-bold border ${
                        isPickup
                          ? "bg-amber-50 text-amber-900 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {isPickup ? "🏪 Pickup Enabled" : "🚫 Pickup Disabled"}
                    </span>
                    <span className="rounded-md bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 font-semibold">
                      Max {store.slotCapacity || 5} orders/slot
                    </span>
                    <span className="rounded-md bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 font-semibold">
                      Prep ~{store.prepTimeMinutes || 30} mins
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <p className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">📞 Phone:</span> {store.phone}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">⏰ Hours:</span> {store.hours}
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700 font-sans">🕒 Window:</span>{" "}
                      {store.openingTime || "08:00"} - {store.closingTime || "22:00"} ({store.slotIntervalMinutes || 60}m slots)
                    </p>
                    {store.holidays && store.holidays.length > 0 && (
                      <p className="flex items-center gap-1.5 text-[11px] text-rose-600">
                        <span className="font-semibold text-slate-700 font-sans">🏖️ Holidays:</span>{" "}
                        {store.holidays.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <a
                    href={store.mapUrl || `https://maps.google.com/maps?q=${store.lat},${store.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
                  >
                    📍 {store.mapUrl ? "Open Google Maps ↗" : "View Coordinates ↗"}
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(store)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                        isActive
                          ? "border-amber-200 text-amber-800 hover:bg-amber-50"
                          : "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                      }`}
                      title={isActive ? "Deactivate branch" : "Activate branch"}
                    >
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingStore({
                          ...store,
                          holidaysStr: Array.isArray(store.holidays)
                            ? store.holidays.join(", ")
                            : "",
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(store.id)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Outlet Location</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quick Fill Preset Locations:
              </label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CITY_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        name: `Vardayini ${preset.city}`,
                        city: preset.city,
                        pincode: preset.pincode,
                        lat: preset.lat,
                        lng: preset.lng,
                        mapUrl: preset.mapUrl,
                      }))
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Outlet Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vardayini Sweet Mart - Mandvi Flagship"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vadodara"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Pincode *</label>
                  <input
                    type="text"
                    required
                    placeholder="390001"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Address *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="12, Mandvi Pol, opposite Mahalaxmi Temple, Mandvi"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 265 242 1186"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Display Hours</label>
                  <input
                    type="text"
                    placeholder="8:00 AM – 10:30 PM (All 7 Days)"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pickup Configuration Box */}
              <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-200/60 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  🏪 Store Pickup & Scheduling Configuration
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded accent-[#6b1d1d]"
                    />
                    <span>Branch Active</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.pickupEnabled}
                      onChange={(e) => setFormData({ ...formData, pickupEnabled: e.target.checked })}
                      className="rounded accent-[#6b1d1d]"
                    />
                    <span>Allow Store Pickup</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Opening Time</label>
                    <input
                      type="time"
                      value={formData.openingTime}
                      onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Closing Time</label>
                    <input
                      type="time"
                      value={formData.closingTime}
                      onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Slot Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={formData.slotCapacity}
                      onChange={(e) => setFormData({ ...formData, slotCapacity: parseInt(e.target.value, 10) || 5 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Prep Time (mins)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={formData.prepTimeMinutes}
                      onChange={(e) => setFormData({ ...formData, prepTimeMinutes: parseInt(e.target.value, 10) || 30 })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Store Holidays (comma-separated YYYY-MM-DD dates)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-11-01, 2026-11-02"
                    value={formData.holidaysStr}
                    onChange={(e) => setFormData({ ...formData, holidaysStr: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  📍 Google Map Link (Direct Store / Share Link)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/... or direct store listing link"
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Latitude (GPS)</label>
                  <input
                    type="text"
                    placeholder="22.307200"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Longitude (GPS)</label>
                  <input
                    type="text"
                    placeholder="73.181200"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#6b1d1d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#832323] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Outlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Edit Outlet #{editingStore.id}</h3>
              <button
                type="button"
                onClick={() => setEditingStore(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Outlet Name *</label>
                <input
                  type="text"
                  required
                  value={editingStore.name}
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">City *</label>
                  <input
                    type="text"
                    required
                    value={editingStore.city}
                    onChange={(e) => setEditingStore({ ...editingStore, city: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={editingStore.pincode}
                    onChange={(e) => setEditingStore({ ...editingStore, pincode: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Address *</label>
                <textarea
                  rows={2}
                  required
                  value={editingStore.address}
                  onChange={(e) => setEditingStore({ ...editingStore, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editingStore.phone}
                    onChange={(e) => setEditingStore({ ...editingStore, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Operating Hours</label>
                  <input
                    type="text"
                    value={editingStore.hours}
                    onChange={(e) => setEditingStore({ ...editingStore, hours: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pickup Configuration Box */}
              <div className="rounded-2xl bg-amber-50/50 p-4 border border-amber-200/60 space-y-3">
                <div className="font-bold text-xs uppercase tracking-wider text-amber-900">
                  🏪 Store Pickup & Scheduling Configuration
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStore.isActive !== false}
                      onChange={(e) => setEditingStore({ ...editingStore, isActive: e.target.checked })}
                      className="rounded accent-[#6b1d1d]"
                    />
                    <span>Branch Active</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingStore.pickupEnabled !== false}
                      onChange={(e) => setEditingStore({ ...editingStore, pickupEnabled: e.target.checked })}
                      className="rounded accent-[#6b1d1d]"
                    />
                    <span>Allow Store Pickup</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Opening Time</label>
                    <input
                      type="time"
                      value={editingStore.openingTime || "08:00"}
                      onChange={(e) => setEditingStore({ ...editingStore, openingTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Closing Time</label>
                    <input
                      type="time"
                      value={editingStore.closingTime || "22:00"}
                      onChange={(e) => setEditingStore({ ...editingStore, closingTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Slot Capacity</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editingStore.slotCapacity ?? 5}
                      onChange={(e) =>
                        setEditingStore({
                          ...editingStore,
                          slotCapacity: parseInt(e.target.value, 10) || 5,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700">Prep Time (mins)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={editingStore.prepTimeMinutes ?? 30}
                      onChange={(e) =>
                        setEditingStore({
                          ...editingStore,
                          prepTimeMinutes: parseInt(e.target.value, 10) || 30,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Store Holidays (comma-separated YYYY-MM-DD dates)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2026-11-01, 2026-11-02"
                    value={editingStore.holidaysStr || ""}
                    onChange={(e) => setEditingStore({ ...editingStore, holidaysStr: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  📍 Google Map Link (Direct Store / Share Link)
                </label>
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/... or direct store listing link"
                  value={editingStore.mapUrl || ""}
                  onChange={(e) => setEditingStore({ ...editingStore, mapUrl: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-amber-600 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Latitude (GPS)</label>
                  <input
                    type="text"
                    value={String(editingStore.lat)}
                    onChange={(e) => setEditingStore({ ...editingStore, lat: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Longitude (GPS)</label>
                  <input
                    type="text"
                    value={String(editingStore.lng)}
                    onChange={(e) => setEditingStore({ ...editingStore, lng: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#6b1d1d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#832323] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Delete Outlet?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to remove Outlet #{deletingId}? This will remove it from the public store locator.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDelete(deletingId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

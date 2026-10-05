"use client";

import { useState } from "react";
import { INDIAN_STATES } from "@/lib/validation-constants";
import { AddressSchema, formatZodErrors } from "@/lib/validation";

export interface AddressItem {
  id: number;
  userId: number;
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

interface AccountAddressManagerProps {
  initialAddresses: AddressItem[];
  userPhone?: string;
  userName?: string;
}

export function AccountAddressManager({
  initialAddresses,
  userPhone = "",
  userName = "",
}: AccountAddressManagerProps) {
  const [addresses, setAddresses] = useState<AddressItem[]>(initialAddresses);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form State
  const [label, setLabel] = useState("Home");
  const [fullName, setFullName] = useState(userName || "");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Vadodara");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("390001");
  const [phone, setPhone] = useState(userPhone || "");
  const [country] = useState("India");

  // Validate single field on blur or change
  const validateField = (field: string, value: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    // Client-Side Validation using Zod
    const payload = {
      fullName: fullName.trim() || userName || "Patron",
      phone: phone.trim(),
      line1: line1.trim(),
      line2: line2.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country,
      label,
    };

    const clientValidation = AddressSchema.safeParse(payload);
    if (!clientValidation.success) {
      setFieldErrors(formatZodErrors(clientValidation.error));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          setFieldErrors(data.details);
        } else {
          setGlobalError(data.error || "Failed to add delivery address");
        }
        return;
      }

      if (data.address) {
        setAddresses((prev) => [...prev, data.address]);
      }
      setShowAddForm(false);
      setLine1("");
      setLine2("");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this delivery address?")) return;
    try {
      const res = await fetch(`/api/account/addresses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete address", err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#6b1d1d]">
            Saved Delivery Addresses
          </h3>
          <p className="text-xs text-[#2a1a12]/70 mt-0.5">
            Verified addresses for fresh express dispatch across Vadodara & Pan-India
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFieldErrors({});
            setGlobalError(null);
          }}
          className="rounded-full bg-[#0b2f8a] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#082266] transition flex items-center gap-1.5"
        >
          {showAddForm ? "Cancel" : "+ Add New Address"}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddAddress}
          noValidate
          className="rounded-3xl border border-[#c45c26]/20 bg-white/95 p-5 shadow-sm space-y-4 transition"
        >
          <div className="flex items-center justify-between border-b border-[#2a1a12]/10 pb-3">
            <h4 className="font-bold text-sm text-[#6b1d1d]">Add Delivery Location</h4>
            <div className="flex gap-2">
              {["Home", "Office", "Family / Gift"].map((lbl) => (
                <button
                  type="button"
                  key={lbl}
                  onClick={() => setLabel(lbl)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                    label === lbl
                      ? "bg-[#c45c26] text-white"
                      : "bg-[#2a1a12]/5 text-[#2a1a12]/70 hover:bg-[#2a1a12]/10"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {globalError && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            {/* Recipient Full Name */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                Recipient Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  validateField("fullName", e.target.value);
                }}
                placeholder="e.g. Pratik Patel"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] outline-none transition ${
                  fieldErrors.fullName
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.fullName && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Address Line 1 */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                House / Flat / Street Address *
              </label>
              <input
                type="text"
                value={line1}
                onChange={(e) => {
                  setLine1(e.target.value);
                  validateField("line1", e.target.value);
                }}
                placeholder="e.g. 14, Heritage Enclave, Near Mandvi Gate"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] outline-none transition ${
                  fieldErrors.line1
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.line1 && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.line1}
                </p>
              )}
            </div>

            {/* Address Line 2 */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                Apartment / Landmark / Floor (Optional)
              </label>
              <input
                type="text"
                value={line2}
                onChange={(e) => {
                  setLine2(e.target.value);
                  validateField("line2", e.target.value);
                }}
                placeholder="e.g. 2nd Floor, Opposite Jain Temple"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] outline-none transition ${
                  fieldErrors.line2
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.line2 && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.line2}
                </p>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  validateField("city", e.target.value);
                }}
                placeholder="Vadodara"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] outline-none transition ${
                  fieldErrors.city
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.city && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.city}
                </p>
              )}
            </div>

            {/* State (Whitelisted Dropdown) */}
            <div>
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                State / Province (India) *
              </label>
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  validateField("state", e.target.value);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] outline-none transition ${
                  fieldErrors.state
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {fieldErrors.state && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.state}
                </p>
              )}
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                Postal PIN Code (6 digits) *
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPincode(val);
                  validateField("pincode", val);
                }}
                placeholder="390001"
                className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] font-mono outline-none transition ${
                  fieldErrors.pincode
                    ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                    : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                }`}
              />
              {fieldErrors.pincode && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.pincode}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-bold text-[#2a1a12]/70 uppercase mb-1">
                Delivery Mobile (10 digits) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-mono text-xs text-[#2a1a12]/50 font-bold">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone.replace(/^(?:\+91|91|0)/, "")}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPhone(digits);
                    validateField("phone", digits);
                  }}
                  placeholder="9876543210"
                  className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl border bg-white text-[#2a1a12] font-mono outline-none transition ${
                    fieldErrors.phone
                      ? "border-rose-500 bg-rose-50/30 focus:border-rose-600"
                      : "border-[#2a1a12]/20 focus:border-[#c45c26]"
                  }`}
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {fieldErrors.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setFieldErrors({});
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#2a1a12]/60 hover:bg-[#2a1a12]/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#c45c26] hover:bg-[#a64a1b] disabled:opacity-50 transition shadow-sm"
            >
              {isSubmitting ? "Validating & Saving..." : "Save Delivery Address"}
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#2a1a12]/20 p-6 text-center bg-white/40">
          <p className="text-sm font-medium text-[#2a1a12]/70">No saved addresses found.</p>
          <p className="text-xs text-[#2a1a12]/50 mt-1">
            Add your residential or office address for fast express dispatch across Gujarat.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr, index) => (
            <div
              key={addr.id}
              className="relative rounded-3xl border border-[#2a1a12]/10 bg-white/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dfb755]/20 text-[#6b1d1d] border border-[#dfb755]/30">
                      {addr.label || "Address"}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs text-[#2a1a12]/40 hover:text-rose-600 transition"
                    title="Remove address"
                  >
                    ✕
                  </button>
                </div>

                <p className="font-medium text-sm text-[#2a1a12] leading-snug">{addr.line1}</p>
                <p className="text-xs text-[#2a1a12]/70 mt-1">
                  {addr.city}, {addr.state} — <span className="font-mono">{addr.pincode}</span>
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2a1a12]/8 flex items-center justify-between text-xs text-[#2a1a12]/60">
                <span className="flex items-center gap-1">
                  📞 <span className="font-mono">{addr.phone}</span>
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">✓ Deliverable</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

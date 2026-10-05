"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { INDIAN_STATES } from "@/lib/validation-constants";
import { AddressSchema, formatZodErrors } from "@/lib/validation";

const SLOTS = [
  "Today, 5:00–7:00 PM",
  "Today, 7:00–9:00 PM",
  "Tomorrow, 10:00 AM–12:00 PM",
  "Tomorrow, 4:00–7:00 PM",
  "Tomorrow, 7:00–9:00 PM",
];

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Form Fields State
  const [name, setName] = useState(defaultName || "");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Vadodara");
  const [state, setState] = useState("Gujarat");
  const [pincode, setPincode] = useState("390001");
  const [deliverySlot, setDeliverySlot] = useState(SLOTS[0]);
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setGlobalError("");
    setFieldErrors({});

    // Client-side address validation using AddressSchema
    const validation = AddressSchema.safeParse({
      fullName: name.trim(),
      phone: phone.trim(),
      line1: line1.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: "India",
    });

    if (!validation.success) {
      setFieldErrors(formatZodErrors(validation.error));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          line1: line1.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          deliverySlot,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || "Could not place order");
        return;
      }

      const confirmUrl = data.guestToken
        ? `/orders/${data.order.orderNumber}?token=${encodeURIComponent(data.guestToken)}`
        : `/orders/${data.order.orderNumber}`;
      router.push(confirmUrl);
      router.refresh();
    } catch {
      setGlobalError("An unexpected network error occurred while placing order.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mithai-card mt-8 space-y-4 rounded-3xl p-6">
      <div className="border-b border-[#6b1d1d]/10 pb-2">
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-[#6b1d1d]">
          Delivery & Contact Information
        </h3>
        <p className="text-xs text-[#2a1a12]/60">Handcrafted freshness dispatched to your doorstep</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
            Full Name *
          </label>
          <input
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError("fullName");
            }}
            placeholder="e.g. Pratik Patel"
            className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
              fieldErrors.fullName
                ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
            }`}
          />
          {fieldErrors.fullName && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
            Mobile Phone (10 digits) *
          </label>
          <div className="relative mt-1 flex items-center">
            <span className="absolute left-3 font-mono text-xs font-bold text-[#2a1a12]/50">+91</span>
            <input
              name="phone"
              maxLength={10}
              value={phone.replace(/^(?:\+91|91|0)/, "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                setPhone(digits);
                clearFieldError("phone");
              }}
              placeholder="9876543210"
              className={`w-full rounded-2xl border bg-white pl-12 pr-3.5 py-2.5 text-sm font-mono outline-none transition ${
                fieldErrors.phone
                  ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                  : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
              }`}
            />
          </div>
          {fieldErrors.phone && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.phone}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
          Delivery Address (House, street, landmark) *
        </label>
        <input
          name="line1"
          value={line1}
          onChange={(e) => {
            setLine1(e.target.value);
            clearFieldError("line1");
          }}
          placeholder="e.g. 14, Heritage Enclave, Near Mandvi Gate, Mandvi"
          className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
            fieldErrors.line1
              ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
              : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
          }`}
        />
        {fieldErrors.line1 && (
          <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.line1}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
            City *
          </label>
          <input
            name="city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              clearFieldError("city");
            }}
            placeholder="Vadodara"
            className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
              fieldErrors.city
                ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
            }`}
          />
          {fieldErrors.city && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.city}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
            State *
          </label>
          <select
            name="state"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              clearFieldError("state");
            }}
            className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm outline-none transition ${
              fieldErrors.state
                ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
            }`}
          >
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {fieldErrors.state && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.state}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
            Pincode (6 digits) *
          </label>
          <input
            name="pincode"
            maxLength={6}
            value={pincode}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "");
              setPincode(digits);
              clearFieldError("pincode");
            }}
            placeholder="390001"
            className={`mt-1 w-full rounded-2xl border bg-white px-3.5 py-2.5 text-sm font-mono outline-none transition ${
              fieldErrors.pincode
                ? "border-rose-500 bg-rose-50/20 focus:border-rose-600"
                : "border-[#6b1d1d]/15 focus:border-[#c45c26]"
            }`}
          />
          {fieldErrors.pincode && (
            <p className="mt-1 text-xs font-medium text-rose-600">{fieldErrors.pincode}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#2a1a12]/70">
          Delivery Slot *
        </label>
        <select
          name="deliverySlot"
          value={deliverySlot}
          onChange={(e) => setDeliverySlot(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-[#6b1d1d]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#c45c26]"
        >
          {SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="rounded-2xl border border-[#6b1d1d]/10 p-3.5 text-sm">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-[#6b1d1d]">
          Payment Method
        </legend>
        <div className="mt-1 flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={paymentMethod === "cod"}
              onChange={() => setPaymentMethod("cod")}
              className="accent-[#c45c26]"
            />
            Cash on Delivery (COD)
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-[#2a1a12]/80">
            <input
              type="radio"
              name="paymentMethod"
              value="upi"
              checked={paymentMethod === "upi"}
              onChange={() => setPaymentMethod("upi")}
              className="accent-[#c45c26]"
            />
            Instant UPI (GPay / PhonePe / Paytm)
          </label>
        </div>
      </fieldset>

      {globalError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
          {globalError}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-full py-3.5 text-sm font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition"
      >
        {loading ? "Verifying & Placing Order..." : "Confirm & Place Fresh Order"}
      </button>
    </form>
  );
}

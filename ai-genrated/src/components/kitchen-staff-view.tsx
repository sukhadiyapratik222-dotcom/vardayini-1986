"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface PickupOrderItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  pickupDate: string;
  pickupSlot: string;
  pickupOtp?: string | null;
  pickupVerifiedBy?: string | null;
  items: Array<{
    name: string;
    weight: string;
    quantity: number;
  }>;
  trackingToken?: string | null;
  latestMediaUrl?: string | null;
}

export function KitchenStaffView() {
  const [orders, setOrders] = useState<PickupOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<PickupOrderItem | null>(null);
  const [staffName, setStaffName] = useState("Staff 1");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingStage, setPendingStage] = useState<string | null>(null);

  // Load staff name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vsm_kitchen_staff_name");
      if (saved) setStaffName(saved);
    } catch {}
  }, []);

  function handleStaffNameChange(name: string) {
    setStaffName(name);
    try {
      localStorage.setItem("vsm_kitchen_staff_name", name);
    } catch {}
  }

  // Fetch Pickup orders
  async function loadOrders() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/pickups?limit=50", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      if (json.orders) {
        setOrders(
          json.orders.map((o: any) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customerName: o.customerName || o.userName || o.guestName || "Customer",
            customerPhone: o.customerPhone || o.userPhone || o.guestPhone || "-",
            status: o.status,
            pickupDate: o.pickupDate || "Today",
            pickupSlot: o.pickupSlot || o.deliverySlot || "Standard",
            pickupOtp: o.pickupOtp || null,
            pickupVerifiedBy: o.pickupVerifiedBy || null,
            items: Array.isArray(o.items)
              ? o.items.map((it: any) => ({
                  name: it.productName || it.name,
                  weight: it.variantWeight || it.weight || "Standard",
                  quantity: it.quantity || 1,
                }))
              : [],
            trackingToken: o.trackingToken || null,
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to load kitchen pickups:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  // Client-side image compression using HTML5 Canvas (max 1280px, jpeg 0.82)
  async function compressImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement("img");
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Handle stage transition with optional photo
  async function triggerStageAdvance(stage: string, fileDataUrl?: string) {
    if (!selectedOrder) return;
    try {
      setIsUploading(true);
      setUploadProgress("Uploading photo & notifying customer...");

      let uploadedFileUrl: string | null = null;

      if (fileDataUrl) {
        const uploadRes = await fetch("/api/kitchen-cam/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: fileDataUrl }),
        });
        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          uploadedFileUrl = uploadJson.fileUrl;
        }
      }

      const stageRes = await fetch("/api/kitchen-cam/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: selectedOrder.orderNumber,
          newStage: stage,
          staffName,
          fileUrl: uploadedFileUrl,
          caption: `Milestone updated by ${staffName}`,
          pickupVerifiedBy: stage === "completed" ? staffName : undefined,
        }),
      });

      if (!stageRes.ok) throw new Error("Stage advance failed");

      setToast(`Order #${selectedOrder.orderNumber} advanced to ${stage.toUpperCase()}!`);
      setTimeout(() => setToast(null), 4000);

      // Refresh list
      await loadOrders();
      setSelectedOrder(null);
    } catch (err: any) {
      alert("Error updating order: " + err.message);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      setPendingStage(null);
    }
  }

  // Handle file capture from phone camera
  async function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingStage) return;

    try {
      setIsUploading(true);
      setUploadProgress("Compressing image...");
      let dataUrl: string;
      if (file.type.startsWith("image/")) {
        dataUrl = await compressImageFile(file);
      } else {
        // video
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
      }

      await triggerStageAdvance(pendingStage, dataUrl);
    } catch (err: any) {
      alert("Failed to process photo: " + err.message);
      setIsUploading(false);
      setUploadProgress(null);
    }
  }

  function promptPhotoForStage(stage: string) {
    setPendingStage(stage);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "preparing") return o.status === "preparing";
    if (filter === "packed") return o.status === "packed";
    if (filter === "ready_for_pickup") return o.status === "ready_for_pickup";
    if (filter === "completed") return o.status === "delivered" || o.status === "completed";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Hidden file input with mobile camera capture */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl bg-emerald-700 text-white font-bold text-sm shadow-2xl flex items-center gap-2">
          <span>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#0b2f8a] text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👨‍🍳</span>
            <div>
              <h1 className="text-base font-bold tracking-tight">Vardayini Kitchen &amp; Pickup Desk</h1>
              <p className="text-[11px] text-amber-200">Live Counter Photos &amp; Stage Control</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={staffName}
              onChange={(e) => handleStaffNameChange(e.target.value)}
              placeholder="Staff Name"
              className="bg-white/20 text-white placeholder-white/60 text-xs px-3 py-1.5 rounded-xl border border-white/30 w-28 text-center font-bold focus:outline-hidden"
              title="Your staff name"
            />
            <button
              onClick={loadOrders}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition"
              title="Refresh Queue"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none text-xs font-bold">
          {[
            { id: "all", label: `All Today (${orders.length})` },
            { id: "preparing", label: "In Kitchen" },
            { id: "packed", label: "Box Packed" },
            { id: "ready_for_pickup", label: "Ready at Counter" },
            { id: "completed", label: "Handed Over" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl shrink-0 transition cursor-pointer ${
                filter === tab.id
                  ? "bg-[#0b2f8a] text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Empty State */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold text-sm">
            Loading today's store pickup queue...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 mt-4 text-slate-500">
            <span className="text-3xl block mb-2">🎉</span>
            <p className="font-bold">No pickup orders in this filter.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 hover:border-[#dfb755] transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-black text-[#0b2f8a]">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.status === "ready_for_pickup"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : order.status === "preparing"
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : order.status === "packed"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : order.status === "delivered" || order.status === "completed"
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">{order.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono">📱 {order.customerPhone}</p>
                  </div>

                  {/* OTP Badge */}
                  {order.pickupOtp && (
                    <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-300 text-center">
                      <span className="text-[9px] uppercase font-bold text-amber-800 block">OTP Code</span>
                      <span className="font-mono text-lg font-black text-amber-950 tracking-wider">
                        {order.pickupOtp}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items Summary */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Order Items ({order.items.length})
                  </span>
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span className="font-medium">
                        {it.name} <span className="text-slate-400">({it.weight})</span>
                      </span>
                      <span className="font-bold font-mono">x{it.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Slot Details */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span>📅 Pickup: {order.pickupDate}</span>
                  <span>⏰ Slot: {order.pickupSlot}</span>
                </div>

                {/* Action Buttons for Kitchen Staff */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="flex-1 min-w-[140px] py-2.5 px-4 rounded-2xl bg-[#0b2f8a] hover:bg-[#071c54] text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <span>📸</span>
                    <span>Update Stage &amp; Photo</span>
                  </button>

                  <Link
                    href={`/kitchen/slip/${order.orderNumber}`}
                    target="_blank"
                    className="py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
                    title="Print kitchen slip"
                  >
                    <span>🖨️</span>
                    <span>Slip</span>
                  </Link>

                  {order.trackingToken && (
                    <Link
                      href={`/pickup-cam/${order.trackingToken}`}
                      target="_blank"
                      className="py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1.5"
                      title="Open customer live view"
                    >
                      <span>🎥</span>
                      <span>Live Cam</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage Update & Photo Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#071c54]">
                  Advance Stage for #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-500">{selectedOrder.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {isUploading && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-800 border-t-transparent mx-auto" />
                <p className="text-xs font-bold text-amber-900">{uploadProgress}</p>
              </div>
            )}

            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Choose New Stage:
              </span>

              {/* 1. Preparing */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => triggerStageAdvance("preparing")}
                  className="flex-1 py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-950 font-bold text-xs text-left flex items-center justify-between"
                >
                  <span>1. 🍳 Start Preparing (Karahi)</span>
                  <span className="text-[10px] text-blue-600">Quick Update →</span>
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => promptPhotoForStage("preparing")}
                  className="py-3 px-3.5 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition"
                  title="Snap photo of prep"
                >
                  📸 + Photo
                </button>
              </div>

              {/* 2. Packed */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => triggerStageAdvance("packed")}
                  className="flex-1 py-3 px-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-950 font-bold text-xs text-left flex items-center justify-between"
                >
                  <span>2. 📦 Mark Quality Checked &amp; Packed</span>
                  <span className="text-[10px] text-purple-600">Quick Update →</span>
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => promptPhotoForStage("packed")}
                  className="py-3 px-3.5 rounded-2xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition"
                  title="Snap photo of packed box"
                >
                  📸 + Box Photo
                </button>
              </div>

              {/* 3. Ready for Counter Pickup */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => triggerStageAdvance("ready_for_pickup")}
                  className="flex-1 py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs text-left flex items-center justify-between"
                >
                  <span>3. 🛍️ Ready for Customer Pickup (At Counter)</span>
                  <span className="text-[10px] text-amber-700">Send OTP Alert →</span>
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => promptPhotoForStage("ready_for_pickup")}
                  className="py-3 px-3.5 rounded-2xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
                  title="Snap photo of counter pickup"
                >
                  📸 + Counter Photo
                </button>
              </div>

              {/* 4. Handover & OTP Verification */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <span className="text-xs font-bold text-emerald-950 block">
                  4. 🔑 Verify OTP &amp; Complete Handover
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.trim())}
                    placeholder="Enter 6-digit Customer OTP"
                    className="flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-center font-mono text-base font-bold text-emerald-950 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    disabled={isUploading || otpInput.length < 4}
                    onClick={() => {
                      if (selectedOrder.pickupOtp && otpInput !== selectedOrder.pickupOtp) {
                        alert("OTP does not match customer's pickup OTP!");
                        return;
                      }
                      triggerStageAdvance("completed");
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold disabled:opacity-50 transition cursor-pointer"
                  >
                    Verify &amp; Handover
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

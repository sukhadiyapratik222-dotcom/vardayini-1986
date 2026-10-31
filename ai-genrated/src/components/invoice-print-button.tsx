"use client";

export function InvoicePrintButton() {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-4 py-2 bg-[#6b1d1d] hover:bg-[#521616] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
      >
        <span>🖨️</span>
        <span>Print Invoice / Save PDF</span>
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
      >
        ✕ Close
      </button>
    </div>
  );
}


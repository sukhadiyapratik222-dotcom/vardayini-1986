"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface ShowingDropdownProps {
  currentLimit?: string;
  options?: number[];
}

export function ShowingDropdown({
  currentLimit,
  options = [9, 15, 24],
}: ShowingDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLimit = currentLimit ? (currentLimit === "all" ? "All" : currentLimit) : "9";

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: number | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(val));
    params.set("page", "1"); // Reset to first page
    router.push(`/shop?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Dropdown Button matching Screenshot: Rounded box with Green border */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-between gap-3 rounded-xl border-2 border-[#16a34a] bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-2xs hover:bg-emerald-50/20 focus:outline-none transition"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span>
          Showing{selectedLimit ? `: ${selectedLimit}` : ""}
        </span>
        <svg
          className={`w-4 h-4 text-[#16a34a] transition-transform stroke-[2.5] ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu (Exact Replica of User Screenshot) */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 z-50 mt-1.5 w-32 rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Bar matching Screenshot */}
          <div className="bg-[#5f6368] text-white px-3 py-1.5 text-xs font-bold tracking-wide">
            Showing
          </div>

          {/* Options: 9, 15, 24 */}
          <div className="py-1">
            {options.map((opt) => {
              const isSelected = selectedLimit === String(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3.5 py-2 text-sm font-semibold transition flex items-center justify-between ${
                    isSelected
                      ? "bg-emerald-50 text-[#16a34a] font-bold"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <span className="text-xs">✓</span>}
                </button>
              );
            })}

            {/* All items option */}
            <button
              type="button"
              onClick={() => handleSelect("all")}
              className={`w-full text-left px-3.5 py-2 text-xs font-semibold border-t border-slate-100 transition flex items-center justify-between ${
                selectedLimit === "All"
                  ? "bg-emerald-50 text-[#16a34a] font-bold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>All Items</span>
              {selectedLimit === "All" && <span className="text-xs">✓</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

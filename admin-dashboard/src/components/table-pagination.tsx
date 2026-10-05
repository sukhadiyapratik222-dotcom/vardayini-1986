"use client";

import React from "react";

export interface TablePaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export function TablePagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemName = "records",
  className = "",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to display with smart ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (validCurrentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 ${className}`}
    >
      {/* Record info & Table Length dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800 font-mono">{startRecord}</span> to{" "}
          <span className="font-bold text-slate-800 font-mono">{endRecord}</span> of{" "}
          <span className="font-bold text-slate-800 font-mono">{totalItems}</span> {itemName}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200">
            <span className="text-[11px] text-slate-400 font-medium">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Math.min(50, Number(e.target.value));
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-[#0b2f8a] shadow-2xs cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 50 ? "50 (Max)" : opt} per page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, validCurrentPage - 1))}
            disabled={validCurrentPage <= 1}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs flex items-center gap-1"
            title="Previous page"
          >
            ‹ Prev
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1 text-slate-400 font-mono select-none">
                    ...
                  </span>
                );
              }

              const pageNum = Number(p);
              const isActive = pageNum === validCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center font-mono ${
                    isActive
                      ? "bg-[#0b2f8a] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, validCurrentPage + 1))}
            disabled={validCurrentPage >= totalPages}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white font-semibold text-slate-600 shadow-2xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs flex items-center gap-1"
            title="Next page"
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
}

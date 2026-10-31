"use client";

import { useState, useRef } from "react";
import { toast } from "@/lib/toast";

export const PHOTO_GALLERY = [
  // Mithai
  { name: "Kaju Katli Diamond", url: "/images/kaju-katli-showcase.jpg", category: "Mithai" },
  { name: "Motichoor Ladoo", url: "/images/motichoor-showcase.jpg", category: "Mithai" },
  { name: "Kesar Peda", url: "/images/peda.jpg", category: "Mithai" },
  { name: "Gulab Jamun", url: "/images/gulab-jamun.jpg", category: "Mithai" },
  { name: "Crispy Jalebi", url: "/images/jalebi.jpg", category: "Mithai" },
  { name: "Royal Rasmalai", url: "/images/rasmalai.jpg", category: "Mithai" },
  { name: "Gujarati Mithai Assorted", url: "/images/gujarati-mithai-showcase.jpg", category: "Mithai" },
  { name: "Kaju Katli Classic", url: "/images/kaju-katli.jpg", category: "Mithai" },
  { name: "Motichoor Classic", url: "/images/motichoor.jpg", category: "Mithai" },

  // Farsan
  { name: "Nylon Khaman Dhokla", url: "/images/khaman-showcase.jpg", category: "Farsan" },
  { name: "Surati Khandvi Roll", url: "/images/khandvi-showcase.jpg", category: "Farsan" },
  { name: "Khaman Classic", url: "/images/khaman.jpg", category: "Farsan" },
  { name: "Khandvi Classic", url: "/images/khandvi.jpg", category: "Farsan" },
  { name: "Crispy Gujarati Namkeen", url: "/images/namkeen.jpg", category: "Farsan" },

  // Festive & Hampers
  { name: "Diwali Sweets & Diyas Background", url: "/images/diwali-bg.jpg", category: "Festive" },
  { name: "Navratri & Dussehra Jalebi Celebration", url: "/images/dussehra-jalebi.jpg", category: "Festive" },
  { name: "Raksha Bandhan Royal Hamper", url: "/images/festive-hamper.jpg", category: "Festive" },
  { name: "Ganesh Chaturthi Modak Bhog", url: "/images/modak-bhog.jpg", category: "Festive" },
  { name: "Holi Mawa Gujiya Delicacy", url: "/images/holi-gujiya.jpg", category: "Festive" },
  { name: "Uttarayan Royal Chikki Assortment", url: "/images/uttarayan-chikki.jpg", category: "Festive" },
  { name: "Shahi Festive Platter", url: "/images/mithai-platter-showcase.jpg", category: "Festive" },
  { name: "Luxury Gift Hamper Box", url: "/images/hamper.jpg", category: "Festive" },
  { name: "Dry Fruit Bites Platter", url: "/images/dry-fruit-bite.jpg", category: "Festive" },

  // Banners & Panoramas
  { name: "Diwali Sweets & Diyas Background Banner", url: "/images/diwali-bg.jpg", category: "Banner" },
  { name: "Heritage Karigar Panorama Banner", url: "/images/heritage-hero-banner.png", category: "Banner" },
  { name: "Luxury Mithai Row Wide Banner", url: "/images/mithai-row-banner.png", category: "Banner" },
  { name: "Modern Mithai Showcase Banner", url: "/images/modern-hero.jpg", category: "Banner" },

  // Brand Logo
  { name: "Vardayini Royal Crest Logo", url: "/images/brand-logo.png", category: "Logo" },
];

interface ImagePickerFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  presetFilter?: "all" | "Mithai" | "Farsan" | "Banner" | "Festive" | "Logo";
}

export function ImagePickerField({
  label,
  value,
  onChange,
  helperText,
  presetFilter = "all",
}: ImagePickerFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryCategory, setGalleryCategory] = useState<string>(
    presetFilter !== "all" ? presetFilter : "all"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a valid image file (.png, .jpg, .webp)");
      return;
    }

    // Check size (< 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large. Please select an image under 10MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // First try local admin dashboard upload route
      let res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      // If local failed, fallback to storefront upload route
      if (!res.ok) {
        const storeApi = process.env.NEXT_PUBLIC_STORE_API || "http://localhost:9449";
        res = await fetch(`${storeApi}/api/upload`, {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();
      if (data?.url) {
        onChange(data.url);
        toast.success(`Photo "${file.name}" uploaded successfully!`);
      } else {
        throw new Error(data?.error || "Upload failed");
      }
    } catch {
      // Fallback: Read as Base64 Data URL so user is never blocked
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        if (base64Url) {
          onChange(base64Url);
          toast.success(`Photo "${file.name}" loaded successfully!`);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const filteredPhotos =
    galleryCategory === "all"
      ? PHOTO_GALLERY
      : PHOTO_GALLERY.filter((p) => p.category === galleryCategory);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
        {value && (
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
            {value}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Thumbnail Preview */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-sm group">
          {value ? (
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onError={(e) => {
                // Fallback icon if URL is broken
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
              <span>🖼️</span>
              <span>No Photo</span>
            </div>
          )}
        </div>

        {/* Action Controls: Choose File, Choose from Gallery, or Paste URL */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            {/* Choose File Button */}
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0b2f8a] hover:bg-[#071c54] text-white shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <span>📁</span>
                  <span>Choose File (Upload)</span>
                </>
              )}
            </button>

            {/* Choose from Photos Gallery Button */}
            <button
              type="button"
              onClick={() => setShowGallery(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition flex items-center gap-1.5"
            >
              <span>🖼️</span>
              <span>Choose from Photos</span>
            </button>

            {/* Clear Button */}
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                title="Clear image"
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Direct URL input fallback */}
          <div className="relative">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Or paste image URL (e.g. /images/... or https://...)"
              className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 focus:border-[#0b2f8a] focus:ring-1 focus:ring-[#0b2f8a] outline-none text-slate-700 bg-white"
            />
          </div>
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 leading-normal">
          {helperText}
        </p>
      )}

      {/* Photo Gallery Modal */}
      {showGallery && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0b2f8a] flex items-center gap-2">
                  <span>🖼️</span> Choose from Photo Library
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any authentic Vardayini Sweet Mart product photo or banner.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGallery(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {["all", "Mithai", "Farsan", "Festive", "Banner", "Logo"].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGalleryCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                    galleryCategory === cat
                      ? "bg-[#0b2f8a] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat === "all" ? "All Photos" : cat}
                </button>
              ))}
            </div>

            {/* Photos Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-1">
              {filteredPhotos.map((photo) => {
                const isSelected = value === photo.url;
                return (
                  <button
                    key={photo.url}
                    type="button"
                    onClick={() => {
                      onChange(photo.url);
                      setShowGallery(false);
                      toast.success(`Selected "${photo.name}"`);
                    }}
                    className={`group text-left p-2 rounded-2xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? "border-2 border-[#0b2f8a] bg-blue-50/50 shadow-md ring-2 ring-[#0b2f8a]/20"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white"
                    }`}
                  >
                    <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 relative">
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-[#0b2f8a] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="px-0.5">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {photo.name}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {photo.category}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                {filteredPhotos.length} photos available
              </span>
              <button
                type="button"
                onClick={() => setShowGallery(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

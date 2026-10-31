'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface StoreOutlet {
  id: number | string;
  name: string;
  badge?: string;
  address: string;
  city: string;
  pincode: string;
  phone: string;
  phoneInquiries?: string;
  emailGeneral?: string;
  emailCareers?: string;
  hours: string;
  lat: string | number;
  lng: string | number;
  image?: string;
  mapUrl?: string | null;
  directionsUrl?: string;
  isComingSoon?: boolean;
}

// Default Outlets with authentic Gujarat flagship locations + London, Ontario expansion
export const DEFAULT_OUTLETS: StoreOutlet[] = [
  {
    id: 1,
    name: 'Vardayini Sweet Mart (Kalol Flagship)',
    badge: 'Main Flagship Store · Since 1976',
    address: '6A, Navjivan Shopping Center, Kalol',
    city: 'Kalol, Gandhinagar, Gujarat',
    pincode: '382721',
    phone: '+91 63531 19329',
    phoneInquiries: '+91 63521 19329',
    emailGeneral: 'orders@vardayini.com',
    emailCareers: 'careers@vardayinisweets.com',
    hours: '8:00 AM – 8:30 PM (All 7 Days)',
    lat: '23.246300',
    lng: '72.508600',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.google.com/maps?q=23.2463,72.5086',
    directionsUrl: 'https://maps.google.com/maps?q=23.2463,72.5086',
    isComingSoon: false,
  },
  {
    id: 2,
    name: 'Kandoi Rupalvada (Vardayini Mata Mandir)',
    badge: 'Heritage Rupal Counter',
    address: 'Vardayini Mata Mandir ni same, Rupal',
    city: 'Gandhinagar, Gujarat',
    pincode: '382630',
    phone: '+91 63531 19329',
    phoneInquiries: '+91 63521 19329',
    emailGeneral: 'rupal@vardayinisweets.com',
    emailCareers: 'careers@vardayinisweets.com',
    hours: '7:30 AM – 10:00 PM (All 7 Days)',
    lat: '23.310000',
    lng: '72.596900',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.google.com/maps?q=23.3100,72.5969',
    directionsUrl: 'https://maps.google.com/maps?q=23.3100,72.5969',
    isComingSoon: false,
  },
  {
    id: 3,
    name: 'Vardayini Mandvi (Heritage Flagship)',
    badge: 'Flagship Store · Since 1994',
    address: '12, Mandvi Pol, opposite Mahalaxmi Temple, Mandvi',
    city: 'Vadodara, Gujarat',
    pincode: '390001',
    phone: '+91 265 242 1186',
    phoneInquiries: '+91 98250 19760',
    emailGeneral: 'mandvi@vardayinisweets.com',
    emailCareers: 'careers@vardayinisweets.com',
    hours: '8:00 AM – 10:30 PM (All 7 Days)',
    lat: '22.307200',
    lng: '73.181200',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.google.com/maps?q=22.3072,73.1812',
    directionsUrl: 'https://maps.google.com/maps?q=22.3072,73.1812',
    isComingSoon: false,
  },
  {
    id: 4,
    name: 'Vardayini Alkapuri (Modern Boutique)',
    badge: 'Boutique & Sweet Counter',
    address: '33, RC Dutt Road, Alkapuri',
    city: 'Vadodara, Gujarat',
    pincode: '390007',
    phone: '+91 265 233 4411',
    phoneInquiries: '+91 98251 23456',
    emailGeneral: 'alkapuri@vardayinisweets.com',
    emailCareers: 'careers@vardayinisweets.com',
    hours: '9:00 AM – 10:00 PM (All 7 Days)',
    lat: '22.313500',
    lng: '73.171800',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.google.com/maps?q=22.3135,73.1718',
    directionsUrl: 'https://maps.google.com/maps?q=22.3135,73.1718',
    isComingSoon: false,
  },
  {
    id: 5,
    name: 'Vardayini CG Road (Ahmedabad Hub)',
    badge: 'Ahmedabad Flagship Counter',
    address: 'Ground Floor, Heritage Plaza, CG Road, Navrangpura',
    city: 'Ahmedabad, Gujarat',
    pincode: '380009',
    phone: '+91 79 2646 5522',
    phoneInquiries: '+91 99099 44331',
    emailGeneral: 'cgroadd@vardayinisweets.com',
    emailCareers: 'careers@vardayinisweets.com',
    hours: '9:00 AM – 11:00 PM (All 7 Days)',
    lat: '23.033000',
    lng: '72.565000',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.google.com/maps?q=23.0330,72.5650',
    directionsUrl: 'https://maps.google.com/maps?q=23.0330,72.5650',
    isComingSoon: false,
  },
  {
    id: 6,
    name: 'Coming to London, Ontario',
    badge: 'International Expansion · Coming Soon',
    address: '820 Blythwood Rd, London, ON N6H 5T8',
    city: 'London, Ontario (Canada)',
    pincode: 'N6H 5T8',
    phone: '+1 (519) 641-8988',
    phoneInquiries: '+1 (519) 854-4888',
    emailGeneral: 'admin@jhsupermarket.ca',
    emailCareers: 'jobs@jhsupermarket.ca',
    hours: 'Coming Soon · Mon–Sun 10:00 AM – 9:00 PM',
    lat: '42.9908973',
    lng: '-81.2986342',
    image: '/images/shop.jpg',
    mapUrl: 'https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5',
    directionsUrl: 'https://maps.app.goo.gl/WwNxd8ZtkzKtKFqr5',
    isComingSoon: true,
  },
];

interface OutletsSectionProps {
  initialStores?: Array<{
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
  }>;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function OutletsSection({
  initialStores,
  title = 'Our Outlets & Stores',
  subtitle = 'Visit our heritage sweet counters for live warm jalebi, pure shuddh cow ghee delicacies, and festive gift boxes.',
  compact = false,
}: OutletsSectionProps) {
  const [storesData, setStoresData] = useState<any[] | null>(
    initialStores && initialStores.length > 0 ? initialStores : null
  );

  // Keep synchronized with the database so any outlets added/edited in admin display immediately
  useEffect(() => {
    let isMounted = true;
    fetch('/api/stores')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && Array.isArray(data?.stores)) {
          setStoresData(data.stores);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const activeStores = storesData ?? initialStores ?? null;

  // Use database stores as source of truth, enrich with DEFAULT_OUTLETS data
  const outletsList: StoreOutlet[] = React.useMemo(() => {
    if (!activeStores || activeStores.length === 0) {
      return DEFAULT_OUTLETS;
    }

    return activeStores.map((store) => {
      const sName = (store.name || "").toLowerCase();
      const sAddr = (store.address || "").toLowerCase();
      const sCity = (store.city || "").toLowerCase();

      const isKalol = sName.includes("kalol") || sAddr.includes("kalol") || sAddr.includes("navjivan") || sCity.includes("kalol") || store.pincode === "382721";
      const isRupal = sName.includes("rupal") || sAddr.includes("rupal") || store.pincode === "382630";
      const isMandvi = sName.includes("mandvi") || sAddr.includes("mandvi");
      const isAlkapuri = sName.includes("alkapuri") || sAddr.includes("alkapuri");
      const isAhmedabad = sName.includes("cg road") || sAddr.includes("cg road") || sCity.includes("ahmedabad");

      // Find matching default outlet to enrich data (by name, address or specific branch)
      const match = DEFAULT_OUTLETS.find(
        (d) =>
          (isKalol && (d.name.includes("Kalol") || d.address.includes("Navjivan"))) ||
          (isRupal && d.name.toLowerCase().includes("rupal")) ||
          (isMandvi && d.name.toLowerCase().includes("mandvi")) ||
          (isAlkapuri && d.name.toLowerCase().includes("alkapuri")) ||
          (isAhmedabad && d.name.toLowerCase().includes("cg road")) ||
          d.name.toLowerCase().includes(sName) ||
          sName.includes(d.name.toLowerCase())
      );

      const hasValidLat = store.lat && Number(store.lat) !== 0 && !isNaN(Number(store.lat));
      const hasValidLng = store.lng && Number(store.lng) !== 0 && !isNaN(Number(store.lng));

      let resolvedLat = "23.246300";
      let resolvedLng = "72.508600";

      if (hasValidLat && hasValidLng) {
        resolvedLat = String(store.lat);
        resolvedLng = String(store.lng);
      } else if (isKalol) {
        resolvedLat = "23.246300";
        resolvedLng = "72.508600";
      } else if (isRupal) {
        resolvedLat = "23.310000";
        resolvedLng = "72.596900";
      } else if (isMandvi) {
        resolvedLat = "22.307200";
        resolvedLng = "73.181200";
      } else if (isAlkapuri) {
        resolvedLat = "22.313500";
        resolvedLng = "73.171800";
      } else if (isAhmedabad) {
        resolvedLat = "23.033000";
        resolvedLng = "72.565000";
      } else if (match?.lat && match?.lng) {
        resolvedLat = String(match.lat);
        resolvedLng = String(match.lng);
      }

      const directMapUrl = store.mapUrl?.trim() && !store.mapUrl.includes("q=0,0") && !store.mapUrl.includes("q=null")
        ? store.mapUrl.trim()
        : match?.mapUrl || `https://maps.google.com/maps?q=${resolvedLat},${resolvedLng}`;

      const resolvedDirectionsUrl = `https://maps.google.com/maps?q=${resolvedLat},${resolvedLng}`;

      const storeImage = store.image || store.imageUrl || match?.image || '/images/shop.jpg';

      return {
        id: store.id,
        name: store.name,
        badge: match?.badge || (isKalol ? "Main Flagship Store · Since 1976" : isRupal ? "Heritage Rupal Counter" : `${store.city} Counter`),
        address: store.address,
        city: store.city,
        pincode: store.pincode || (isKalol ? "382721" : isRupal ? "382630" : "390001"),
        phone: store.phone || "+91 63531 19329",
        phoneInquiries: match?.phoneInquiries || store.phone || '+91 63521 19329',
        emailGeneral: match?.emailGeneral || 'orders@vardayini.com',
        emailCareers: match?.emailCareers || 'careers@vardayinisweets.com',
        hours: store.hours || '8:00 AM – 8:30 PM (All 7 Days)',
        lat: resolvedLat,
        lng: resolvedLng,
        image: storeImage,
        mapUrl: directMapUrl,
        directionsUrl: resolvedDirectionsUrl,
        isComingSoon: Boolean(
          store.hours?.toLowerCase().includes('coming soon') ||
          store.name?.toLowerCase().includes('coming soon') ||
          match?.isComingSoon
        ),
      };
    });
  }, [activeStores]);

  // Selected tab: specific store ID (default to first outlet)
  const [activeTab, setActiveTab] = useState<number | string>(outletsList[0]?.id || 1);

  React.useEffect(() => {
    if (outletsList.length > 0 && !outletsList.some((s) => s.id === activeTab)) {
      setActiveTab(outletsList[0].id);
    }
  }, [outletsList, activeTab]);

  const selectedOutlet = outletsList.find((s) => s.id === activeTab) || outletsList[0];

  return (
    <section className="section_contact14 py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-[#faf6ee] via-white to-[#faf6ee]">
      <div className="padding-global mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="container-large">
          <div className="padding-section-large">
            {/* Header with Title & Outlets Selector */}
            <div className="contact14_component">
              <div className="margin-bottom margin-xxlarge mb-8 sm:mb-10">
                <div className="max-width-large max-w-3xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#b45309]/10 text-[#b45309] text-xs font-bold tracking-wider uppercase">
                    📍 Heritage Counters &amp; Outlets
                  </span>
                  <div className="margin-bottom margin-small mt-2">
                    <h2 className="heading-style-h2 font-[family-name:var(--font-display)] text-2xl sm:text-4xl lg:text-5xl font-bold text-[#24142e] tracking-tight">
                      {title}
                    </h2>
                  </div>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-slate-600 leading-relaxed">
                    {subtitle}
                  </p>
                </div>

                {/* Outlet Selection Tabs (User chooses manually) */}
                <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-1.5 sm:gap-2.5 border-b border-amber-900/10 pb-3 sm:pb-4">
                  {outletsList.map((outlet) => {
                    const isSelected = activeTab === outlet.id;
                    return (
                      <button
                        key={outlet.id}
                        type="button"
                        onClick={() => setActiveTab(outlet.id)}
                        className={`rounded-full px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 ${
                          isSelected
                            ? 'bg-[#3b1e54] text-white shadow-md font-bold scale-[1.02]'
                            : 'bg-white text-slate-700 hover:bg-amber-50 hover:text-[#3b1e54] border border-slate-200 font-medium'
                        }`}
                      >
                        <span className="text-xs sm:text-sm">📍</span>
                        <span className="truncate max-w-[150px] sm:max-w-none">{outlet.name.replace(/ – /g, ' · ').replace(/\(.*?\)/g, '').trim()}</span>
                        {outlet.isComingSoon ? (
                          <span className="rounded-full bg-amber-500/20 text-[#b45309] px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold shrink-0">
                            Coming Soon
                          </span>
                        ) : (
                          <span className={`rounded-full px-2 py-0.5 text-[9.5px] sm:text-[10px] font-bold shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            Open
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Render Selected Outlet Card */}
              {selectedOutlet && (
                <div className="transition-opacity duration-300">
                  <OutletContactCard outlet={selectedOutlet} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface OutletContactCardProps {
  outlet: StoreOutlet;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function OutletContactCard({ outlet }: OutletContactCardProps) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const sLat = Number(outlet.lat);
  const sLng = Number(outlet.lng);
  const hasCoords = !isNaN(sLat) && !isNaN(sLng) && sLat !== 0 && sLng !== 0;

  // Real location map query with place name and address for authentic pinpoint
  const placeQuery = outlet.address
    ? `${outlet.name}, ${outlet.address}, ${outlet.city}`
    : (hasCoords ? `${outlet.lat},${outlet.lng}` : "Vardayini Sweet Mart, Kalol, Gujarat");

  // High-zoom street-level map view (z=16) with &ll and &t=m for precise Gujarat centering
  const mapIframeSrc = hasCoords
    ? `https://maps.google.com/maps?q=${encodeURIComponent(placeQuery)}&ll=${outlet.lat},${outlet.lng}&z=16&t=m&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(placeQuery)}&z=16&t=m&output=embed`;

  const handleLocateMe = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });
        if (hasCoords) {
          const d = calculateDistance(uLat, uLng, sLat, sLng);
          setDistanceKm(d);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationError("Please enable device location to view directions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const directionsLink = userCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${userCoords.lat},${userCoords.lng}&destination=${encodeURIComponent(placeQuery)}`
    : (outlet.mapUrl || outlet.directionsUrl || `https://maps.google.com/maps?q=${encodeURIComponent(placeQuery)}`);

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-amber-900/10 bg-white p-3.5 sm:p-8 lg:p-10 shadow-xl transition hover:shadow-2xl">
      {/* Outlet Title Bar */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2.5 border-b border-amber-900/10 pb-3 sm:pb-4">
        <div className="min-w-0">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#b45309]">
            {outlet.badge || outlet.city}
          </span>
          <h3 className="heading-style-h2 mt-0.5 font-[family-name:var(--font-display)] text-xl sm:text-3xl font-bold text-[#24142e] truncate">
            {outlet.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {outlet.isComingSoon ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Opening Soon
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Open Daily
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Left Contact List, Right Map Wrapper */}
      <div className="w-layout-grid contact14_content grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-stretch">
        {/* Left Column: Contact Items */}
        <div className="contact14_content-left lg:col-span-5 flex flex-col justify-between space-y-4 sm:space-y-6">
          <div className="contact14_contact-list space-y-3.5 sm:space-y-5">
            {/* Storefront & Sweet Kitchen Photo Banner */}
            <div className="relative h-44 sm:h-52 w-full rounded-2xl overflow-hidden shadow-md border border-amber-900/10 group bg-slate-900">
              <Image
                src={outlet.image || "/images/shop.jpg"}
                alt={`${outlet.name} storefront and live sweet counter`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                <span className="rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white border border-white/20 flex items-center gap-1 shadow-xs">
                  <span>📷</span>
                  <span>Storefront Photo</span>
                </span>
                <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-xs">
                  ● Live Counter
                </span>
              </div>
              <div className="absolute bottom-2.5 left-3 right-3 text-white">
                <p className="text-xs sm:text-sm font-bold tracking-tight drop-shadow-sm truncate">
                  {outlet.name}
                </p>
                <p className="text-[10px] sm:text-[11px] text-white/85 truncate drop-shadow-xs">
                  📍 {outlet.address}, {outlet.city}
                </p>
              </div>
            </div>

            {/* 1. Location Item */}
            <div className="contact14_item p-3.5 sm:p-4 rounded-2xl bg-[#faf6ee] border border-amber-900/5">
              <div className="margin-bottom margin-xsmall mb-2 sm:mb-3">
                <div className="contact14_icon-wrapper flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-500/15 text-[#b45309]">
                  <div className="icon-embed-small w-embed h-5 w-5 sm:h-6 sm:w-6">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                      viewBox="0 0 24 24"
                      fill="none"
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                      role="img"
                    >
                      <path
                        d="M11.9999 2.34473C14.0242 2.34473 15.8029 3.04933 17.3553 4.47754C18.8789 5.87913 19.6552 7.7626 19.6552 10.1826C19.6551 11.1679 19.4382 12.1526 18.996 13.1406C18.5425 14.154 17.9734 15.1246 17.288 16.0527C16.5966 16.9889 15.8458 17.8627 15.035 18.6738C14.212 19.4974 13.4447 20.2259 12.7333 20.8594L12.7274 20.8643L12.7225 20.8691C12.632 20.9548 12.5274 21.017 12.4052 21.0566C12.2587 21.1041 12.1215 21.126 11.9921 21.126C11.8628 21.126 11.7292 21.104 11.5897 21.0576C11.474 21.0191 11.3759 20.959 11.2899 20.875L11.2811 20.8662L11.2714 20.8584C10.5564 20.2252 9.78741 19.497 8.96472 18.6738C8.15398 17.8627 7.40315 16.9889 6.71179 16.0527C6.02653 15.1248 5.45811 14.1547 5.00671 13.1416C4.56634 12.1534 4.35052 11.1682 4.35046 10.1826C4.35046 7.76231 5.12659 5.8791 6.64832 4.47754C8.19864 3.04953 9.9756 2.34475 11.9999 2.34473ZM11.9999 3.05371C10.0646 3.05371 8.40981 3.72261 7.06824 5.05664C5.71865 6.39887 5.05359 8.12233 5.05359 10.1826C5.0537 11.6021 5.6475 13.1413 6.75183 14.7861C7.85668 16.4317 9.49736 18.2606 11.6591 20.2715L11.996 20.585L12.3358 20.2764C14.5486 18.2689 16.2062 16.4381 17.2889 14.7852C18.3677 13.138 18.9461 11.5989 18.9462 10.1826C18.9462 8.12228 18.2812 6.39888 16.9315 5.05664V5.05566C15.5897 3.72177 13.935 3.05375 11.9999 3.05371ZM11.9979 8.70215C12.3641 8.7022 12.6619 8.82522 12.9188 9.08105C13.175 9.33617 13.2977 9.63248 13.2977 9.99805C13.2977 10.3642 13.1747 10.6605 12.9198 10.915C12.6649 11.1694 12.3682 11.292 12.0018 11.292C11.6348 11.2919 11.3391 11.169 11.0848 10.916C10.8313 10.6634 10.708 10.3691 10.7079 10.0029C10.7079 9.68146 10.8022 9.41279 10.996 9.17871L11.0848 9.08105C11.3378 8.82567 11.6324 8.70215 11.9979 8.70215Z"
                        fill="currentColor"
                        stroke="currentColor"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="margin-bottom margin-xxsmall mb-1">
                <h4 className="heading-style-h6 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                  Location
                </h4>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-[#182230] leading-snug">
                {outlet.address}
              </div>
              <div className="mt-1 text-[11px] sm:text-xs text-slate-600">
                {outlet.city} · PIN: {outlet.pincode}
              </div>
              <div className="mt-2 text-[11px] sm:text-xs font-medium text-emerald-700">
                ⏰ {outlet.hours}
              </div>
              <div className="margin-top margin-small mt-3">
                <div className="button-group flex flex-wrap items-center gap-2">
                  <a
                    href={directionsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button is-link is-icon inline-flex items-center gap-1.5 rounded-full bg-[#3b1e54] text-white hover:bg-[#24142e] px-3.5 py-1.5 text-xs font-bold transition shadow-xs"
                  >
                    <span>Open in Maps ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-[#b45309] hover:bg-amber-500/30 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                  >
                    <span>🎯</span>
                    <span>{isLocating ? "Locating..." : "Locate Me"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Email Item */}
            <div className="contact14_item p-3.5 sm:p-4 rounded-2xl bg-[#faf6ee] border border-amber-900/5">
              <div className="margin-bottom margin-xxsmall mb-1">
                <h4 className="heading-style-h6 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email
                </h4>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <div>
                  <span className="text-slate-600 font-normal">General: </span>
                  <a
                    href={`mailto:${outlet.emailGeneral || 'orders@vardayinisweets.com'}`}
                    className="text-style-link font-semibold text-[#0b2f8a] hover:underline"
                  >
                    {outlet.emailGeneral || 'orders@vardayinisweets.com'}
                  </a>
                </div>
                <div>
                  <span className="text-slate-600 font-normal">Careers &amp; Bulk: </span>
                  <a
                    href={`mailto:${outlet.emailCareers || 'careers@vardayinisweets.com'}`}
                    className="text-style-link font-semibold text-[#0b2f8a] hover:underline"
                  >
                    {outlet.emailCareers || 'careers@vardayinisweets.com'}
                  </a>
                </div>
              </div>
            </div>

            {/* 3. Phone Item */}
            <div className="contact14_item p-3.5 sm:p-4 rounded-2xl bg-[#faf6ee] border border-amber-900/5">
              <div className="margin-bottom margin-xxsmall mb-1">
                <h4 className="heading-style-h6 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Phone
                </h4>
              </div>
              <div className="text-xs text-slate-700 space-y-1">
                <div>
                  <span className="text-slate-500 font-normal">Store counter: </span>
                  <a
                    href={`tel:${outlet.phone.replace(/[^+\d]/g, '')}`}
                    className="text-style-link font-semibold text-[#0b2f8a] hover:underline"
                  >
                    {outlet.phone}
                  </a>
                </div>
                {outlet.phoneInquiries && (
                  <div>
                    <span className="text-slate-500 font-normal">Inquiries: </span>
                    <a
                      href={`tel:${outlet.phoneInquiries.replace(/[^+\d]/g, '')}`}
                      className="text-style-link font-semibold text-[#0b2f8a] hover:underline"
                    >
                      {outlet.phoneInquiries}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2">
            <a
              href={directionsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 sm:flex-1 text-center rounded-xl bg-amber-600 text-white hover:bg-amber-700 py-2.5 px-3 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>📍 Directions &amp; Navigation ↗</span>
            </a>
            <a
              href={`tel:${outlet.phone.replace(/[^+\d]/g, '')}`}
              className="col-span-1 sm:flex-initial text-center rounded-xl bg-[#3b1e54] text-white hover:bg-[#24142e] py-2 px-3 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
            >
              <span>📞 Call</span>
            </a>
            <a
              href={`https://wa.me/${(outlet.phoneInquiries || outlet.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Hello, I would like to order fresh sweets from ${outlet.name}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-1 sm:flex-initial text-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 py-2 px-3 text-xs font-bold transition shadow-xs flex items-center justify-center gap-1"
            >
              <span>💬 WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Right Column: Google Maps Interactive View with Attached Store Photo */}
        <div className="contact14_map-wrapper lg:col-span-7 relative min-h-[340px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-amber-900/10 shadow-lg bg-[#e5e3df]">
          {/* Map Floating Top Badge (Store Photo Attached + Location Details + Open Store) */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/90">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Store Photo Thumbnail Attached to Google Location */}
              <div className="relative h-11 w-11 sm:h-13 sm:w-13 rounded-xl overflow-hidden shadow-md ring-2 ring-[#dfb755]/40 shrink-0 bg-slate-900">
                <Image
                  src={outlet.image || "/images/shop.jpg"}
                  alt={`${outlet.name} store photo`}
                  fill
                  className="object-cover"
                />
                <span className="absolute bottom-0 right-0 bg-[#3b1e54] text-white px-1 py-0.5 rounded-tl text-[8px] leading-none font-bold">
                  📍
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-xs sm:text-sm text-[#24142e] truncate">
                    {outlet.name}
                  </p>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[9px] font-bold shrink-0">
                    ★ 4.9
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-600 truncate mt-0.5">
                  {outlet.address}
                </p>
                <p className="text-[9.5px] text-emerald-700 font-semibold truncate flex items-center gap-1">
                  <span>✓ Official Counter</span>
                  <span>·</span>
                  <span>{outlet.hours}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleLocateMe}
                className="rounded-xl bg-amber-500/15 text-amber-900 hover:bg-amber-500/25 px-2.5 py-1.5 text-[10px] sm:text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Find distance from my device"
              >
                <span>🎯</span>
                <span>{isLocating ? "Locating..." : "Locate Me"}</span>
              </button>
              <a
                href={directionsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#3b1e54] text-white hover:bg-[#24142e] px-3 py-1.5 text-[10.5px] sm:text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>Open Store ↗</span>
              </a>
            </div>
          </div>

          {/* Distance / Device Location status alert if user clicked Locate Me */}
          {distanceKm !== null && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-center justify-between p-2 rounded-xl bg-[#140638]/95 text-white backdrop-blur-md text-[11px] shadow-lg border border-[#f5c518]/40">
              <span className="flex items-center gap-1.5 font-medium truncate">
                <span>🚗</span>
                <span>You are approximately <strong>{distanceKm} km</strong> from this outlet</span>
              </span>
              <a
                href={directionsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 shrink-0 rounded-lg bg-[#f5c518] px-2.5 py-1 text-[10px] font-bold text-[#140638] hover:brightness-105"
              >
                Start Navigation →
              </a>
            </div>
          )}

          {locationError && (
            <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 p-2 rounded-xl bg-rose-950/90 text-rose-200 backdrop-blur-md text-[10.5px] border border-rose-500/30">
              {locationError}
            </div>
          )}

          {/* Embedded Google Maps iframe */}
          <iframe
            title={`Interactive Google Map for ${outlet.name}`}
            src={mapIframeSrc}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
}

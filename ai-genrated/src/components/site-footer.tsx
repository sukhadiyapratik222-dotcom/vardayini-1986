import Link from "next/link";

export function SiteFooter() {
  const sweetsMenu = [
    { label: "Kaju Sweets", href: "/shop?category=kaju-sweets" },
    { label: "Mawa Sweets", href: "/shop?category=mawa-sweets" },
    { label: "Penda", href: "/shop?search=penda" },
    { label: "Sugarless Sweets", href: "/shop?category=sugarless-sweets" },
    { label: "Gift Hampers", href: "/shop?category=gift-hampers" },
    { label: "Indian Ghee Sweets", href: "/shop?category=indian-ghee-sweets" },
  ];

  const namkeenMenu = [
    { label: "Gujarati Farsan", href: "/shop?category=namkeen-farsan" },
    { label: "Millet", href: "/shop?category=millet" },
    { label: "Farali", href: "/shop?category=farali" },
    { label: "Khakhra", href: "/shop?category=khakhra" },
    { label: "Roasted", href: "/shop?category=roasted" },
    { label: "Mixture", href: "/shop?category=mixture" },
    { label: "Indian", href: "/shop?category=indian" },
    { label: "Daal/Lentil", href: "/shop?category=daal-lentil" },
    { label: "Sev", href: "/shop?category=sev" },
    { label: "Chips and Puris", href: "/shop?category=chips-and-puris" },
  ];

  const bakeryMenu = [
    { label: "Biscuits and Cookies", href: "/shop?category=biscuits-and-cookies" },
    { label: "Toast and Khari", href: "/shop?category=toast-and-khari" },
  ];

  const policiesMenu = [
    { label: "Terms & Conditions", href: "/policies?tab=terms" },
    { label: "Shipping Policy (Free > ₹799)", href: "/policies?tab=shipping" },
    { label: "Privacy Policy", href: "/policies?tab=privacy" },
    { label: "Cancellation Policy", href: "/policies?tab=cancellation" },
    { label: "Returns Policy", href: "/policies?tab=returns" },
    { label: "Refund Policy", href: "/policies?tab=refund" },
  ];

  return (
    <footer className="mt-20 border-t border-[#0b2f8a]/10 bg-[#071c54] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-12 space-y-12">
        {/* Top Tier: Brand Story & Visit Our Stores */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-10 border-b border-white/10">
          {/* Brand Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#dfb755] text-[#071c54] font-bold text-xl shadow-md">
                વ
              </div>
              <div>
                <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  વરદાયિની સ્વીટ માર્ટ
                </p>
                <p className="text-[11px] uppercase tracking-widest text-[#dfb755] font-semibold">
                  Vardayini Sweet Mart · Since 1976
                </p>
              </div>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-white/75">
              Authentic Gujarati mithai and fresh morning farsan from Vadodara. Pure shuddh desi ghee, saffron, and patience — rolled and packed the same morning it leaves our karigars.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#dfb755] font-medium pt-1">
              <span>✓ 100% Desi Ghee</span>
              <span>•</span>
              <span>✓ FSSAI Certified</span>
              <span>•</span>
              <span>✓ Made Fresh Daily</span>
            </div>
          </div>

          {/* Visit Our Stores */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#dfb755]">
              Visit Our Stores
            </p>
            <div className="space-y-2 text-sm text-white/80 leading-relaxed">
              <div>
                <p className="font-semibold text-white">Mandvi Main Counter</p>
                <p className="text-xs text-white/60">Opp. Tower, Mandvi, Vadodara</p>
              </div>
              <div className="pt-2">
                <p className="font-semibold text-white">Alkapuri Flagship</p>
                <p className="text-xs text-white/60">RC Dutt Road, Alkapuri, Vadodara</p>
              </div>
              <p className="text-xs text-[#dfb755] font-medium pt-1">
                Open 8:00 AM – 10:30 PM Daily · Support: +91 98250 19760
              </p>
            </div>
          </div>
        </div>

        {/* Explore Categories Menu (Exactly matching reference design) */}
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Column 1: Sweets */}
            <div>
              <h3 className="font-bold text-lg text-white">Sweets</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {sweetsMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Namkeen */}
            <div>
              <h3 className="font-bold text-lg text-white">Namkeen</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {namkeenMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Bakery */}
            <div>
              <h3 className="font-bold text-lg text-white">Bakery</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {bakeryMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Policies */}
            <div>
              <h3 className="font-bold text-lg text-white">Policies</h3>
              <div className="h-[2.5px] w-9 bg-[#dfb755] mt-1.5 mb-4 rounded-full" />
              <ul className="space-y-2.5 text-sm text-slate-300">
                {policiesMenu.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-white hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gold Divider Line */}
      <div className="gold-line" />

      {/* Bottom Copyright Bar */}
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 py-5 text-xs text-white/60">
        <p>© 1976 – 2026 Vardayini Sweet Mart. All rights reserved.</p>
        <p className="text-center sm:text-right">
          Handcrafted with pure devotion in Vadodara, Gujarat.
        </p>
      </div>
    </footer>
  );
}

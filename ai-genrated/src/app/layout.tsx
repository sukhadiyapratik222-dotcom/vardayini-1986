import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ensureSeeded } from "@/db/seed";
import { getUiConfigSafe } from "@/lib/ui-config";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vardayini Sweet Mart | Fresh handmade mithai",
  description:
    "Order kaju katli, motichoor ladoo, rasmalai and festive hampers from Vardayini Sweet Mart in Vadodara and Ahmedabad.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/images/brand-logo.png",
    apple: "/images/brand-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b2f8a",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  try {
    await ensureSeeded();
  } catch (err) {
    // Never let a seeding problem replace the whole site with Next's global
    // error page; log it so Vercel runtime logs still show the cause.
    console.error("[layout] ensureSeeded failed:", err);
  }
  const uiConfig = getUiConfigSafe();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-[family-name:var(--font-sans)] antialiased">
        <div className="site-shell">
          <SiteHeader initialConfig={uiConfig} />
          {children}
          <SiteFooter initialConfig={uiConfig} />
        </div>
      </body>
    </html>
  );
}


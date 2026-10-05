import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Vardayini Sweet Mart | Karigar UI Admin Desk",
  description:
    "Dedicated management dashboard for Vardayini Sweet Mart user interface, scrolling hero photos, banners, and catalog.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${sans.variable} font-[family-name:var(--font-sans)] min-h-screen bg-[var(--canvas)] text-[var(--text-main)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vardayini Sweet Mart | Karigar UI Admin Desk",
  description:
    "Dedicated management dashboard for Vardayini Sweet Mart user interface, scrolling hero photos, banners, and catalog.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0b2f8a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      <body
        className="font-[family-name:var(--font-sans)] min-h-screen bg-[var(--canvas)] text-[var(--text-main)] antialiased"
      >
        {children}
      </body>
    </html>
  );
}

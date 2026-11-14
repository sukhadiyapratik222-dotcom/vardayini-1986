import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vardayini Sweet Mart",
    short_name: "Vardayini",
    description:
      "Order kaju katli, motichoor ladoo, rasmalai and festive hampers from Vardayini Sweet Mart in Kalol, Gujarat.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf6ee",
    theme_color: "#0b2f8a",
    lang: "en-IN",
    categories: ["food", "shopping"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/images/brand-logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
    // Keep the manifest usable even if the site URL env var is absent.
    id: getSiteUrl(),
  };
}

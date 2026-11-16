import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { OurStoryClientPage } from "./our-story-client";

export const metadata: Metadata = {
  title: "Our Story · A Journey Of 75 Years | Vardayini Sweet Mart",
  description:
    "Discover the 75-year sweet tradition of Vardayini Sweet Mart, Kalol. Handcrafted in 100% Shuddh Desi Ghee since 1976.",
};

export default function OurStoryPage() {
  return <OurStoryClientPage />;
}

import { Metadata } from "next";
import { TasteQuizClient } from "@/components/taste-quiz-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find Your Mithai | Taste Quiz & Personalized Sweets Selection",
  description:
    "Take our 30-second taste quiz to discover your Indian mithai personality and receive personalized sweet recommendations handcrafted with 100% pure cow desi ghee.",
  openGraph: {
    title: "Find Your Mithai | Vardayini Sweet Mart Taste Quiz",
    description: "Discover your mithai personality in 30 seconds! Are you a Royal Kesar Connoisseur or a Classic Kaju Katli Lover?",
    images: ["/images/kaju-katli.jpg"],
  },
};

export default function FindYourMithaiPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#faf8f5] via-[#f7f2ea] to-[#fffdf7] relative overflow-hidden">
      {/* Decorative Warm Festive Backdrops */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-amber-300/15 via-orange-300/10 to-rose-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <TasteQuizClient />
      </div>
    </main>
  );
}


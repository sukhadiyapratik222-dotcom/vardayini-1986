import { KitchenStaffView } from "@/components/kitchen-staff-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vardayini Kitchen & Counter Pickup Staff Portal",
  description: "Live order preparation, photo uploads, and OTP handover verification.",
};

export default function KitchenPage() {
  return <KitchenStaffView />;
}


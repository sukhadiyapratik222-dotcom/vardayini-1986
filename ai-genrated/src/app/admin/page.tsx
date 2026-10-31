import { redirect } from "next/navigation";
import { getAuthUser, clearAuthCookie } from "@/lib/auth";
import { AdminBoard } from "@/components/admin-board";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (user.status === "inactive" || user.status === "deactivated") {
    await clearAuthCookie();
    redirect("/login?error=deactivated");
  }
  if (user.role !== "admin" && user.role !== "super_admin") redirect("/account");
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs uppercase tracking-[0.28em] text-[#c45c26]">Admin desk</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl text-[#6b1d1d]">Admin</h1>
      <AdminBoard />
    </main>
  );
}

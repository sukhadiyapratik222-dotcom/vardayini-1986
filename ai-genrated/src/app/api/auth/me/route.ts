import { getAuthUser, requireAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  let user = await getAuthUser(request);
  if (!user) {
    const adminCheck = await requireAdmin(request);
    if ("user" in adminCheck && adminCheck.user) {
      user = adminCheck.user;
    }
  }
  return Response.json({ user });
}

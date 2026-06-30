import { clearSessionCookie } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return jsonOk({ ok: true });
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(1, "Informe sua senha.")
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message || "Dados invalidos.");
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() }
  });

  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return jsonError("E-mail ou senha incorretos.", 401);
  }

  await setSessionCookie(user.id);

  return jsonOk({
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
}

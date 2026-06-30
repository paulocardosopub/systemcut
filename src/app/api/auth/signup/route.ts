import { NextRequest } from "next/server";
import { z } from "zod";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um e-mail valido."),
  password: z.string().min(6, "Use pelo menos 6 caracteres.")
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return jsonError(parsed.error.errors[0]?.message || "Dados invalidos.");
  }

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.user.findUnique({ where: { email } });

  if (exists) {
    return jsonError("Este e-mail ja esta cadastrado.", 409);
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name.trim(),
      email,
      passwordHash: await hashPassword(parsed.data.password)
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  await setSessionCookie(user.id);
  return jsonOk({ user }, 201);
}

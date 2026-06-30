import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  startTime: z.number().min(0).optional(),
  endTime: z.number().positive().optional(),
  title: z.string().min(1).optional(),
  isSelected: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional()
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; cutId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id, cutId } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Dados invalidos.");

  const cut = await prisma.smartCut.findFirst({
    where: {
      id: cutId,
      project: {
        id,
        userId: user.id
      }
    }
  });

  if (!cut) return jsonError("Corte nao encontrado.", 404);

  const nextStart = parsed.data.startTime ?? cut.startTime;
  const nextEnd = parsed.data.endTime ?? cut.endTime;

  if (nextEnd <= nextStart) {
    return jsonError("O fim precisa ser maior que o inicio.");
  }

  const updated = await prisma.smartCut.update({
    where: { id: cut.id },
    data: parsed.data
  });

  return jsonOk({ cut: updated });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; cutId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id, cutId } = await context.params;
  const cut = await prisma.smartCut.findFirst({
    where: {
      id: cutId,
      project: {
        id,
        userId: user.id
      }
    }
  });

  if (!cut) return jsonError("Corte nao encontrado.", 404);

  await prisma.smartCut.delete({ where: { id: cut.id } });
  return jsonOk({ ok: true });
}

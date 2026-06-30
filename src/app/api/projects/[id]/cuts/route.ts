import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().positive(),
  title: z.string().min(1).default("Corte manual")
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await prisma.videoProject.findFirst({
    where: { id, userId: user.id },
    include: { cuts: true }
  });

  if (!project) return jsonError("Projeto nao encontrado.", 404);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Dados invalidos.");
  if (parsed.data.endTime <= parsed.data.startTime) return jsonError("O fim precisa ser maior que o inicio.");

  const cut = await prisma.smartCut.create({
    data: {
      projectId: project.id,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      title: parsed.data.title,
      description: "Corte criado manualmente no editor.",
      reason: "Criado pelo usuario.",
      score: 80,
      tags: JSON.stringify(["manual"]),
      transcriptExcerpt: "",
      createdBy: "user",
      orderIndex: project.cuts.length
    }
  });

  return jsonOk({ cut }, 201);
}

import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { aspectForFormat, resolutionForFormat, runExportJob } from "@/lib/exporter";
import { jsonError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  format: z.enum(["YouTube horizontal", "Shorts/Reels/TikTok", "Quadrado", "Original"]).default("Original"),
  quality: z.enum(["Rascunho rapido", "Alta qualidade", "Qualidade maxima"]).default("Alta qualidade")
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await prisma.videoProject.findFirst({
    where: { id, userId: user.id },
    include: { cuts: { where: { isSelected: true } } }
  });

  if (!project) return jsonError("Projeto nao encontrado.", 404);
  if (project.cuts.length === 0) return jsonError("Selecione pelo menos um corte para exportar.");

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Opcoes de exportacao invalidas.");

  const job = await prisma.exportJob.create({
    data: {
      projectId: project.id,
      status: "Criado",
      progress: 0,
      format: parsed.data.format,
      aspectRatio: aspectForFormat(parsed.data.format),
      resolution: resolutionForFormat(parsed.data.format),
      quality: parsed.data.quality
    }
  });

  void runExportJob(job.id);

  return jsonOk({ job }, 201);
}

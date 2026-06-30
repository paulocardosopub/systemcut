import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { processVideoProject } from "@/worker/video-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await prisma.videoProject.findFirst({ where: { id, userId: user.id } });
  if (!project) return jsonError("Projeto nao encontrado.", 404);

  void processVideoProject(project.id);

  return jsonOk({ ok: true });
}

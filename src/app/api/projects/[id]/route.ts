import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/http";
import { storageUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).optional(),
  contentType: z.string().optional(),
  objective: z.string().optional(),
  desiredDuration: z.string().optional()
});

async function findOwnedProject(id: string, userId: string) {
  return prisma.videoProject.findFirst({
    where: { id, userId },
    include: {
      transcript: { orderBy: { startTime: "asc" } },
      cuts: { orderBy: { orderIndex: "asc" } },
      captions: { orderBy: { startTime: "asc" } },
      exportJobs: { orderBy: { createdAt: "desc" } }
    }
  });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await findOwnedProject(id, user.id);

  if (!project) return jsonError("Projeto nao encontrado.", 404);

  return jsonOk({
    project: {
      ...project,
      thumbnailUrl: storageUrl(project.thumbnailPath),
      videoUrl: storageUrl(project.originalFilePath),
      exportUrl: storageUrl(project.exportPath)
    }
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) return jsonError("Dados invalidos.");

  const exists = await prisma.videoProject.findFirst({ where: { id, userId: user.id } });
  if (!exists) return jsonError("Projeto nao encontrado.", 404);

  const project = await prisma.videoProject.update({
    where: { id },
    data: parsed.data
  });

  return jsonOk({ project });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Nao autenticado.", 401);

  const { id } = await context.params;
  const project = await prisma.videoProject.findFirst({ where: { id, userId: user.id } });
  if (!project) return jsonError("Projeto nao encontrado.", 404);

  const files = [
    project.originalFilePath,
    project.thumbnailPath,
    project.audioPath,
    project.exportPath
  ].filter(Boolean) as string[];

  const jobs = await prisma.exportJob.findMany({ where: { projectId: id } });
  files.push(...jobs.map((job) => job.outputPath).filter(Boolean) as string[]);

  await prisma.videoProject.delete({ where: { id } });
  await Promise.all(files.map((file) => fs.rm(file, { force: true }).catch(() => undefined)));

  return jsonOk({ ok: true });
}

import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { ensureStorageDirs } from "@/lib/storage";
import { importSocialVideo } from "@/lib/social-video-importer";
import { processVideoProject } from "@/worker/video-worker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) return jsonError("Nao autenticado.", 401);

  await ensureStorageDirs();

  try {
    const body = await request.json();
    const url = String(body.url || "").trim();

    if (!url) {
      return jsonError("Cole um link do YouTube, TikTok ou Instagram.", 400);
    }

    const imported = await importSocialVideo(url);

    const project = await prisma.videoProject.create({
      data: {
        userId: user.id,
        title: String(body.title || "").trim() || imported.title,
        originalFileName: imported.originalFileName,
        originalFilePath: imported.originalFilePath,
        contentType: String(body.contentType || "Outro"),
        objective: String(body.objective || "Melhores momentos"),
        desiredDuration: String(body.desiredDuration || "1 minuto"),
        status: "Enviado"
      }
    });

    void processVideoProject(project.id);

    return Response.json({
      project,
      sourceUrl: imported.sourceUrl
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Falha ao importar link.", 400);
  }
}

import path from "node:path";
import { prisma } from "@/lib/db";
import { analyzeVideoWithAi } from "@/lib/ai/videoAnalyzer";
import { extractAudio, generateThumbnail, probeVideo } from "@/lib/ffmpeg";
import { ensureStorageDirs, storagePath } from "@/lib/storage";
import { SmartCutEngine } from "@/lib/smart-cut-engine";

export async function processVideoProject(projectId: string) {
  await ensureStorageDirs();

  const project = await prisma.videoProject.findUnique({
    where: { id: projectId }
  });

  if (!project) return;

  try {
    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Processando",
        errorMessage: null
      }
    });

    const metadata = await probeVideo(project.originalFilePath);
    const thumbnailPath = storagePath("thumbnails", `${project.id}.jpg`);
    const audioPath = storagePath("audio", `${project.id}.m4a`);

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Gerando thumbnail",
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height
      }
    });

    await generateThumbnail(project.originalFilePath, thumbnailPath, metadata.duration);

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Extraindo audio",
        thumbnailPath
      }
    });

    await extractAudio(project.originalFilePath, audioPath);

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Analisando com IA",
        audioPath
      }
    });

    const analysis = await analyzeVideoWithAi({
      duration: metadata.duration,
      contentType: project.contentType,
      objective: project.objective,
      desiredDuration: project.desiredDuration
    });

    const engine = new SmartCutEngine();
    const rankedCuts = engine.rank(analysis.cuts);

    const transaction = [
      prisma.caption.deleteMany({ where: { projectId } }),
      prisma.transcriptSegment.deleteMany({ where: { projectId } }),
      prisma.smartCut.deleteMany({ where: { projectId } })
    ];

    if (analysis.transcript.length > 0) {
      transaction.push(
        prisma.transcriptSegment.createMany({
          data: analysis.transcript.map((segment) => ({
            projectId,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            confidence: segment.confidence
          }))
        }),
        prisma.caption.createMany({
          data: analysis.transcript.map((segment) => ({
            projectId,
            startTime: segment.startTime,
            endTime: segment.endTime,
            text: segment.text,
            style: "Clean",
            position: "Inferior"
          }))
        })
      );
    }

    if (rankedCuts.length > 0) {
      transaction.push(
        prisma.smartCut.createMany({
          data: rankedCuts.map((cut) => ({
            projectId,
            startTime: cut.startTime,
            endTime: cut.endTime,
            title: cut.title,
            description: cut.description,
            reason: cut.reason,
            score: cut.score,
            tags: JSON.stringify(cut.tags),
            transcriptExcerpt: cut.transcriptExcerpt,
            orderIndex: cut.orderIndex,
            createdBy: "ai"
          }))
        })
      );
    }

    await prisma.$transaction(transaction);

    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Pronto para edicao",
        errorMessage: null
      }
    });
  } catch (error) {
    await prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: "Erro",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido no processamento."
      }
    });
  }
}

export async function processPendingProjects() {
  const projects = await prisma.videoProject.findMany({
    where: {
      status: {
        in: ["Enviado", "Erro"]
      }
    },
    orderBy: { createdAt: "asc" }
  });

  for (const project of projects) {
    const exists = await import("node:fs/promises")
      .then((fs) => fs.access(project.originalFilePath).then(() => true).catch(() => false));

    if (exists && path.isAbsolute(project.originalFilePath)) {
      await processVideoProject(project.id);
    }
  }
}

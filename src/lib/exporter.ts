import path from "node:path";
import { prisma } from "@/lib/db";
import { exportSelectedCuts } from "@/lib/ffmpeg";
import { ensureStorageDirs, storagePath } from "@/lib/storage";

export async function runExportJob(jobId: string) {
  await ensureStorageDirs();

  const job = await prisma.exportJob.findUnique({
    where: { id: jobId },
    include: {
      project: {
        include: {
          cuts: {
            where: { isSelected: true },
            orderBy: { orderIndex: "asc" }
          }
        }
      }
    }
  });

  if (!job) return;

  try {
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: "Exportando",
        progress: 10,
        errorMessage: null
      }
    });

    await prisma.videoProject.update({
      where: { id: job.projectId },
      data: { status: "Exportando" }
    });

    const outputPath = storagePath(
      "exports",
      `${job.project.id}-${job.id}-${job.format.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mp4`
    );

    await exportSelectedCuts(
      job.project.originalFilePath,
      job.project.cuts.map((cut) => ({
        startTime: cut.startTime,
        endTime: cut.endTime
      })),
      outputPath,
      {
        format: job.format,
        quality: job.quality
      }
    );

    await prisma.$transaction([
      prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: "Exportado",
          progress: 100,
          outputPath,
          completedAt: new Date()
        }
      }),
      prisma.videoProject.update({
        where: { id: job.projectId },
        data: {
          status: "Exportado",
          exportPath: outputPath
        }
      })
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido ao exportar.";
    await prisma.$transaction([
      prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: "Erro",
          progress: 0,
          errorMessage: message
        }
      }),
      prisma.videoProject.update({
        where: { id: job.projectId },
        data: {
          status: "Erro",
          errorMessage: message
        }
      })
    ]);
  }
}

export function exportFileName(title: string, jobId: string) {
  const safe = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return `${safe || "system-smart-cut"}-${jobId.slice(0, 8)}.mp4`;
}

export function aspectForFormat(format: string) {
  if (format === "Shorts/Reels/TikTok") return "9:16";
  if (format === "Quadrado") return "1:1";
  if (format === "YouTube horizontal") return "16:9";
  return "Original";
}

export function resolutionForFormat(format: string) {
  if (format === "Shorts/Reels/TikTok") return "1080x1920";
  if (format === "Quadrado") return "1080x1080";
  if (format === "YouTube horizontal") return "1920x1080";
  return "Original";
}

export function extensionFromPath(filePath?: string | null) {
  return path.extname(filePath || "").toLowerCase();
}

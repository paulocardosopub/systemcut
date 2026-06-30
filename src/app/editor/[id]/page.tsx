import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EditorClient, EditorProject } from "@/components/editor-client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { storageUrl } from "@/lib/storage";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const project = await prisma.videoProject.findFirst({
    where: { id, userId: user.id },
    include: {
      transcript: { orderBy: { startTime: "asc" } },
      cuts: { orderBy: { orderIndex: "asc" } },
      exportJobs: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!project) notFound();

  const editorProject: EditorProject = {
    id: project.id,
    title: project.title,
    originalFileName: project.originalFileName,
    videoUrl: storageUrl(project.originalFilePath),
    thumbnailUrl: storageUrl(project.thumbnailPath),
    exportUrl: storageUrl(project.exportPath),
    duration: project.duration,
    width: project.width,
    height: project.height,
    status: project.status,
    errorMessage: project.errorMessage,
    contentType: project.contentType,
    objective: project.objective,
    desiredDuration: project.desiredDuration,
    updatedAt: project.updatedAt.toISOString(),
    transcript: project.transcript.map((segment) => ({
      id: segment.id,
      startTime: segment.startTime,
      endTime: segment.endTime,
      text: segment.text,
      confidence: segment.confidence
    })),
    cuts: project.cuts.map((cut) => ({
      id: cut.id,
      startTime: cut.startTime,
      endTime: cut.endTime,
      title: cut.title,
      description: cut.description,
      reason: cut.reason,
      score: cut.score,
      tags: cut.tags,
      transcriptExcerpt: cut.transcriptExcerpt,
      isSelected: cut.isSelected,
      orderIndex: cut.orderIndex,
      createdBy: cut.createdBy
    })),
    exportJobs: project.exportJobs.map((job) => ({
      id: job.id,
      status: job.status,
      format: job.format,
      quality: job.quality,
      progress: job.progress,
      outputPath: job.outputPath,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() || null,
      downloadUrl: storageUrl(job.outputPath)
    }))
  };

  return (
    <AppShell user={user}>
      <EditorClient project={editorProject} />
    </AppShell>
  );
}

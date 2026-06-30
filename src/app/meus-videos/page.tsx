import Link from "next/link";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ProjectsList } from "@/components/projects-list";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/require-user";
import { storageUrl } from "@/lib/storage";

export default async function MyVideosPage() {
  const user = await requireUser();
  const projects = await prisma.videoProject.findMany({
    where: { userId: user.id },
    include: {
      cuts: true,
      exportJobs: true
    },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Historico"
        title="Meus videos"
        description="Busque, filtre, reabra editores antigos e baixe exportacoes ja concluidas."
        action={
          <Link
            href="/upload"
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-signal-teal px-5 font-semibold text-graphite-950 transition hover:brightness-110"
          >
            <Upload size={18} />
            Enviar video
          </Link>
        }
      />
      <ProjectsList
        initialProjects={projects.map((project) => ({
          id: project.id,
          title: project.title,
          originalFileName: project.originalFileName,
          thumbnailUrl: storageUrl(project.thumbnailPath),
          exportUrl: storageUrl(project.exportPath),
          duration: project.duration,
          status: project.status,
          contentType: project.contentType,
          objective: project.objective,
          createdAt: project.createdAt.toISOString(),
          updatedAt: project.updatedAt.toISOString(),
          cutsCount: project.cuts.length,
          exportsCount: project.exportJobs.length
        }))}
      />
    </AppShell>
  );
}

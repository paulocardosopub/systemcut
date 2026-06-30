import Link from "next/link";
import { ArrowRight, Clock, Upload, Video } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";
import { formatSeconds, toInputDate } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { storageUrl } from "@/lib/storage";

export default async function DashboardPage() {
  const user = await requireUser();
  const projects = await prisma.videoProject.findMany({
    where: { userId: user.id },
    include: {
      cuts: true,
      exportJobs: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" },
    take: 6
  });

  const totalCuts = projects.reduce((sum, project) => sum + project.cuts.length, 0);
  const exported = projects.filter((project) => project.status === "Exportado").length;

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Visao geral"
        title="Dashboard"
        description="Envie videos, acompanhe o processamento e reabra projetos recentes."
        action={
          <Link
            href="/upload"
            className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-signal-teal px-5 font-semibold text-graphite-950 transition hover:brightness-110"
          >
            <Upload size={18} />
            Enviar novo video
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <Video className="text-signal-teal" size={22} />
          <p className="mt-4 text-3xl font-semibold text-white">{projects.length}</p>
          <p className="text-sm text-white/50">Projetos recentes</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <Clock className="text-signal-amber" size={22} />
          <p className="mt-4 text-3xl font-semibold text-white">{totalCuts}</p>
          <p className="text-sm text-white/50">Cortes gerados</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
          <ArrowRight className="text-signal-coral" size={22} />
          <p className="mt-4 text-3xl font-semibold text-white">{exported}</p>
          <p className="text-sm text-white/50">Videos exportados</p>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-white/10 bg-graphite-900/70">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-white">Ultimos videos</h2>
          <Link href="/meus-videos" className="text-sm font-medium text-signal-teal hover:underline">
            Ver historico
          </Link>
        </div>
        <div className="divide-y divide-white/10">
          {projects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-white">Nenhum video enviado ainda.</p>
              <p className="mt-2 text-sm text-white/50">Envie seu primeiro video para gerar cortes inteligentes.</p>
            </div>
          ) : (
            projects.map((project) => (
              <article key={project.id} className="grid gap-4 p-4 md:grid-cols-[11rem_1fr_auto] md:items-center">
                <div className="aspect-video overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                  {project.thumbnailPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={storageUrl(project.thumbnailPath) || ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/30">
                      <Video size={28} />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{project.title}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {project.originalFileName} · {formatSeconds(project.duration)} · {toInputDate(project.createdAt)}
                  </p>
                  <p className="mt-1 text-sm text-white/[0.45]">{project.cuts.length} cortes gerados</p>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link
                    href={`/editor/${project.id}`}
                    className="focus-ring rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/[0.08]0 transition hover:border-signal-teal/40 hover:text-white"
                  >
                    Abrir editor
                  </Link>
                  {project.exportPath && (
                    <a
                      href={storageUrl(project.exportPath) || "#"}
                      className="focus-ring rounded-md bg-white px-4 py-2 text-sm font-semibold text-graphite-950 transition hover:bg-signal-amber"
                    >
                      Baixar
                    </a>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}

import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/db";
import { toInputDate } from "@/lib/format";
import { requireUser } from "@/lib/require-user";
import { storageUrl } from "@/lib/storage";

export default async function ExportsPage() {
  const user = await requireUser();
  const jobs = await prisma.exportJob.findMany({
    where: {
      project: {
        userId: user.id
      }
    },
    include: {
      project: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Arquivos finais"
        title="Exportacoes"
        description="Acompanhe os jobs de exportacao e baixe os videos finalizados."
      />

      <section className="rounded-lg border border-white/10 bg-graphite-900/70">
        <div className="divide-y divide-white/10">
          {jobs.length === 0 ? (
            <p className="p-8 text-center text-white/[0.55]">Nenhuma exportacao criada ainda.</p>
          ) : (
            jobs.map((job) => (
              <article key={job.id} className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-white">{job.project.title}</h2>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-2 text-sm text-white/50">
                    {job.format} · {job.resolution} · {job.quality} · criado em {toInputDate(job.createdAt)}
                  </p>
                  <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-signal-teal" style={{ width: `${job.progress}%` }} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link
                    href={`/editor/${job.project.id}`}
                    className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-4 text-sm font-medium text-white/75 hover:border-signal-teal/40 hover:text-white"
                  >
                    <ExternalLink size={16} />
                    Abrir editor
                  </Link>
                  {job.outputPath && (
                    <a
                      href={storageUrl(job.outputPath) || "#"}
                      className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-graphite-950 hover:bg-signal-amber"
                    >
                      <Download size={16} />
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

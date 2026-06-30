"use client";

import Link from "next/link";
import { Search, Trash2, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { formatSeconds, toInputDate } from "@/lib/format";

export type ProjectListItem = {
  id: string;
  title: string;
  originalFileName: string;
  thumbnailUrl: string | null;
  exportUrl: string | null;
  duration: number | null;
  status: string;
  contentType: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
  cutsCount: number;
  exportsCount: number;
};

const statuses = [
  "Todos",
  "Enviado",
  "Processando",
  "Analisando com IA",
  "Pronto para edicao",
  "Exportando",
  "Exportado",
  "Erro"
];

export function ProjectsList({ initialProjects }: { initialProjects: ProjectListItem[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");

  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim();
    return projects.filter((project) => {
      const matchesQuery =
        !lower ||
        project.title.toLowerCase().includes(lower) ||
        project.originalFileName.toLowerCase().includes(lower) ||
        project.contentType.toLowerCase().includes(lower);
      const matchesStatus = status === "Todos" || project.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, status]);

  async function removeProject(id: string) {
    const ok = window.confirm("Excluir este projeto e seus arquivos?");
    if (!ok) return;

    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((current) => current.filter((project) => project.id !== id));
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-graphite-900/70">
      <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[1fr_14rem]">
        <label className="flex h-11 items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3">
          <Search size={18} className="text-white/40" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            placeholder="Buscar por nome, arquivo ou tipo"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="focus-ring h-11 rounded-md border border-white/10 bg-graphite-850 px-3 text-sm text-white"
        >
          {statuses.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="divide-y divide-white/10">
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-white/[0.55]">Nenhum projeto encontrado.</p>
        ) : (
          filtered.map((project) => (
            <article key={project.id} className="grid gap-4 p-4 lg:grid-cols-[12rem_1fr_auto] lg:items-center">
              <div className="aspect-video overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
                {project.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-white/30">
                    <Video size={28} />
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{project.title}</h2>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-2 text-sm text-white/50">
                  {project.originalFileName} · {formatSeconds(project.duration)} · {toInputDate(project.updatedAt)}
                </p>
                <p className="mt-1 text-sm text-white/[0.45]">
                  {project.contentType} · {project.objective} · {project.cutsCount} cortes · {project.exportsCount} exportacoes
                </p>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Link
                  href={`/editor/${project.id}`}
                  className="focus-ring rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/[0.08]0 transition hover:border-signal-teal/40 hover:text-white"
                >
                  Abrir editor
                </Link>
                {project.exportUrl && (
                  <a
                    href={project.exportUrl}
                    className="focus-ring rounded-md bg-white px-4 py-2 text-sm font-semibold text-graphite-950 transition hover:bg-signal-amber"
                  >
                    Baixar
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeProject(project.id)}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white/60 transition hover:border-red-400/40 hover:text-red-100"
                  title="Excluir projeto"
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

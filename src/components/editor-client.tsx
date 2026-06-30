"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Captions,
  Download,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scissors,
  Trash2,
  WandSparkles
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatSeconds, toInputDate } from "@/lib/format";

type Cut = {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  description: string;
  reason: string;
  score: number;
  tags: string;
  transcriptExcerpt: string;
  isSelected: boolean;
  orderIndex: number;
  createdBy: string;
};

type TranscriptSegment = {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  confidence: number;
};

type ExportJob = {
  id: string;
  status: string;
  format: string;
  quality: string;
  progress: number;
  outputPath: string | null;
  createdAt: string;
  completedAt: string | null;
  downloadUrl?: string | null;
};

export type EditorProject = {
  id: string;
  title: string;
  originalFileName: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  exportUrl: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: string;
  errorMessage: string | null;
  contentType: string;
  objective: string;
  desiredDuration: string;
  updatedAt: string;
  transcript: TranscriptSegment[];
  cuts: Cut[];
  exportJobs: ExportJob[];
};

const formats = ["Original", "YouTube horizontal", "Shorts/Reels/TikTok", "Quadrado"];
const qualities = ["Rascunho rapido", "Alta qualidade", "Qualidade maxima"];

export function EditorClient({ project }: { project: EditorProject }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cuts, setCuts] = useState(project.cuts);
  const [selectedId, setSelectedId] = useState(project.cuts[0]?.id || "");
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [format, setFormat] = useState("Original");
  const [quality, setQuality] = useState("Alta qualidade");
  const [exportJob, setExportJob] = useState<ExportJob | null>(project.exportJobs[0] || null);
  const [exporting, setExporting] = useState(false);

  const selectedCut = useMemo(
    () => cuts.find((cut) => cut.id === selectedId) || cuts[0],
    [cuts, selectedId]
  );

  const duration = project.duration || selectedCut?.endTime || 1;
  const selectedCuts = cuts.filter((cut) => cut.isSelected).length;

  useEffect(() => {
    if (!exportJob || !["Criado", "Exportando"].includes(exportJob.status)) return;

    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/export-jobs/${exportJob.id}`);
      if (!response.ok) return;
      const data = await response.json();
      setExportJob(data.job);

      if (!["Criado", "Exportando"].includes(data.job.status)) {
        setExporting(false);
        window.clearInterval(timer);
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [exportJob]);

  function updateLocalCut(id: string, data: Partial<Cut>) {
    setCuts((current) => current.map((cut) => (cut.id === id ? { ...cut, ...data } : cut)));
  }

  async function saveCut(cut: Cut) {
    setSavingId(cut.id);
    setMessage("");

    const response = await fetch(`/api/projects/${project.id}/cuts/${cut.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startTime: Number(cut.startTime),
        endTime: Number(cut.endTime),
        title: cut.title,
        isSelected: cut.isSelected
      })
    });

    const data = await response.json().catch(() => ({}));
    setSavingId("");

    if (!response.ok) {
      setMessage(data.error || "Nao foi possivel salvar o corte.");
      return;
    }

    updateLocalCut(cut.id, data.cut);
    setMessage("Corte salvo.");
  }

  async function toggleCut(cut: Cut) {
    updateLocalCut(cut.id, { isSelected: !cut.isSelected });
    await fetch(`/api/projects/${project.id}/cuts/${cut.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isSelected: !cut.isSelected })
    });
  }

  async function createManualCut() {
    const current = videoRef.current?.currentTime || 0;
    const end = Math.min(duration, current + 60);
    const response = await fetch(`/api/projects/${project.id}/cuts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        startTime: Number(current.toFixed(2)),
        endTime: Number(Math.max(current + 4, end).toFixed(2)),
        title: "Corte manual"
      })
    });

    const data = await response.json();
    if (response.ok) {
      setCuts((currentCuts) => [...currentCuts, data.cut]);
      setSelectedId(data.cut.id);
    } else {
      setMessage(data.error || "Nao foi possivel criar o corte.");
    }
  }

  function playCut(cut: Cut) {
    setSelectedId(cut.id);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = cut.startTime;
    void video.play().catch(() => undefined);
  }

  async function startExport() {
    setExporting(true);
    setMessage("");
    const response = await fetch(`/api/projects/${project.id}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format, quality })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setExporting(false);
      setMessage(data.error || "Nao foi possivel iniciar a exportacao.");
      return;
    }

    setExportJob(data.job);
  }

  async function retryProcessing() {
    await fetch(`/api/projects/${project.id}/retry`, { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_24rem]">
      <section className="space-y-5">
        <div className="rounded-lg border border-white/10 bg-graphite-900/75">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-white">{project.title}</h1>
                <StatusBadge status={project.status} />
              </div>
              <p className="mt-1 text-sm text-white/[0.45]">
                {project.originalFileName} · {formatSeconds(project.duration)} · {project.width || 0}x{project.height || 0}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/projects/${project.id}/captions.srt`}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-white/75 hover:border-signal-teal/40 hover:text-white"
              >
                <Captions size={16} />
                SRT
              </a>
              <a
                href={`/api/projects/${project.id}/captions.vtt`}
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md border border-white/10 px-3 text-sm font-medium text-white/75 hover:border-signal-teal/40 hover:text-white"
              >
                <Captions size={16} />
                VTT
              </a>
            </div>
          </div>

          <div className="p-4">
            {project.errorMessage && (
              <div className="mb-4 rounded-md border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-100">
                <p>{project.errorMessage}</p>
                <button
                  type="button"
                  onClick={retryProcessing}
                  className="focus-ring mt-3 inline-flex items-center gap-2 rounded-md border border-red-300/30 px-3 py-2 font-medium"
                >
                  <RotateCcw size={16} />
                  Tentar novamente
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              src={project.videoUrl || undefined}
              poster={project.thumbnailUrl || undefined}
              controls
              className="aspect-video w-full rounded-md bg-black object-contain"
              onTimeUpdate={(event) => {
                if (selectedCut && event.currentTarget.currentTime > selectedCut.endTime) {
                  event.currentTarget.pause();
                }
              }}
            />

            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white/75">Timeline</p>
                <p className="text-xs text-white/[0.45]">{selectedCuts} cortes selecionados</p>
              </div>
              <div className="relative h-14 overflow-hidden rounded-md bg-graphite-950">
                {cuts.map((cut) => {
                  const left = Math.max(0, (cut.startTime / duration) * 100);
                  const width = Math.max(1, ((cut.endTime - cut.startTime) / duration) * 100);
                  return (
                    <button
                      key={cut.id}
                      type="button"
                      onClick={() => playCut(cut)}
                      className={`absolute top-2 h-10 rounded-sm border transition ${
                        cut.id === selectedCut?.id
                          ? "border-signal-teal bg-signal-teal/70"
                          : cut.isSelected
                            ? "border-signal-amber/40 bg-signal-amber/50"
                            : "border-white/10 bg-white/10 opacity-50"
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={cut.title}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <div className="rounded-lg border border-white/10 bg-graphite-900/75">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h2 className="font-semibold text-white">Transcricao</h2>
              <span className="text-xs text-white/[0.45]">{project.transcript.length} segmentos</span>
            </div>
            <div className="max-h-[28rem] space-y-2 overflow-auto p-4">
              {project.transcript.length === 0 ? (
                <p className="text-sm text-white/50">A transcricao aparece aqui depois do processamento.</p>
              ) : (
                project.transcript.map((segment) => (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = segment.startTime;
                    }}
                    className="focus-ring block w-full rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-signal-teal/40"
                  >
                    <span className="text-xs font-medium text-signal-teal">
                      {formatSeconds(segment.startTime)} - {formatSeconds(segment.endTime)}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-white/70">{segment.text}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-graphite-900/75 p-4">
            <h2 className="font-semibold text-white">Exportar video</h2>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-white/[0.65]">Formato final</span>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value)}
                  className="focus-ring h-11 w-full rounded-md border border-white/10 bg-graphite-850 px-3 text-sm text-white"
                >
                  {formats.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-white/[0.65]">Qualidade</span>
                <select
                  value={quality}
                  onChange={(event) => setQuality(event.target.value)}
                  className="focus-ring h-11 w-full rounded-md border border-white/10 bg-graphite-850 px-3 text-sm text-white"
                >
                  {qualities.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={startExport}
                disabled={exporting || selectedCuts === 0}
                className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-signal-teal font-semibold text-graphite-950 transition hover:brightness-110 disabled:opacity-60"
              >
                {exporting ? <Loader2 size={18} className="animate-spin" /> : <Scissors size={18} />}
                Exportar selecionados
              </button>
            </div>

            {exportJob && (
              <div className="mt-5 rounded-md border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge status={exportJob.status} />
                  <span className="text-xs text-white/[0.45]">{exportJob.progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-signal-teal transition-all" style={{ width: `${exportJob.progress}%` }} />
                </div>
                <p className="mt-3 text-xs text-white/[0.45]">{exportJob.format} · {exportJob.quality}</p>
                {exportJob.downloadUrl && (
                  <a
                    href={exportJob.downloadUrl}
                    className="focus-ring mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-white text-sm font-semibold text-graphite-950 transition hover:bg-signal-amber"
                  >
                    <Download size={16} />
                    Baixar video final
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      </section>

      <aside className="rounded-lg border border-white/10 bg-graphite-900/75">
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div>
            <h2 className="font-semibold text-white">Cortes sugeridos</h2>
            <p className="text-xs text-white/[0.45]">Atualizado em {toInputDate(project.updatedAt)}</p>
          </div>
          <button
            type="button"
            onClick={createManualCut}
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-white/75 hover:border-signal-teal/40 hover:text-white"
            title="Criar corte manual"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-13rem)] space-y-3 overflow-auto p-4">
          {cuts.length === 0 ? (
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-sm text-white/[0.55]">
              <WandSparkles className="mb-3 text-signal-teal" size={22} />
              A lista de cortes aparece quando a analise terminar. Atualize a pagina em alguns segundos se o video ainda
              estiver processando.
            </div>
          ) : (
            cuts.map((cut) => (
              <article
                key={cut.id}
                className={`rounded-md border p-3 transition ${
                  selectedCut?.id === cut.id ? "border-signal-teal/60 bg-signal-teal/10" : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => playCut(cut)} className="min-w-0 text-left">
                    <h3 className="truncate text-sm font-semibold text-white">{cut.title}</h3>
                    <p className="mt-1 text-xs text-white/[0.45]">
                      {formatSeconds(cut.startTime)} - {formatSeconds(cut.endTime)} · score {cut.score}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCut(cut)}
                    className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/60 hover:border-signal-amber/40 hover:text-white"
                    title={cut.isSelected ? "Remover da exportacao" : "Restaurar na exportacao"}
                  >
                    {cut.isSelected ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                  </button>
                </div>

                <p className="mt-2 line-clamp-2 text-xs leading-5 text-white/50">{cut.reason}</p>

                {selectedCut?.id === cut.id && (
                  <div className="mt-3 space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-white/50">Titulo</span>
                      <input
                        value={cut.title}
                        onChange={(event) => updateLocalCut(cut.id, { title: event.target.value })}
                        className="focus-ring h-10 w-full rounded-md border border-white/10 bg-graphite-950 px-3 text-sm text-white"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="mb-1 block text-xs text-white/50">Inicio</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={cut.startTime}
                          onChange={(event) => updateLocalCut(cut.id, { startTime: Number(event.target.value) })}
                          className="focus-ring h-10 w-full rounded-md border border-white/10 bg-graphite-950 px-3 text-sm text-white"
                        />
                      </label>
                      <label>
                        <span className="mb-1 block text-xs text-white/50">Fim</span>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={cut.endTime}
                          onChange={(event) => updateLocalCut(cut.id, { endTime: Number(event.target.value) })}
                          className="focus-ring h-10 w-full rounded-md border border-white/10 bg-graphite-950 px-3 text-sm text-white"
                        />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => playCut(cut)}
                        className="focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 text-sm font-medium text-white/75 hover:border-signal-teal/40 hover:text-white"
                      >
                        <Play size={15} />
                        Assistir
                      </button>
                      <button
                        type="button"
                        onClick={() => saveCut(cut)}
                        className="focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-signal-teal text-sm font-semibold text-graphite-950 hover:brightness-110"
                      >
                        {savingId === cut.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        Salvar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {message && <p className="border-t border-white/10 p-4 text-sm text-white/60">{message}</p>}
      </aside>
    </div>
  );
}

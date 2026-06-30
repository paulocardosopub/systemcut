"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { FileVideo, Link as LinkIcon, Loader2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/format";

const contentTypes = ["Gameplay", "Live", "Podcast", "Aula", "Vlog", "Review", "Tutorial", "Outro"];
const objectives = [
  "Video para YouTube",
  "Shorts/Reels/TikTok",
  "Melhores momentos",
  "Highlights engracados",
  "Momentos epicos",
  "Resumo educativo",
  "Clipe viral"
];
const durations = ["30 segundos", "1 minuto", "3 minutos", "5 minutos", "10 minutos", "Personalizado"];

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  function chooseFile(nextFile?: File | null) {
    setError("");
    if (!nextFile) return;

    const allowed = [".mp4", ".mov", ".mkv", ".webm"];
    const lower = nextFile.name.toLowerCase();

    if (!allowed.some((ext) => lower.endsWith(ext))) {
      setError("Envie um arquivo MP4, MOV, MKV ou WEBM.");
      return;
    }

    setFile(nextFile);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setProgress(0);
    setError("");

    const form = new FormData(event.currentTarget);
    const url = videoUrl.trim();

    if (url && !file) {
      try {
        const response = await fetch("/api/projects/import-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url,
            title: String(form.get("title") || ""),
            contentType: String(form.get("contentType") || ""),
            objective: String(form.get("objective") || ""),
            desiredDuration: String(form.get("desiredDuration") || "")
          })
        });
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Nao foi possivel importar o link.");
          return;
        }

        router.push(`/editor/${data.project.id}`);
        router.refresh();
      } catch {
        setError("Falha de rede durante a importacao do link.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!file) {
      setLoading(false);
      setError("Selecione um video ou cole um link do YouTube, TikTok ou Instagram.");
      return;
    }

    form.set("video", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/projects/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      setLoading(false);
      const data = JSON.parse(xhr.responseText || "{}");

      if (xhr.status >= 400) {
        setError(data.error || "Nao foi possivel enviar o video.");
        return;
      }

      router.push(`/editor/${data.project.id}`);
      router.refresh();
    };

    xhr.onerror = () => {
      setLoading(false);
      setError("Falha de rede durante o upload.");
    };

    xhr.send(form);
  }

  return (
    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          chooseFile(event.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-[22rem] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition ${
          dragging ? "border-signal-teal bg-signal-teal/10" : "border-white/[0.15] bg-white/[0.04]"
        }`}
      >
        <input ref={inputRef} type="file" name="video" accept=".mp4,.mov,.mkv,.webm" className="hidden" onChange={onFileChange} />
        <UploadCloud size={44} className="text-signal-teal" />
        <h2 className="mt-5 text-xl font-semibold text-white">Arraste seu video para ca</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/[0.55]">
          O upload e enviado por stream para o armazenamento local do MVP. Depois disso o processamento com FFmpeg comeca em
          background.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="focus-ring mt-6 rounded-md border border-white/[0.12] px-5 py-2.5 font-semibold text-white transition hover:border-signal-teal/50"
        >
          Selecionar arquivo
        </button>

        {file && (
          <div className="mt-6 flex w-full max-w-lg items-center gap-3 rounded-md border border-white/10 bg-graphite-900 p-3 text-left">
            <FileVideo className="text-signal-amber" size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-white/[0.45]">{formatBytes(file.size)}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="mt-6 w-full max-w-lg">
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-signal-teal transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/[0.55]">
              {file ? `${progress}% enviado` : "Importando link pelo servidor..."}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-graphite-900/75 p-5">
        <h2 className="text-lg font-semibold text-white">Preferencias da analise</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Titulo do projeto</span>
            <input
              name="title"
              className="focus-ring h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none"
              placeholder="Ex: Live de gameplay - junho"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Link do YouTube, TikTok ou Instagram</span>
            <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3">
              <LinkIcon size={17} className="text-signal-teal" />
              <input
                type="url"
                value={videoUrl}
                onChange={(event) => {
                  setVideoUrl(event.target.value);
                  setError("");
                }}
                className="h-11 min-w-0 flex-1 bg-transparent text-white outline-none"
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <span className="mt-2 block text-xs leading-5 text-white/45">
              Use apenas videos publicos que voce tem direito de baixar/processar. Para link, deixe o arquivo vazio.
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Tipo de conteudo</span>
            <select name="contentType" className="focus-ring h-11 w-full rounded-md border border-white/10 bg-graphite-850 px-3 text-white">
              {contentTypes.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Objetivo do corte</span>
            <select name="objective" className="focus-ring h-11 w-full rounded-md border border-white/10 bg-graphite-850 px-3 text-white">
              {objectives.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/70">Duracao desejada</span>
            <select name="desiredDuration" className="focus-ring h-11 w-full rounded-md border border-white/10 bg-graphite-850 px-3 text-white">
              {durations.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-signal-teal font-semibold text-graphite-950 transition hover:brightness-110 disabled:opacity-70"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
          {videoUrl.trim() && !file ? "Importar link e analisar" : "Enviar e analisar"}
        </button>
      </section>
    </form>
  );
}

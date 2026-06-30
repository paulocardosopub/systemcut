import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Captions, Clapperboard, History, Scissors, Upload, WandSparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

const features = [
  { icon: Upload, title: "Upload pesado", text: "Envie aulas, podcasts, lives, gameplays e gravacoes longas." },
  { icon: WandSparkles, title: "Analise com IA", text: "A arquitetura ja separa o provider real do modo mock do MVP." },
  { icon: Scissors, title: "Cortes inteligentes", text: "Sugestoes com inicio, fim, score, motivo e trecho de transcricao." },
  { icon: Captions, title: "Legendas", text: "Baixe SRT ou VTT e mantenha a base pronta para estilos automaticos." },
  { icon: Clapperboard, title: "Exportacao", text: "Gere videos em formatos horizontal, vertical, quadrado ou original." },
  { icon: History, title: "Historico", text: "Reabra projetos antigos e mantenha cada usuario isolado." }
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen overflow-hidden bg-graphite-950">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-teal text-graphite-950">
            <WandSparkles size={20} />
          </span>
          <span className="text-lg font-semibold text-white">System Smart Cut</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link
              href="/dashboard"
              className="focus-ring rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/[0.08]0 transition hover:border-signal-teal/40 hover:text-white"
            >
              Abrir dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="focus-ring rounded-md px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white"
              >
                Fazer login
              </Link>
              <Link
                href="/cadastro"
                className="focus-ring rounded-md bg-signal-teal px-4 py-2 text-sm font-semibold text-graphite-950 transition hover:brightness-110"
              >
                Comecar agora
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-4 inline-flex rounded-full border border-signal-teal/25 bg-signal-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-signal-teal">
            MVP funcional
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-6xl">
            System Smart Cut
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-white/[0.65]">
            Transforme videos longos em cortes inteligentes com IA, ajuste os trechos no editor e exporte para YouTube,
            Shorts, Reels ou TikTok.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={user ? "/upload" : "/cadastro"}
              className="focus-ring inline-flex h-12 items-center justify-center gap-2 rounded-md bg-signal-teal px-6 font-semibold text-graphite-950 transition hover:brightness-110"
            >
              Comecar agora
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#demo"
              className="focus-ring inline-flex h-12 items-center justify-center rounded-md border border-white/[0.12] px-6 font-semibold text-white/[0.08]0 transition hover:border-white/30 hover:text-white"
            >
              Ver demonstracao
            </Link>
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-signal-teal/10 blur-3xl" />
          <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-glow">
            <Image
              src="/hero-smart-cut.png"
              alt="Interface conceitual do System Smart Cut"
              width={1600}
              height={1000}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-lg border border-white/10 bg-graphite-900/70 p-5">
                <Icon className="mb-4 text-signal-amber" size={24} />
                <h2 className="text-base font-semibold text-white">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/[0.55]">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-graphite-900/85 p-6 shadow-glow">
        <Link href="/" className="mb-8 block text-sm font-semibold uppercase tracking-[0.18em] text-signal-teal">
          System Smart Cut
        </Link>
        <h1 className="text-2xl font-semibold text-white">Entrar na sua conta</h1>
        <p className="mt-2 text-sm leading-6 text-white/[0.55]">
          Acesse seus projetos, cortes, exportacoes e historico de videos.
        </p>
        <div className="mt-6">
          <AuthForm mode="login" />
        </div>
      </section>
    </main>
  );
}

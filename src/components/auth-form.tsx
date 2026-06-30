"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, Loader2, Mail, UserRound } from "lucide-react";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const payload =
      mode === "signup"
        ? {
            name: String(form.get("name") || ""),
            email: String(form.get("email") || ""),
            password: String(form.get("password") || "")
          }
        : {
            email: String(form.get("email") || ""),
            password: String(form.get("password") || "")
          };

    const response = await fetch(`/api/auth/${mode === "signup" ? "signup" : "login"}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Nao foi possivel continuar.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <form onSubmit={submit} className="space-y-4">
      {isSignup && (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-white/[0.08]0">Nome</span>
          <span className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3">
            <UserRound size={18} className="text-white/40" />
            <input
              name="name"
              required
              minLength={2}
              className="h-12 w-full bg-transparent text-white outline-none placeholder:text-white/30"
              placeholder="Seu nome"
            />
          </span>
        </label>
      )}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/[0.08]0">E-mail</span>
        <span className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3">
          <Mail size={18} className="text-white/40" />
          <input
            name="email"
            type="email"
            required
            className="h-12 w-full bg-transparent text-white outline-none placeholder:text-white/30"
            placeholder="voce@email.com"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-white/[0.08]0">Senha</span>
        <span className="flex items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3">
          <Eye size={18} className="text-white/40" />
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 6 : undefined}
            className="h-12 w-full bg-transparent text-white outline-none placeholder:text-white/30"
            placeholder={isSignup ? "Minimo de 6 caracteres" : "Sua senha"}
          />
        </span>
      </label>

      {error && (
        <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-signal-teal px-5 font-semibold text-graphite-950 transition hover:brightness-110 disabled:opacity-70"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="text-center text-sm text-white/[0.55]">
        {isSignup ? "Ja tem uma conta?" : "Ainda nao tem conta?"}{" "}
        <Link href={isSignup ? "/login" : "/cadastro"} className="font-medium text-signal-teal hover:underline">
          {isSignup ? "Fazer login" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}

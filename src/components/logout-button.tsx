"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/70 transition hover:border-signal-coral/40 hover:text-white disabled:opacity-60"
      title="Sair"
    >
      <LogOut size={18} />
    </button>
  );
}

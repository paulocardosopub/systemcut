import { Calendar, Mail, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { toInputDate } from "@/lib/format";
import { requireUser } from "@/lib/require-user";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Conta"
        title="Configuracoes"
        description="Dados basicos da conta usada para isolar seus projetos e arquivos."
      />

      <section className="max-w-2xl rounded-lg border border-white/10 bg-graphite-900/70 p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
            <UserRound className="text-signal-teal" size={22} />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">Nome</p>
              <p className="font-medium text-white">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
            <Mail className="text-signal-amber" size={22} />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">E-mail</p>
              <p className="font-medium text-white">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.04] p-4">
            <Calendar className="text-signal-coral" size={22} />
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">Criada em</p>
              <p className="font-medium text-white">{toInputDate(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

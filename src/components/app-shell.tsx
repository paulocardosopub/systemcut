import Link from "next/link";
import { Clapperboard, History, Home, Settings, Upload, WandSparkles } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

type User = {
  name: string;
  email: string;
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/upload", label: "Enviar video", icon: Upload },
  { href: "/meus-videos", label: "Historico", icon: History },
  { href: "/exportacoes", label: "Exportacoes", icon: Clapperboard },
  { href: "/configuracoes", label: "Conta", icon: Settings }
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-graphite-950/85">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-white/10 bg-graphite-900/95 px-5 py-6 backdrop-blur xl:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-signal-teal text-graphite-950">
            <WandSparkles size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-signal-teal">
              System
            </span>
            <span className="text-xl font-semibold text-white">Smart Cut</span>
          </span>
        </Link>

        <nav className="mt-10 space-y-2">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="xl:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-graphite-950/80 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 xl:hidden">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-signal-teal text-graphite-950">
                <WandSparkles size={18} />
              </span>
              <span className="font-semibold text-white">Smart Cut</span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex xl:hidden">
              {nav.slice(0, 4).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="focus-ring flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-white/[0.45]">{user.email}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

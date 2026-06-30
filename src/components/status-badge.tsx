const styles: Record<string, string> = {
  Enviado: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  Processando: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  "Gerando thumbnail": "border-amber-300/30 bg-amber-300/10 text-amber-100",
  "Extraindo audio": "border-amber-300/30 bg-amber-300/10 text-amber-100",
  "Analisando com IA": "border-teal-300/30 bg-teal-300/10 text-teal-100",
  "Pronto para edicao": "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  Exportando: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  Exportado: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  Erro: "border-red-400/30 bg-red-400/10 text-red-100"
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[status] || "border-white/[0.15] bg-white/10 text-white/[0.08]0"
      }`}
    >
      {status}
    </span>
  );
}

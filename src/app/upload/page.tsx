import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { UploadForm } from "@/components/upload-form";
import { requireUser } from "@/lib/require-user";

export default async function UploadPage() {
  const user = await requireUser();

  return (
    <AppShell user={user}>
      <PageHeader
        eyebrow="Novo projeto"
        title="Enviar video"
        description="Envie o arquivo original, escolha o tipo de conteudo e deixe o MVP gerar thumbnail, audio, transcricao mockada e cortes inteligentes."
      />
      <UploadForm />
    </AppShell>
  );
}

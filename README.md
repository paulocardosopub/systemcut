# System Smart Cut

Plataforma web para transformar videos longos em cortes inteligentes com apoio de IA.

## Status

Projeto iniciado. Esta pasta foi preparada como um repositorio separado para desenvolvimento do MVP.

## MVP planejado

- Cadastro e login de usuarios.
- Dashboard com historico de projetos.
- Upload de videos.
- Leitura de metadados e thumbnail com FFmpeg.
- Extracao de audio.
- Provider de IA modular com modo mock.
- Sugestao de cortes inteligentes.
- Editor simples para ajustar inicio e fim dos cortes.
- Exportacao de video final.
- Download do arquivo exportado.

## Stack sugerida

- Next.js com TypeScript.
- Tailwind CSS.
- Backend via API Routes ou servidor Node dedicado.
- Banco local para MVP, com caminho aberto para PostgreSQL/Supabase.
- Worker separado para processamento de video.
- FFmpeg para metadados, thumbnails, cortes e exportacao.

## Proximos passos

1. Criar a aplicacao base.
2. Modelar banco, autenticacao e armazenamento local.
3. Implementar upload e processamento inicial.
4. Criar o motor `SmartCutEngine`.
5. Construir dashboard, historico e editor.


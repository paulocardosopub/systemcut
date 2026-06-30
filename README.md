# System Smart Cut

MVP de uma plataforma web para transformar videos longos em cortes inteligentes com apoio de IA.

## O que ja funciona

- Cadastro, login, sessao persistente e isolamento por usuario.
- Dashboard com videos recentes, status e atalhos.
- Upload de videos em stream para `storage/uploads`.
- Processamento com FFmpeg embutido via dependencias do projeto:
  - leitura de metadados;
  - thumbnail;
  - extracao de audio.
- Provider de IA mockado em `src/lib/ai/videoAnalyzer.ts`.
- `SmartCutEngine` para ranquear cortes sugeridos.
- Editor com player, timeline, lista de cortes, ajuste de inicio/fim e criacao manual de corte.
- Transcricao clicavel com timestamps.
- Exportacao com FFmpeg para original, YouTube horizontal, vertical e quadrado.
- Download de video final, `.srt` e `.vtt`.
- Historico, busca, filtro por status e exclusao de projeto.

## Stack

- Next.js com TypeScript.
- Tailwind CSS.
- Prisma Client com SQLite local.
- Upload multipart com Busboy.
- FFmpeg/FFprobe via `ffmpeg-static` e `ffprobe-static`.
- Auth local com cookie HTTP-only, JWT e bcrypt.

## Rodando localmente

```bash
npm install
npm run db:push
npm run dev
```

Abra:

```text
http://localhost:3000
```

Para acessar no celular ou outro dispositivo na mesma rede:

```bash
npm run dev:lan
```

Depois use o endereco `Network` mostrado no terminal, por exemplo:

```text
http://192.168.15.22:3000
```

## Scripts

- `npm run dev`: inicia o servidor local.
- `npm run dev:lan`: inicia aceitando acesso de outros dispositivos na rede.
- `npm run db:push`: cria/atualiza o SQLite local do MVP.
- `npm run worker`: reprocessa projetos pendentes/erro.
- `npm run build`: gera Prisma Client e valida o build.
- `npm run start`: roda o build de producao.

## Variaveis de ambiente

Copie `.env.example` para `.env` e ajuste se necessario.

O MVP usa `AI_PROVIDER=mock` por padrao, entao nao precisa de chave de IA real para funcionar.

## Deploy em servidor proprio

O projeto ja inclui `Dockerfile` e `docker-compose.yml` para rodar em VPS com dados persistentes.

Guia completo:

```text
docs/deploy-vps.md
```

## Observacoes

O comando `npm run db:push` usa `scripts/init-db.mjs`, porque nesta maquina o motor nativo de `prisma db push` retornou erro generico. O Prisma continua sendo usado como ORM em runtime, e o script cria as mesmas tabelas descritas em `prisma/schema.prisma`.

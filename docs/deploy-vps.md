# Deploy em servidor proprio

Este guia sobe o System Smart Cut em um VPS com Docker. O app fica persistente e reinicia sozinho se o servidor reiniciar.

## Requisitos do servidor

- Ubuntu 22.04 ou 24.04.
- Docker e Docker Compose.
- Pelo menos 2 vCPU e 4 GB de RAM para testes.
- Disco suficiente para uploads/exportacoes de video.
- Porta 3000 liberada, ou proxy HTTPS apontando para a porta 3000.

## Deploy

```bash
git clone https://github.com/paulocardosopub/systemcut.git
cd systemcut
cp .env.example .env
```

Edite `.env`:

```env
APP_URL=https://seu-dominio.com
AUTH_SECRET=troque-por-uma-chave-grande
DATABASE_URL=file:/app/storage/db/prod.db
STORAGE_DIR=/app/storage
AI_PROVIDER=mock
```

Suba:

```bash
docker compose up -d --build
```

Ver logs:

```bash
docker compose logs -f app
```

Atualizar depois de novos commits:

```bash
git pull
docker compose up -d --build
```

## Dados persistentes

Uploads, thumbnails, audio, exportacoes e o SQLite de producao ficam no volume Docker `system-smart-cut-storage`.

## HTTPS

Para producao, coloque um proxy na frente do app, por exemplo Caddy ou Nginx, apontando para:

```text
http://127.0.0.1:3000
```

## Observacao

O MVP usa SQLite e armazenamento local. Para muitos usuarios simultaneos ou videos muito grandes, a proxima etapa recomendada e migrar para PostgreSQL, fila real de jobs e armazenamento em S3/R2.

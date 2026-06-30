# Project Brief: System Smart Cut

System Smart Cut sera uma plataforma web de edicao inteligente de videos. O objetivo do MVP e permitir que um usuario crie conta, envie um video, acompanhe o processamento, receba sugestoes de cortes, ajuste os trechos em um editor simples, exporte o resultado e baixe o arquivo final.

## Produto

- Nome: System Smart Cut.
- Area: edicao de video com IA.
- Idioma da interface: portugues do Brasil.
- Estilo: SaaS premium, tema escuro, limpo e profissional.

## Fluxo principal

1. Usuario cria conta ou entra.
2. Usuario envia um video.
3. Sistema salva o arquivo localmente no MVP.
4. Worker le metadados, gera thumbnail e extrai audio.
5. Provider de IA gera transcricao e cortes, usando mock quando nao houver chave real.
6. Usuario abre o editor e ajusta os cortes.
7. Usuario exporta e baixa o video final.
8. Projeto fica salvo no historico do usuario.

## Entidades principais

- User
- VideoProject
- TranscriptSegment
- SmartCut
- Caption
- ExportJob

## Requisitos importantes

- Processamento pesado deve rodar em background.
- Upload de video grande nao deve carregar o arquivo inteiro em memoria.
- Cada usuario deve ver apenas os proprios projetos.
- O projeto nao deve quebrar sem IA real configurada.
- FFmpeg deve ser usado para tarefas de video.


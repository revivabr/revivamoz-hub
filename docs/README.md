# Reviva Moz — Documentação

Aplicação interna de gestão financeira, projetos sociais e relatórios para a
organização **Reviva Moz**. Construída em **TanStack Start** (React 19 + Vite),
**Tailwind v4** e **Lovable Cloud (Supabase)** como backend.

## Índice

1. [Arquitetura](./ARCHITECTURE.md) — stack, estrutura de pastas, decisões
2. [Base de Dados](./DATABASE.md) — modelo de dados, tabelas, enums, RLS
3. [Segurança](./SECURITY.md) — autenticação, RLS, papéis, secrets
4. [Funcionalidades](./FEATURES.md) — módulos do app, fluxos principais
5. [Manual do Utilizador](./USER_GUIDE.md) — guia passo a passo por perfil
6. [Deployment](./DEPLOYMENT.md) — publicação, variáveis, cron, backups
7. [Migrations SQL](./MIGRATIONS.md) — scripts completos para recriar a base do zero (`docs/sql/`)

## TL;DR

| Item | Valor |
| --- | --- |
| Stack | TanStack Start v1, React 19, Tailwind v4, shadcn/ui |
| Backend | Lovable Cloud (Supabase Postgres + Auth + Storage) |
| IA | Multi-provedor (OpenAI, Gemini, Opencode-Go) via Strategy Pattern |
| Notificações | Brevo (email) + in-app |
| Backups | pg_cron 12:00 e 22:00 (Maputo) + espelhamento Google Drive |
| PWA | Sim, com fila offline (localStorage) |
| Idiomas | PT-MZ, PT-BR |
| Testes | Vitest (46+ testes unitários) |

## Comandos

```bash
bun install              # instalar dependências
bun run dev              # desenvolvimento
bun run build            # build produção
bun run test             # testes unitários
bun run lint             # eslint
```

## Estrutura de Alto Nível

```
src/
├── routes/              # rotas TanStack (_authenticated/* é protegido)
├── components/          # UI (layout, dashboard, projetos, subprojetos, …)
├── lib/                 # domínio: queries, server functions, utils, ai/, stats/
├── integrations/        # supabase (gerado), lovable
├── hooks/               # hooks React
└── styles.css           # tokens Tailwind v4 (@theme)
supabase/migrations/     # histórico imutável de migrations
docs/                    # esta documentação
docs/sql/                # snapshot consolidado para instalação limpa
```

## Primeiros Passos (dev local)

1. Variáveis em `.env` (já populadas pela integração Lovable Cloud):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
2. `bun install && bun run dev`.
3. Para criar a base do zero noutro projeto Supabase, executar
   `docs/sql/complete-schema.sql` seguido (opcionalmente) de `docs/sql/seed.sql`.

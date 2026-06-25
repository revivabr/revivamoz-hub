# Arquitetura

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | TanStack Start v1 (Vite 8, React 19, SSR-ready) |
| Linguagem | TypeScript 5.8 (strict) |
| UI | Tailwind v4 + shadcn/ui (Radix) + lucide-react |
| Estado servidor | TanStack Query 5 |
| Routing | TanStack Router (file-based em `src/routes/`) |
| Backend | Lovable Cloud → Supabase (Postgres + Auth + Storage + Realtime) |
| Server logic | `createServerFn` (TanStack Start), nunca Edge Functions para lógica interna |
| Charts | Recharts |
| PDF/XLSX | jspdf + jspdf-autotable, xlsx |
| Email | Brevo (API) |
| AI Gateway | Strategy Pattern multi-provedor (OpenAI / Gemini / Opencode-Go) |
| Testes | Vitest + jsdom |

## Princípios

- **Clean Code / SOLID** — domínio em `src/lib/<feature>/{queries,types,totals}.ts`,
  componentes pequenos, separação clara entre UI e regra de negócio.
- **Strategy Pattern para IA** — `src/lib/ai/providers.ts` isola routing por provedor.
- **Server Functions tipadas** — `*.functions.ts` para RPC tipado; rotas
  `api/public/*` apenas para webhooks/cron.
- **RLS por padrão** — toda tabela `public.*` tem RLS + GRANTs explícitos.
- **Multi-tenant por projeto** — `projeto_membros` define acesso; `super_admin`
  bypassa via `has_role`.

## Estrutura de Pastas

```
src/
├── routes/
│   ├── __root.tsx                       # shell html + head + onAuthStateChange
│   ├── auth.tsx                         # login (email/password)
│   ├── p.relatorio.$token.tsx           # portal público de doador
│   ├── api/public/hooks/backup.ts       # webhook do pg_cron de backup
│   └── _authenticated/                  # layout protegido (ssr:false, gate)
│       ├── route.tsx
│       ├── index.tsx                    # dashboard global
│       ├── subprojetos.tsx              # projetos ativos
│       ├── projetos.$projetoId.tsx      # dashboard de projeto
│       ├── fluxo-caixa.tsx
│       ├── relatorios.tsx
│       ├── assistente.tsx               # chat IA
│       ├── inteligencia.tsx             # previsão + anomalias + sumário
│       ├── auditoria.tsx                # audit log + backups
│       └── configuracoes.tsx            # super admin
├── components/
│   ├── layout/{AppSidebar,AppHeader,DashboardLayout,OfflineBadge}.tsx
│   ├── dashboard/{KpiCard,ExpensesBarChart,CostsDonutChart,TransactionsTable}.tsx
│   ├── projetos/{ProjetoKpiCard,ProjetoLogo,NovoLancamentoDialog,…}.tsx
│   ├── subprojetos/{ProjetoCard,CreateProjetoDialog,MembrosList,…}.tsx
│   ├── configuracoes/AiProvedoresCard.tsx
│   ├── notifications/NotificationsBell.tsx
│   └── ui/                              # shadcn (não editar)
├── lib/
│   ├── ai/providers.ts                  # Strategy: openai|gemini|opencode_go
│   ├── ai-models.ts                     # catálogo de modelos
│   ├── ai.functions.ts                  # aiChat, assistenteAsk, list active provider
│   ├── projetos/{queries,totals,types}.ts
│   ├── subprojetos/{queries,types}.ts
│   ├── stats/{regression,zscore,month}.ts
│   ├── admin-users.functions.ts         # criação de utilizadores (super admin)
│   ├── notifications.functions.ts       # Brevo + in-app
│   ├── ops.functions.ts                 # backups manuais
│   ├── offline-queue.ts                 # fila offline PWA
│   ├── i18n.tsx                         # pt-MZ, pt-BR
│   ├── theme.tsx
│   └── format.ts
├── integrations/
│   ├── supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts (gerado)
│   └── lovable/index.ts
└── styles.css                           # @theme Tailwind v4
```

## Fluxo de Dados (leitura padrão)

1. Componente em `_authenticated/*.tsx` chama `useQuery` com `queryFn` apontando
   para um `createServerFn().middleware([requireSupabaseAuth])`.
2. O middleware injeta `context.supabase` (RLS aplicada como o utilizador).
3. As queries vivem em `src/lib/<feature>/queries.ts`, expostas como funções
   tipadas (sem JSX).
4. O `start.ts` regista `attachSupabaseAuth` em `functionMiddleware` para enviar
   o bearer token automaticamente.

## Sub-sistemas

### IA (Strategy)

`src/lib/ai/providers.ts` exporta `callAiProvider({ provedor, model, apiKey, messages })`
que despacha para:
- `openai` → `POST /v1/chat/completions`
- `gemini` → `POST /v1beta/models/{model}:generateContent`
- `opencode_go` → `POST /v1/chat/completions` ou `/v1/messages` (sabor anthropic
  para MiniMax/Qwen), com normalização do prefixo `opencode-go/`.

Apenas **um** provedor pode estar `enabled=true` em `ai_provedores` (toggle exclusivo).

### Backups

- `pg_cron`: 2 jobs (12:00 e 22:00 Maputo) chamam `POST /api/public/hooks/backup`.
- O handler exporta todas as tabelas em JSON, sobe ao bucket `backups`, regista
  em `backup_runs`, e espelha em Google Drive (pasta "RevivaMoz Backups").

### Notificações

- Tabela `notificacoes` (in-app) + Brevo (email via `BREVO_API_KEY`).
- `NotificationsBell` faz polling/realtime e marca como lido.

### PWA / Offline

- `public/manifest.webmanifest` + ícones em `public/`.
- `src/lib/offline-queue.ts` armazena lançamentos em `localStorage` quando
  `navigator.onLine === false` e sincroniza ao voltar.

## Decisões importantes

- **Sem Google OAuth** — toda a criação de conta é manual pelo super admin
  (`adminCreateUser`), com associação obrigatória a projeto.
- **Sem Edge Functions** para lógica interna — `createServerFn` é o padrão.
- **`supabaseAdmin`** apenas em handlers de webhook verificado e em
  `adminCreateUser` (Auth Admin API), com `await import` dentro do handler.
- **`super_admin_seed`** auto-promove o e-mail listado quando o utilizador faz
  signup (trigger `handle_new_user`).

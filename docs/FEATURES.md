# Funcionalidades

## Painel global (`/`)

KPIs agregados (entradas, saídas, saldo, nº lançamentos), filtros por projeto
e intervalo de datas, gráficos comparativos (Recharts) e semáforo de "saúde
financeira" por projeto.

## Projetos Ativos (`/subprojetos`)

Lista de programas sociais, projetos sazonais e caixas administrativos.
Cards com `ProjetoLogo` (16:9, fallback para nome), badges de estado e tipo.
Super admin cria/edita; gestores gerem o próprio projeto.

## Dashboard do Projeto (`/projetos/$projetoId`)

- KPIs do projeto (`ProjetoKpiCard`).
- Lista de lançamentos (`LancamentosLista`) com filtro, pré-visualização de comprovativo e edição posterior.
- Os diálogos de criação e edição partilham `LancamentoFormFields`; gestores e Super Admin podem corrigir dados e substituir/remover comprovativos.
- Categorias globais ou por projeto são geridas exclusivamente pelo Super Admin em Configurações. As categorias globais “Não sei” cobrem entrada e saída para classificação posterior.
- Secção `EtapasSection` (cronograma físico) com peso e progresso.

## Fluxo de Caixa (`/fluxo-caixa`)

Vista transversal a todos os projetos com filtros e tabela ordenável.

## Relatórios (`/relatorios`)

- Filtro por projeto + intervalo.
- Exportação **PDF** (jspdf-autotable) e **Excel** (xlsx).
- Partilha pública com expiração via `relatorio_partilhas` → URL
  `/p/relatorio/{token}`.

## Portal do Doador (`/p/relatorio/$token`)

Página pública read-only que chama a RPC `get_relatorio_publico(token)`.
Mostra projeto, período, KPIs e lançamentos. Expira automaticamente.

## Assistente IA (`/assistente`)

Chat natural com contexto financeiro (projetos, KPIs, anomalias). Usa o
provedor ativo configurado pelo super admin. Histórico em
`assistente_conversas`.

## Inteligência (`/inteligencia`)

- **Previsão**: regressão linear sobre série mensal (`src/lib/stats/regression.ts`).
- **Anomalias**: z-score sobre lançamentos (`src/lib/stats/zscore.ts`).
- **Sumário executivo**: prompt determinístico ao provedor ativo.
- **Pesos orçamentais**: análise de distribuição por categoria.

## Auditoria (`/auditoria`)

- `audit_log` filtrável por tabela, ação, projeto, ator.
- `BackupsCard`: histórico, trigger manual, download (signed URL), estado
  de espelhamento Google Drive.

## Configurações (`/configuracoes`)

Acessível apenas a super admin:

- **Criar utilizador** (com associação obrigatória a um ou vários projetos + papel).
- **Categorias**: criar e remover categorias globais ou de um projeto específico.
- **Super Admins**: grant / revoke por email; seeds pendentes.
- **Provedores IA** (`AiProvedoresCard`):
  - Guardar API key uma vez; trocar modelo sem repor a key.
  - Toggle exclusivo: ativar um desativa os outros.
  - Botão "Testar endpoint" valida a chamada real.
- **Backups**: trigger manual + ver histórico (espelhado do card de Auditoria).

## Notificações

- Sino no header (`NotificationsBell`) com badge de não-lidos.
- Email via Brevo para alertas críticos (configurável em `notifications.functions.ts`).

## PWA / Offline

- Instalável no telemóvel (manifest + ícones).
- `OfflineBadge` no header indica estado de conectividade.
- `src/lib/offline-queue.ts`: lançamentos criados offline ficam em
  `localStorage` e sincronizam ao voltar a ligação.

## Internacionalização

- `src/lib/i18n.tsx` — `pt-MZ` (default) e `pt-BR`.
- Trocável no header (menu de bandeira).

## Tema

- Light / dark via `src/lib/theme.tsx`.
- Tokens semânticos em `src/styles.css` (Tailwind v4 `@theme`).

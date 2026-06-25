# Plano: Dashboard Reviva Moz (Visão Super Admin)

Construir a tela principal do SaaS de gestão financeira da Associação Reviva Moz, com identidade visual em tons de verde e dados fictícios realistas do contexto moçambicano (valores em MZN — Meticais).

## Escopo desta entrega

Foco apenas no frontend da **tela Dashboard Super Admin**. Sidebar/header ficam funcionais visualmente, mas as outras páginas (Subprojetos, Fluxo de Caixa, Relatórios, Configurações) serão criadas como rotas placeholder simples para a navegação funcionar. Sem backend nesta etapa.

## Design System (em `src/styles.css`)

Tokens semânticos via `@theme inline` + variáveis oklch:
- `--primary` verde médio `#2D6A4F` (botões/ações)
- `--sidebar` verde escuro `#1B4332`
- `--accent` verde claro `#52B788`
- `--background` off-white `#F7F9F8`
- `--card` branco puro
- Status: `--success` (verde entrada), `--warning` (dourado pendente), `--destructive` (vermelho saída) — variantes suaves para badges (fundo claro + texto forte)
- Tipografia: **Inter** via `<link>` no `__root.tsx`
- Raio: `--radius: 12px`; sombras suaves customizadas (`--shadow-card`)

## Estrutura de arquivos

```text
src/
  routes/
    __root.tsx              # + <link> Inter, meta SEO PT-BR
    index.tsx               # Dashboard Super Admin (tela principal)
    subprojetos.tsx         # placeholder
    fluxo-caixa.tsx         # placeholder
    relatorios.tsx          # placeholder
    configuracoes.tsx       # placeholder
  components/
    layout/
      AppSidebar.tsx        # sidebar verde escuro com logo + nav
      AppHeader.tsx         # título + busca + sino + avatar/role
      DashboardLayout.tsx   # SidebarProvider + header + <Outlet/>
    dashboard/
      KpiCard.tsx           # cartão KPI (ícone, título, valor, delta)
      ExpensesBarChart.tsx  # Recharts BarChart comparativo
      CostsDonutChart.tsx   # Recharts PieChart (donut)
      TransactionsTable.tsx # tabela últimas transações + badges
    ui/badge-status.tsx     # variantes entrada/saida/pendente
  lib/
    mock-data.ts            # KPIs, séries de gráficos, transações fictícias
    format.ts               # formatMZN, formatDate (pt-MZ)
  assets/
    reviva-logo.svg         # marca textual estilizada (gerada)
```

Layout root migra de `index.tsx` standalone para usar `DashboardLayout` via uma rota pathless `_app.tsx` que envolve todas as rotas internas com sidebar + header.

## Conteúdo do Dashboard

**Linha 1 — KPI Cards (grid 4 col → 2 col md → 1 col sm):**
- Saldo Global Consolidado — `MZN 8.450.230,00` · ícone cofre
- Receitas do Mês — `MZN 1.230.500,00` · +12,4% · seta ↑ verde
- Despesas do Mês — `MZN 945.180,00` · −3,1% · seta ↓ vermelha
- Projetos Ativos — `8` (5 PEPEs + 3 Obras)

**Linha 2 — Gráficos (grid 12 col: 7/5 em desktop, empilha mobile):**
- BarChart "Despesas Comparativas" — barras agrupadas (Salários, Alimentação, Infraestrutura) por: Pepe Reviva, Pepe Narani, Pepe Emuná, Pepe Yeshua, Construção Poço Inhambane, Sala Aula Maputo
- DonutChart "Distribuição de Custos Globais" — Alimentação 32%, Salários 41%, Infraestrutura 18%, Logística 6%, Outros 3%, com legenda lateral

**Linha 3 — Tabela "Últimas Transações":**
Colunas: Data · Projeto · Categoria · Tipo (badge) · Valor · Comprovante (ícone clip). ~8 linhas com dados como:
- 24/06/2026 · Pepe Narani · Alimentação · Saída · MZN 45.200 · 📎
- 23/06/2026 · Doação Mantenedor · Padrinhos · Entrada · MZN 180.000 · 📎
- 22/06/2026 · Construção Poço · Materiais · Saída · MZN 320.500 · 📎
- etc.

## Detalhes técnicos

- **Recharts** já está disponível via shadcn `chart.tsx` — usar `ChartContainer` para herdar tokens.
- **Sidebar**: shadcn `sidebar.tsx` com `collapsible="icon"`, variante de cor sobrescrita para verde escuro via `--sidebar` tokens já existentes no styles.css.
- **Header**: grid `[minmax(0,1fr)_auto]` em mobile → flex desktop (padrão responsivo do guia).
- **Badges de tipo**: componente `<StatusBadge variant="entrada|saida|pendente">` com fundos suaves (`bg-success/15 text-success-foreground` etc.) — novos tokens `--success`, `--success-foreground`, `--warning`, `--warning-foreground` adicionados em `styles.css`.
- **Avatar**: shadcn `Avatar` com fallback "SA" + chip "Super Admin" abaixo do nome.
- **Mock data tipado** em `lib/mock-data.ts` (sem fetch, sem servidor).
- **SEO** no `index.tsx`: title "Visão Global · Reviva Moz", description, og:title/og:description em PT.
- **Responsividade**: mobile-first, sidebar vira offcanvas, KPIs empilham, gráficos empilham, tabela com scroll horizontal.

## Fora de escopo (próximas iterações)
Autenticação real, multi-tenant/RLS, telas de Gestor Local e Financiador, CRUD de lançamentos, upload de comprovantes, exportação PDF, filtros avançados (financiador, período), módulo de etapas de obra, alertas de budget teto.

Aprove para eu construir.

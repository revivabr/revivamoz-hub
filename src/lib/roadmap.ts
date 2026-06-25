export type TaskStatus = "done" | "in-progress" | "todo";

export type RoadmapTask = {
  id: string;
  title: string;
  status: TaskStatus;
};

export type RoadmapPhase = {
  id: string;
  title: string;
  goal: string;
  tasks: RoadmapTask[];
};

export const roadmap: RoadmapPhase[] = [
  {
    id: "fase-1",
    title: "Fase 1 — Fundação Visual e Dashboard Global",
    goal: "Identidade visual, layout responsivo e visão consolidada do Super Admin com dados fictícios.",
    tasks: [
      { id: "1.1", title: "Design system em tons de verde (tokens, badges, sombras)", status: "done" },
      { id: "1.2", title: "Layout base: sidebar verde escuro + header + área principal", status: "done" },
      { id: "1.3", title: "KPIs globais (Saldo, Receitas, Despesas, Projetos Ativos)", status: "done" },
      { id: "1.4", title: "Gráfico de barras — Despesas comparativas por projeto", status: "done" },
      { id: "1.5", title: "Gráfico donut — Distribuição de custos globais", status: "done" },
      { id: "1.6", title: "Tabela de últimas transações com badges Entrada/Saída", status: "done" },
      { id: "1.7", title: "Responsividade mobile-first (sidebar offcanvas, grids fluidas)", status: "done" },
      { id: "1.8", title: "Página Roadmap no sidebar com checklist de progresso", status: "done" },
    ],
  },
  {
    id: "fase-2",
    title: "Fase 2 — UX Essencial (Tema, Idioma, Localização)",
    goal: "Tornar o sistema acolhedor para lideranças com menos perfil técnico.",
    tasks: [
      { id: "2.1", title: "Dark / Light mode com persistência por utilizador", status: "done" },
      { id: "2.2", title: "i18n PT-MZ (padrão) e PT-BR (opcional, só idioma)", status: "done" },
      { id: "2.3", title: "Fuso horário Africa/Maputo e moeda MZN globais", status: "done" },
      { id: "2.4", title: "Onboarding curto e tooltips contextuais em cada secção", status: "done" },
      { id: "2.5", title: "Estados vazios amigáveis e mensagens em linguagem simples", status: "done" },
    ],
  },
  {
    id: "fase-3",
    title: "Fase 3 — Backend e Multi-Tenant por Projeto",
    goal: "Cada projeto/programa social com a sua própria gestão financeira isolada.",
    tasks: [
      { id: "3.1", title: "Activar Lovable Cloud (DB, Auth, Storage)", status: "done" },
      { id: "3.2", title: "Modelo: organizações, projetos, membros, papéis (RLS)", status: "done" },
      { id: "3.3", title: "Autenticação e perfis (Super Admin, Gestor, Financiador)", status: "done" },
      { id: "3.4", title: "Tabela user_roles + função has_role (security definer)", status: "done" },
      { id: "3.5", title: "Isolamento por projeto via RLS (tenant = projeto)", status: "done" },
      { id: "3.6", title: "Convites de membros por projeto", status: "done" },
    ],
  },
  {
    id: "fase-4",
    title: "Fase 4 — Gestão Financeira por Projeto",
    goal: "CRUD financeiro completo, simples e fluido para os gestores locais.",
    tasks: [
      { id: "4.1", title: "Lançamentos de entradas e saídas com categorias", status: "done" },
      { id: "4.2", title: "Upload de comprovantes (Storage) com pré-visualização", status: "done" },
      { id: "4.3", title: "Orçamento (budget) por projeto e alertas de teto", status: "done" },
      { id: "4.4", title: "Etapas de obra com progresso físico-financeiro", status: "done" },
      { id: "4.5", title: "Dashboard individual por projeto", status: "done" },
    ],
  },
  {
    id: "fase-5",
    title: "Fase 5 — Dashboard Global com Filtros Interativos",
    goal: "Super Admin com visão cruzada de todos os projetos e programas.",
    tasks: [
      { id: "5.1", title: "Filtros por projeto, programa, período e financiador", status: "done" },
      { id: "5.2", title: "Comparativos entre projetos e contra orçamento", status: "done" },
      { id: "5.3", title: "Indicadores de saúde financeira (semáforo) por projeto", status: "done" },
      { id: "5.4", title: "Drill-down: do KPI global até à transação individual", status: "done" },
    ],
  },
  {
    id: "fase-6",
    title: "Fase 6 — Relatórios e Portal do Financiador",
    goal: "Prestação de contas transparente e exportável.",
    tasks: [
      { id: "6.1", title: "Relatórios financeiros por projeto e período", status: "done" },
      { id: "6.2", title: "Exportação em PDF e Excel com identidade Reviva Moz", status: "done" },
      { id: "6.3", title: "Portal somente-leitura para o Financiador", status: "done" },
      { id: "6.4", title: "Partilha por link seguro com expiração", status: "done" },
    ],
  },
  {
    id: "fase-7",
    title: "Fase 7 — Inteligência Artificial",
    goal: "Apoiar decisões sem complicar a vida do utilizador.",
    tasks: [
      { id: "7.1", title: "Análise preditiva de fluxo de caixa por projeto", status: "todo" },
      { id: "7.2", title: "Detecção de anomalias em despesas e categorias", status: "todo" },
      { id: "7.3", title: "Assistente em linguagem natural (perguntar aos dados)", status: "done" },
      { id: "7.4", title: "Resumo executivo mensal automático para o Super Admin", status: "todo" },
      { id: "7.5", title: "Sugestões de optimização orçamental", status: "todo" },
      { id: "7.6", title: "Multi-provedor de IA configurável (OpenAI, Gemini, Opencode-Go)", status: "done" },
    ],
  },
  {
    id: "fase-8",
    title: "Fase 8 — Operação e Confiança",
    goal: "Sistema pronto para o dia-a-dia em Moçambique.",
    tasks: [
      { id: "8.1", title: "Notificações (email/in-app) de alertas e aprovações", status: "todo" },
      { id: "8.2", title: "Trilho de auditoria (quem fez o quê e quando)", status: "todo" },
      { id: "8.3", title: "Backups e exportação total de dados do projeto", status: "todo" },
      { id: "8.4", title: "PWA / instalação no telemóvel para uso em campo", status: "todo" },
      { id: "8.5", title: "Modo offline básico para lançamentos no terreno", status: "todo" },
    ],
  },
];

export function roadmapProgress(phases: RoadmapPhase[] = roadmap) {
  const all = phases.flatMap((p) => p.tasks);
  const done = all.filter((t) => t.status === "done").length;
  return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0 };
}

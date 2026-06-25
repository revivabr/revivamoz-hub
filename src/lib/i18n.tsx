import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "pt-MZ" | "pt-BR";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  "pt-MZ": {
    "nav.section": "Navegação",
    "nav.overview": "Visão Global",
    "nav.subprojects": "Projetos Ativos",
    "nav.cashflow": "Fluxo de Caixa",
    "nav.reports": "Relatórios",
    "nav.assistant": "Assistente IA",
    "nav.intelligence": "Inteligência",
    "nav.roadmap": "Roadmap",
    "nav.settings": "Configurações",
    "brand.tagline": "Gestão Financeira",

    "header.search": "Pesquisar projetos, transacções…",
    "header.notifications": "Notificações",
    "header.role.superadmin": "Super Admin",
    "header.theme.light": "Modo claro",
    "header.theme.dark": "Modo escuro",
    "header.language": "Idioma",

    "kpi.global_balance": "Saldo Global Consolidado",
    "kpi.updated_now": "Actualizado agora",
    "kpi.revenue": "Receitas do Mês",
    "kpi.expenses": "Despesas do Mês",
    "kpi.vs_previous": "vs. mês anterior",
    "kpi.active_projects": "Projectos Activos",
    "kpi.active_projects_hint": "{pepes} PEPEs · {obras} obras",

    "tx.title": "Últimas Transacções",
    "tx.subtitle": "Lançamentos consolidados de todos os subprojectos",
    "tx.see_all": "Ver todas",
    "tx.date": "Data",
    "tx.project": "Projecto",
    "tx.category": "Categoria",
    "tx.type": "Tipo",
    "tx.amount": "Valor",
    "tx.receipt": "Comprovativo",
    "tx.entrada": "Entrada",
    "tx.saida": "Saída",

    "header.help": "Ajuda e tour guiado",

    "tip.kpi.balance": "Soma do dinheiro disponível em todos os projectos e programas.",
    "tip.kpi.revenue": "Total recebido este mês (doações, financiadores e outras entradas).",
    "tip.kpi.expenses": "Total gasto este mês em salários, alimentação, obras e outras saídas.",
    "tip.kpi.projects": "Projectos e programas sociais com movimento activo.",
    "tip.section.expenses": "Compare quanto cada projecto gasta em cada categoria.",
    "tip.section.costs": "Veja, em percentagem, onde a organização mais gasta.",
    "tip.section.transactions": "Últimos lançamentos de entrada e saída de todos os projectos.",

    "onb.skip": "Saltar",
    "onb.next": "Próximo",
    "onb.back": "Anterior",
    "onb.finish": "Começar",
    "onb.s1.title": "Bem-vindo à Reviva Moz",
    "onb.s1.desc": "Aqui acompanha a saúde financeira de todos os projectos e programas sociais num só lugar.",
    "onb.s2.title": "KPIs em destaque",
    "onb.s2.desc": "No topo vê o saldo global, receitas, despesas e quantos projectos estão activos.",
    "onb.s3.title": "Gráficos e transacções",
    "onb.s3.desc": "Compare gastos entre projectos e veja as últimas movimentações em tempo real.",
    "onb.s4.title": "Idioma e tema",
    "onb.s4.desc": "No cabeçalho pode alternar entre PT-MZ e PT-BR e entre modo claro ou escuro.",
    "onb.s5.title": "Pronto a começar",
    "onb.s5.desc": "Pode reabrir este tour a qualquer momento no ícone de ajuda no cabeçalho.",

    "empty.subprojects.title": "Ainda não há subprojectos",
    "empty.subprojects.desc": "Os PEPEs e obras da Reviva Moz aparecerão aqui assim que forem criados. Comece por adicionar o primeiro subprojecto.",
    "empty.cashflow.title": "Sem movimentos a mostrar",
    "empty.cashflow.desc": "Quando registar entradas e saídas, este painel passa a mostrar a evolução do caixa por projecto e por mês.",
    "empty.reports.title": "Sem relatórios disponíveis",
    "empty.reports.desc": "Depois de existirem dados financeiros, poderá gerar relatórios em PDF e Excel para financiadores e direcção.",
    "empty.settings.title": "Configurações em breve",
    "empty.settings.desc": "Aqui irá gerir utilizadores, projectos, papéis e preferências da organização. Estamos a preparar tudo.",
    "empty.action.help": "Ver tour guiado",
  },
  "pt-BR": {
    "nav.section": "Navegação",
    "nav.overview": "Visão Geral",
    "nav.subprojects": "Projetos Ativos",
    "nav.cashflow": "Fluxo de Caixa",
    "nav.reports": "Relatórios",
    "nav.assistant": "Assistente IA",
    "nav.roadmap": "Roadmap",
    "nav.settings": "Configurações",
    "brand.tagline": "Gestão Financeira",

    "header.search": "Buscar projetos, transações…",
    "header.notifications": "Notificações",
    "header.role.superadmin": "Super Admin",
    "header.theme.light": "Modo claro",
    "header.theme.dark": "Modo escuro",
    "header.language": "Idioma",

    "kpi.global_balance": "Saldo Global Consolidado",
    "kpi.updated_now": "Atualizado agora",
    "kpi.revenue": "Receitas do Mês",
    "kpi.expenses": "Despesas do Mês",
    "kpi.vs_previous": "vs. mês anterior",
    "kpi.active_projects": "Projetos Ativos",
    "kpi.active_projects_hint": "{pepes} PEPEs · {obras} obras",

    "tx.title": "Últimas Transações",
    "tx.subtitle": "Lançamentos consolidados de todos os subprojetos",
    "tx.see_all": "Ver todas",
    "tx.date": "Data",
    "tx.project": "Projeto",
    "tx.category": "Categoria",
    "tx.type": "Tipo",
    "tx.amount": "Valor",
    "tx.receipt": "Comprovante",
    "tx.entrada": "Entrada",
    "tx.saida": "Saída",

    "header.help": "Ajuda e tour guiado",

    "tip.kpi.balance": "Soma do dinheiro disponível em todos os projetos e programas.",
    "tip.kpi.revenue": "Total recebido este mês (doações, financiadores e outras entradas).",
    "tip.kpi.expenses": "Total gasto este mês com salários, alimentação, obras e outras saídas.",
    "tip.kpi.projects": "Projetos e programas sociais com movimento ativo.",
    "tip.section.expenses": "Compare quanto cada projeto gasta em cada categoria.",
    "tip.section.costs": "Veja, em porcentagem, onde a organização mais gasta.",
    "tip.section.transactions": "Últimos lançamentos de entrada e saída de todos os projetos.",

    "onb.skip": "Pular",
    "onb.next": "Próximo",
    "onb.back": "Anterior",
    "onb.finish": "Começar",
    "onb.s1.title": "Bem-vindo à Reviva Moz",
    "onb.s1.desc": "Aqui você acompanha a saúde financeira de todos os projetos e programas sociais em um só lugar.",
    "onb.s2.title": "KPIs em destaque",
    "onb.s2.desc": "No topo você vê o saldo global, receitas, despesas e quantos projetos estão ativos.",
    "onb.s3.title": "Gráficos e transações",
    "onb.s3.desc": "Compare gastos entre projetos e veja as últimas movimentações em tempo real.",
    "onb.s4.title": "Idioma e tema",
    "onb.s4.desc": "No cabeçalho você pode alternar entre PT-MZ e PT-BR e entre modo claro ou escuro.",
    "onb.s5.title": "Pronto para começar",
    "onb.s5.desc": "Você pode reabrir este tour a qualquer momento no ícone de ajuda no cabeçalho.",

    "empty.subprojects.title": "Ainda não há subprojetos",
    "empty.subprojects.desc": "Os PEPEs e obras da Reviva Moz aparecerão aqui assim que forem criados. Comece adicionando o primeiro subprojeto.",
    "empty.cashflow.title": "Sem movimentos a mostrar",
    "empty.cashflow.desc": "Quando você registrar entradas e saídas, este painel passa a mostrar a evolução do caixa por projeto e por mês.",
    "empty.reports.title": "Sem relatórios disponíveis",
    "empty.reports.desc": "Quando houver dados financeiros, você poderá gerar relatórios em PDF e Excel para financiadores e diretoria.",
    "empty.settings.title": "Configurações em breve",
    "empty.settings.desc": "Aqui você irá gerenciar usuários, projetos, papéis e preferências da organização. Estamos preparando tudo.",
    "empty.action.help": "Ver tour guiado",
  },
};

type I18nCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = "revivamoz.locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt-MZ");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "pt-MZ" || saved === "pt-BR") setLocaleState(saved);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    let str = dictionaries[locale][key] ?? dictionaries["pt-MZ"][key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  };

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

// Tipos partilhados da página de Projetos Ativos (subprojetos).
export type ProjetoEstado = "planeado" | "ativo" | "pausado" | "concluido" | "cancelado";
export type ProjetoTipo = "programa_social" | "projeto_sazonal" | "caixa_administrativo";
export type Papel = "gestor" | "financiador" | "leitor";

export type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  estado: ProjetoEstado;
  tipo: ProjetoTipo;
  orcamento: number;
  moeda: string;
  data_inicio: string | null;
  data_fim: string | null;
  created_by: string;
  logo_path: string | null;
};

export type Membro = {
  id: string;
  user_id: string;
  papel: Papel;
  profiles: { full_name: string | null } | null;
};

export type Convite = {
  id: string;
  email: string;
  papel: Papel;
  estado: "pendente" | "aceite" | "revogado";
  created_at: string;
};

export const TIPO_LABEL: Record<ProjetoTipo, string> = {
  programa_social: "Programa Social",
  projeto_sazonal: "Projeto Sazonal",
  caixa_administrativo: "Caixa Administrativo",
};

export const ESTADOS: ProjetoEstado[] = [
  "planeado", "ativo", "pausado", "concluido", "cancelado",
];

export const PAPEIS: Papel[] = ["gestor", "financiador", "leitor"];

export const orcamentoLabel = (tipo: ProjetoTipo) =>
  tipo === "programa_social"
    ? "Doações mensais"
    : tipo === "caixa_administrativo"
    ? "Saldo inicial"
    : "Orçamento";

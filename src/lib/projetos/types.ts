// Tipos partilhados pelo dashboard de projeto.
export type Projeto = {
  id: string;
  nome: string;
  descricao: string | null;
  estado: "planeado" | "ativo" | "pausado" | "concluido" | "cancelado";
  orcamento: number;
  moeda: string;
  data_inicio: string | null;
  data_fim: string | null;
  logo_path: string | null;
};

export type Categoria = {
  id: string;
  nome: string;
  tipo: "entrada" | "saida";
  projeto_id: string | null;
};

export type Etapa = {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  peso: number;
  progresso: number;
  valor_previsto: number;
  data_inicio: string | null;
  data_fim: string | null;
};

export type Lancamento = {
  id: string;
  tipo: "entrada" | "saida";
  data: string;
  valor: number;
  descricao: string | null;
  categoria_id: string | null;
  etapa_id: string | null;
  comprovante_path: string | null;
  created_by: string;
};

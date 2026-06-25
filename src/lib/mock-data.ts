export const kpis = {
  saldoGlobal: 8_450_230,
  receitasMes: 1_230_500,
  receitasDelta: 12.4,
  despesasMes: 945_180,
  despesasDelta: -3.1,
  projetosAtivos: 8,
  projetosPepes: 5,
  projetosObras: 3,
};

export const despesasComparativas = [
  { projeto: "Pepe Reviva", Salários: 185000, Alimentação: 142000, Infraestrutura: 38000 },
  { projeto: "Pepe Narani", Salários: 168000, Alimentação: 158000, Infraestrutura: 42000 },
  { projeto: "Pepe Emuná", Salários: 152000, Alimentação: 121000, Infraestrutura: 31000 },
  { projeto: "Pepe Yeshua", Salários: 174000, Alimentação: 138000, Infraestrutura: 35000 },
  { projeto: "Poço Inhambane", Salários: 0, Alimentação: 0, Infraestrutura: 320500 },
  { projeto: "Sala Maputo", Salários: 0, Alimentação: 0, Infraestrutura: 186400 },
];

export const distribuicaoCustos = [
  { categoria: "Salários", valor: 41 },
  { categoria: "Alimentação", valor: 32 },
  { categoria: "Infraestrutura", valor: 18 },
  { categoria: "Logística", valor: 6 },
  { categoria: "Outros", valor: 3 },
];

export type Transacao = {
  id: string;
  data: string;
  projeto: string;
  categoria: string;
  tipo: "entrada" | "saida";
  valor: number;
  comprovante: boolean;
};

export const transacoes: Transacao[] = [
  {
    id: "t1",
    data: "2026-06-24",
    projeto: "Pepe Narani",
    categoria: "Alimentação",
    tipo: "saida",
    valor: 45200,
    comprovante: true,
  },
  {
    id: "t2",
    data: "2026-06-23",
    projeto: "Pepe Reviva",
    categoria: "Padrinhos",
    tipo: "entrada",
    valor: 180000,
    comprovante: true,
  },
  {
    id: "t3",
    data: "2026-06-22",
    projeto: "Construção Poço Inhambane",
    categoria: "Materiais",
    tipo: "saida",
    valor: 320500,
    comprovante: true,
  },
  {
    id: "t4",
    data: "2026-06-21",
    projeto: "Pepe Yeshua",
    categoria: "Salários",
    tipo: "saida",
    valor: 174000,
    comprovante: true,
  },
  {
    id: "t5",
    data: "2026-06-20",
    projeto: "Pepe Emuná",
    categoria: "Mantenedor Mensal",
    tipo: "entrada",
    valor: 95000,
    comprovante: true,
  },
  {
    id: "t6",
    data: "2026-06-19",
    projeto: "Sala Aula Maputo",
    categoria: "Mão de Obra",
    tipo: "saida",
    valor: 68400,
    comprovante: false,
  },
  {
    id: "t7",
    data: "2026-06-18",
    projeto: "Pepe Narani",
    categoria: "Doação Pontual",
    tipo: "entrada",
    valor: 42500,
    comprovante: true,
  },
  {
    id: "t8",
    data: "2026-06-17",
    projeto: "Pepe Reviva",
    categoria: "Logística",
    tipo: "saida",
    valor: 18750,
    comprovante: true,
  },
];

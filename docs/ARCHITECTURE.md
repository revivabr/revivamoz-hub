# Arquitetura da Aplicação

## 1. Objetivo arquitetural

O Reviva Moz Finance Hub é uma aplicação full-stack para gestão financeira e operacional de múltiplos projetos. A arquitetura privilegia:

- isolamento de dados por projeto;
- autorização no banco de dados, não apenas na interface;
- componentes de domínio pequenos e reutilizáveis;
- funções de servidor para ações privilegiadas;
- funcionamento progressivo em desktop e telemóvel;
- rastreabilidade de alterações financeiras;
- exportação e partilha controlada de informação.

## 2. Stack

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Framework | TanStack Start v1 | Aplicação React full-stack e funções de servidor |
| Interface | React 19 + TypeScript 5.8 | Componentes e tipagem estrita |
| Build | Vite 8 | Desenvolvimento, transformação e bundle |
| Rotas | TanStack Router | Rotas baseadas em arquivos e layouts |
| Cache/dados | TanStack Query 5 | Cache, invalidação e estados assíncronos |
| Estilos | Tailwind CSS v4 | Utilitários e tokens semânticos |
| Componentes | shadcn/ui + Radix UI | Primitivos acessíveis |
| Backend | Lovable Cloud | PostgreSQL, autenticação e armazenamento |
| Gráficos | Recharts | KPIs e visualizações financeiras |
| PDF/Excel | jsPDF, AutoTable e SheetJS | Relatórios e exportações |
| IA | OpenAI, Gemini e Opencode-Go | Respostas financeiras por estratégia configurável |
| Testes | Vitest + jsdom | Testes unitários e de utilitários |

## 3. Visão em camadas

```text
Navegador
  ├─ Rotas e componentes React
  ├─ TanStack Query
  ├─ Cliente autenticado da Lovable Cloud ── RLS ─────┐
  └─ Funções de servidor tipadas ── bearer token ─────┤
                                                       ▼
Servidor TanStack Start                           PostgreSQL
  ├─ validação Zod                                  ├─ tabelas
  ├─ verificação de sessão/papel                    ├─ RLS
  ├─ integrações externas                           ├─ funções/RPC
  └─ cliente administrativo sob demanda             └─ triggers/auditoria

Serviços externos
  ├─ Provedores de IA
  ├─ Brevo
  └─ Google Drive
```

A aplicação usa dois caminhos de dados legítimos:

1. **Cliente autenticado + RLS:** consultas e mutações comuns podem usar o cliente do navegador. As políticas do banco limitam os resultados ao utilizador.
2. **Função de servidor:** usada quando há segredo, integração externa, validação privilegiada ou operação administrativa. `requireSupabaseAuth` valida a sessão e fornece um cliente no contexto do utilizador.

## 4. Bootstrap e contexto global

### `src/router.tsx`

Cria o `QueryClient`, registra a árvore gerada de rotas e ativa restauração de scroll. A árvore `src/routeTree.gen.ts` é gerada automaticamente e nunca deve ser editada manualmente.

### `src/routes/__root.tsx`

O root compartilhado fornece:

- documento HTML e metadados globais;
- `QueryClientProvider`;
- `ThemeProvider`;
- `I18nProvider`;
- tooltips e notificações toast;
- listener de mudanças de autenticação;
- instalação da sincronização da fila offline;
- limites globais de erro e página 404.

### `src/start.ts`

Registra dois middlewares:

- `attachSupabaseAuth`: anexa o token da sessão às chamadas de funções de servidor;
- `errorMiddleware`: captura erros inesperados da renderização do servidor e devolve uma página segura.

## 5. Rotas e limites de acesso

```text
src/routes/
├── __root.tsx
├── auth.tsx                         /auth
├── p.relatorio.$token.tsx           /p/relatorio/$token
├── api/public/hooks/backup.ts       /api/public/hooks/backup
└── _authenticated/
    ├── route.tsx                    layout protegido
    ├── index.tsx                    /
    ├── subprojetos.tsx              /subprojetos
    ├── projetos.$projetoId.tsx      /projetos/$projetoId
    ├── fluxo-caixa.tsx              /fluxo-caixa
    ├── relatorios.tsx               /relatorios
    ├── assistente.tsx               /assistente
    ├── inteligencia.tsx             /inteligencia
    ├── auditoria.tsx                /auditoria
    └── configuracoes.tsx            /configuracoes
```

O layout `_authenticated` desativa SSR para essa subárvore e executa `getUser()` antes de carregar uma página. Sem sessão válida, redireciona para `/auth`.

A proteção de rota não substitui a autorização de dados:

- páginas comuns recebem apenas linhas permitidas pela RLS;
- módulos de Super Admin verificam `has_role`;
- funções administrativas repetem a verificação no servidor;
- a interface esconde ações sem permissão, mas o banco continua sendo a autoridade final.

## 6. Autenticação e autorização

### Autenticação

- Apenas e-mail e palavra-passe.
- Não existe registo público.
- Contas são criadas e confirmadas por um Super Admin.
- A sessão é mantida pelo cliente de autenticação no navegador.

### Papéis

Há dois níveis separados:

- **Global:** `user_roles.role`, atualmente `super_admin`, `gestor` ou `financiador`.
- **Projeto:** `projeto_membros.papel`, com `gestor`, `financiador` ou `leitor`.

O papel global não deve ser guardado em `profiles`. As funções `has_role`, `is_projeto_member` e `is_projeto_gestor` centralizam verificações e evitam políticas recursivas.

### Hierarquia de membros

- Super Admin gerencia todos os vínculos.
- Gestor pode adicionar, alterar ou remover apenas financiadores e leitores do próprio projeto.
- Somente Super Admin pode atribuir, alterar ou remover outro gestor.

## 7. Organização do código

```text
src/
├── components/
│   ├── layout/             shell autenticado
│   ├── dashboard/          KPIs, tabelas e gráficos globais
│   ├── projetos/           lançamentos, etapas, logotipo e gráficos
│   ├── subprojetos/        cards, membros, convites e criação
│   ├── configuracoes/      IA e categorias
│   ├── notifications/      sino e lista de notificações
│   └── ui/                 primitivos do design system
├── lib/
│   ├── projetos/           queries, tipos e totais
│   ├── subprojetos/        queries e tipos
│   ├── ai/                 estratégias dos provedores
│   ├── stats/              regressão, z-score e agregação mensal
│   ├── *.functions.ts      funções de servidor importáveis pelo cliente
│   ├── offline-queue.ts    fila local
│   ├── pdf-*.ts            cabeçalho e Markdown em PDF
│   ├── i18n.tsx            idiomas
│   └── theme.tsx           tema
└── integrations/           integração gerada da Lovable Cloud
```

Os arquivos `src/integrations/supabase/*` são gerados e não devem ser alterados manualmente.

## 8. Fluxos de dados

### 8.1 Consulta comum

```text
Componente
  → useQuery/queryOptions
  → cliente autenticado
  → SELECT/RPC
  → RLS filtra por sessão e projeto
  → cache do TanStack Query
  → interface
```

Exemplos: projetos, categorias, etapas, lançamentos, membros e convites.

### 8.2 Ação privilegiada

```text
Componente
  → createServerFn
  → token anexado por functionMiddleware
  → requireSupabaseAuth
  → Zod valida entrada
  → has_role/is_projeto_member
  → operação permitida
  → resultado tipado
  → invalidação do cache
```

Exemplos: criar utilizador, redefinir palavra-passe, testar provedor, executar backup e consultar auditoria.

### 8.3 Cliente administrativo

O cliente que ignora RLS é importado dinamicamente dentro do handler e apenas depois da verificação do chamador. É usado para tarefas como:

- administração de contas de autenticação;
- leitura segura da chave do provedor de IA;
- exportação completa no endpoint de backup.

Ele nunca é importado por componentes do navegador.

## 9. Módulos do domínio

### Painel global

Agrega os projetos visíveis e seus lançamentos. Calcula entradas, saídas, saldo, volume, evolução mensal e indicadores de saúde financeira. A RLS determina quais projetos entram na agregação.

### Projetos Ativos

Modela três tipos:

- `programa_social`: operação recorrente e doações mensais;
- `projeto_sazonal`: orçamento e período definidos;
- `caixa_administrativo`: gestão de caixa institucional.

O logotipo do projeto é armazenado de forma privada e apresentado em proporção 16:9; quando não existe, o nome serve como fallback.

### Painel do projeto

Reúne KPIs, lançamentos, gráficos por categoria e etapas. O formulário compartilhado de lançamento é usado na criação e edição. A edição pode alterar tipo, data, valor, categoria, etapa, descrição e comprovativo. O trigger de auditoria registra os valores anterior e novo.

### Categorias

Consultas combinam categorias globais (`projeto_id IS NULL`) e categorias do projeto. Apenas Super Admin cria ou remove categorias. Há uma categoria global `Não sei` para entrada e outra para saída, permitindo classificar posteriormente.

### Relatórios

- PDF e Excel são gerados no cliente.
- PDFs usam cabeçalho institucional com logotipo da Reviva Moz e do projeto.
- Partilhas criam um token aleatório, período, validade e flag de revogação.
- O portal público lê somente por `get_relatorio_publico(token)`.

### Assistente de IA

`src/lib/ai/providers.ts` implementa Strategy Pattern para OpenAI, Gemini e Opencode-Go. O provedor ativo é definido pelo Super Admin.

A função `assistenteAsk`:

1. carrega projetos e até 300 lançamentos permitidos pela RLS;
2. gera um resumo financeiro;
3. monta o prompt da “Aida” em português de Moçambique;
4. pede resposta em Markdown controlado;
5. guarda a conversa do próprio utilizador.

O histórico mostra até 50 conversas atualizadas nos últimos sete dias. Registos antigos são removidos de forma best-effort quando a lista é consultada. O PDF da conversa interpreta títulos, listas e tabelas Markdown.

### Inteligência

- Regressão linear para tendência mensal.
- Z-score para anomalias.
- Sumário executivo pelo provedor de IA ativo.
- Análise de distribuição por categoria.

### Notificações

Combina tabela `notificacoes`, sino na interface e envio por Brevo. O navegador vê apenas notificações do utilizador autenticado.

### Auditoria

O trigger `audit_trigger` registra alterações em entidades críticas. A página `/auditoria` é exclusiva do Super Admin e permite filtros por tabela, projeto e ator.

### Backups

O endpoint `/api/public/hooks/backup`:

1. valida a chave enviada pelo chamador programado;
2. cria um registo `running`;
3. exporta as tabelas administrativas para JSON;
4. grava no bucket privado `backups`;
5. tenta espelhar o arquivo no Google Drive;
6. atualiza contagens, tamanho e estado do trabalho.

Execuções automáticas são previstas às 12:00 e 22:00 de Maputo. O Super Admin também pode iniciar uma execução e obter um link temporário de download.

### PWA e operação offline

O manifesto e os ícones permitem instalar a aplicação. A fila offline cobre **novos lançamentos sem comprovativo**:

- salva o payload em `localStorage`;
- tenta sincronizar ao evento `online`;
- repete a tentativa a cada 60 segundos;
- mantém na fila itens que falharam.

A fila não é um banco offline completo: páginas e dados existentes ainda dependem de rede/cache, e conflitos não são mesclados automaticamente.

## 10. Segurança por desenho

- RLS ativada em todas as tabelas públicas.
- GRANTs explícitos para os papéis necessários.
- Funções `SECURITY DEFINER` internas sem execução para `PUBLIC` ou `anon`.
- Única exceção anónima: relatório público validado por token.
- Chaves de IA nunca são devolvidas ao navegador.
- Buckets privados e links assinados com expiração.
- Alterações financeiras e administrativas auditáveis.
- Validação de entrada com Zod nas funções de servidor.

## 11. Testes e observabilidade

Os testes cobrem formatação, estatística, totais, fila offline, modelos de IA e utilitários. Erros globais passam pelo boundary do TanStack Router e pelo middleware do servidor. Falhas de persistência do histórico da IA são registradas sem perder necessariamente a resposta já obtida.

Comandos:

```bash
bun run test
bun run test:coverage
bun run lint
```

## 12. Decisões e limites conhecidos

- O shell autenticado usa `ssr: false` por depender da sessão do navegador.
- Consultas comuns usam diretamente o cliente autenticado quando RLS é suficiente; operações privilegiadas usam funções de servidor.
- A busca no cabeçalho é atualmente um elemento visual, sem pesquisa global conectada.
- Apenas um provedor de IA deve permanecer ativo por vez; a exclusividade é controlada pela aplicação.
- A sincronização offline cobre criação de lançamentos, não edição, anexos ou todo o sistema.
- `docs/sql/complete-schema.sql` é um snapshot auxiliar; as migrations incrementais são a referência do ambiente atual.

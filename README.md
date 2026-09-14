# Reviva Moz Finance Hub

Aplicação interna da **Associação Reviva Moz** para gestão financeira, acompanhamento de projetos sociais, prestação de contas, relatórios para financiadores e análise assistida por IA.

O sistema centraliza programas sociais, projetos sazonais e caixas administrativos num ambiente multiutilizador. Cada pessoa vê apenas os projetos aos quais tem acesso; operações administrativas e dados sensíveis são protegidos por autenticação, papéis e políticas no banco de dados.

## Principais funcionalidades

- Painel global com indicadores, evolução mensal e saúde financeira por projeto.
- Gestão de programas sociais, projetos sazonais e caixas administrativos.
- Entradas e saídas com categoria, etapa, descrição e comprovativo.
- Edição posterior de lançamentos, com registo de alterações no trilho de auditoria.
- Categorias globais ou específicas por projeto, geridas pelo Super Admin.
- Cronograma físico-financeiro com etapas, pesos e progresso.
- Relatórios em PDF e Excel, com cabeçalho institucional e logotipos.
- Portal público de relatório para doadores, protegido por token e expiração.
- Assistente de IA com contexto financeiro, Markdown, histórico de sete dias e PDF.
- Notificações dentro da aplicação e por e-mail.
- Auditoria administrativa, exportação de dados e backups automáticos.
- Aplicação instalável no telemóvel, com fila offline para novos lançamentos.
- Tema claro/escuro e português de Moçambique ou do Brasil.

## Perfis de acesso

| Perfil | Âmbito principal |
| --- | --- |
| **Super Admin** | Administração global, utilizadores, projetos, categorias, IA, auditoria e backups |
| **Gestor** | Gestão financeira e operacional dos projetos onde possui papel de gestor |
| **Financiador** | Consulta dos projetos aos quais foi associado |
| **Leitor** | Consulta sem permissões de alteração |

Um utilizador pode pertencer a vários projetos sem duplicação de conta. Os papéis globais ficam separados das associações por projeto.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Aplicação full-stack | TanStack Start v1, React 19 e TypeScript 5.8 |
| Build | Vite 8 |
| Interface | Tailwind CSS v4, shadcn/ui, Radix UI e Lucide |
| Rotas | TanStack Router, baseado em arquivos |
| Dados no cliente | TanStack Query |
| Backend | Lovable Cloud: PostgreSQL, autenticação e armazenamento |
| Lógica de servidor | Funções de servidor tipadas do TanStack Start |
| Gráficos | Recharts |
| Relatórios | jsPDF, jspdf-autotable e SheetJS |
| IA | Estratégias para OpenAI, Gemini e Opencode-Go |
| Testes | Vitest e jsdom |

## Estrutura principal

```text
src/
├── routes/                 páginas, layout protegido e endpoint de backup
├── components/             interface compartilhada e módulos do domínio
├── lib/                    regras, consultas, funções de servidor e utilitários
├── integrations/           clientes gerados da Lovable Cloud
├── hooks/                  hooks React reutilizáveis
└── styles.css              tokens visuais e temas
supabase/migrations/        histórico incremental do banco de dados
docs/                       documentação técnica e operacional
docs/sql/                   snapshots auxiliares para auditoria/recriação
public/                     manifesto, favicon e ícones da PWA
```

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Índice da documentação](docs/README.md) | Mapa completo dos guias |
| [Arquitetura](docs/ARCHITECTURE.md) | Camadas, fluxos, módulos, rotas e decisões técnicas |
| [Design](docs/DESIGN.md) | Identidade visual, tokens, componentes, responsividade e acessibilidade |
| [Banco de dados](docs/DATABASE.md) | Modelo, relações, RLS, funções, triggers e armazenamento |
| [Segurança](docs/SECURITY.md) | Autenticação, autorização, segredos e práticas operacionais |
| [Funcionalidades](docs/FEATURES.md) | Comportamento de cada módulo |
| [Manual do utilizador](docs/USER_GUIDE.md) | Operação por perfil |
| [Deployment](docs/DEPLOYMENT.md) | Publicação, configuração e verificações |
| [Migrations](docs/MIGRATIONS.md) | Ordem e manutenção das alterações SQL |
| [Dados de demonstração](docs/DEMO_DATA.md) | Regras e utilização dos dados de exemplo |

## Desenvolvimento local

### Requisitos

- Bun recente.
- Acesso às variáveis do projeto Lovable Cloud.
- Uma conta criada por um Super Admin; não existe registo público.

### Instalação

```bash
bun install
bun run dev
```

O servidor de desenvolvimento usa Vite. As variáveis públicas do cliente são fornecidas pela integração do projeto; segredos administrativos nunca devem ser colocados no código ou enviados ao navegador.

### Comandos

```bash
bun run dev            # desenvolvimento
bun run test           # testes unitários
bun run test:watch     # testes em modo interativo
bun run test:coverage  # cobertura
bun run lint           # análise estática
bun run format         # formatação
bun run build          # build de produção
bun run preview        # visualizar build local
```

## Rotas da aplicação

| URL | Acesso | Finalidade |
| --- | --- | --- |
| `/auth` | Público | Login por e-mail e palavra-passe |
| `/` | Autenticado | Painel global |
| `/subprojetos` | Autenticado | Projetos Ativos |
| `/projetos/$projetoId` | Autenticado e membro | Painel de um projeto |
| `/fluxo-caixa` | Autenticado | Visão transversal dos lançamentos permitidos |
| `/relatorios` | Autenticado | Relatórios e partilhas |
| `/assistente` | Autenticado | Assistente financeiro com IA |
| `/inteligencia` | Super Admin | Previsões e anomalias |
| `/auditoria` | Super Admin | Trilho de auditoria e backups |
| `/configuracoes` | Super Admin | Utilizadores, categorias e provedores de IA |
| `/p/relatorio/$token` | Público por token | Relatório partilhado com expiração |

## Segurança

- Não há criação pública de contas; credenciais são definidas pelo Super Admin.
- Todas as tabelas de negócio utilizam Row Level Security e permissões explícitas.
- Papéis globais ficam em `user_roles`; papéis por projeto em `projeto_membros`.
- Gestores não podem atribuir ou remover o papel `gestor`; isso é exclusivo do Super Admin.
- O navegador nunca recebe a credencial administrativa do backend.
- Funções privilegiadas verificam a sessão e o papel no servidor.
- O único acesso anónimo a dados de negócio é a função de relatório público, que valida token, expiração e revogação.
- Backups e comprovativos ficam em áreas privadas e são servidos por links temporários.

Consulte [Segurança](docs/SECURITY.md) e [Banco de dados](docs/DATABASE.md) antes de alterar permissões ou funções privilegiadas.

## Publicação

A publicação é feita pelo fluxo de publicação do Lovable. O domínio principal é:

- `https://hub.revivamoz.com`

Antes de publicar, execute os testes e confirme o checklist de [deployment](docs/DEPLOYMENT.md). Alterações de banco devem ser feitas por migrations incrementais; não altere manualmente o histórico já aplicado.

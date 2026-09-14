# Documentação — Reviva Moz Finance Hub

Esta pasta reúne a documentação técnica, funcional e operacional da aplicação interna da Associação Reviva Moz.

## Comece por aqui

| Ordem | Documento | Para quem | Conteúdo |
| ---: | --- | --- | --- |
| 1 | [README principal](../README.md) | Todos | Visão geral, stack, instalação e comandos |
| 2 | [Arquitetura](./ARCHITECTURE.md) | Desenvolvimento e manutenção | Camadas, rotas, fluxos e decisões técnicas |
| 3 | [Design](./DESIGN.md) | Produto e interface | Identidade, tokens, componentes e responsividade |
| 4 | [Banco de dados](./DATABASE.md) | Backend e segurança | Tabelas, relações, RLS, funções, triggers e storage |
| 5 | [Segurança](./SECURITY.md) | Administração e desenvolvimento | Acesso, papéis, segredos, auditoria e backups |
| 6 | [Funcionalidades](./FEATURES.md) | Produto e QA | Comportamento dos módulos |
| 7 | [Manual do utilizador](./USER_GUIDE.md) | Utilizadores finais | Procedimentos por perfil |
| 8 | [Deployment](./DEPLOYMENT.md) | Operações | Publicação, configuração e checklist |
| 9 | [Migrations](./MIGRATIONS.md) | Backend | Evolução incremental e ordem SQL |
| 10 | [Dados de demonstração](./DEMO_DATA.md) | QA e demonstrações | Identificação e uso seguro de dados de exemplo |

## Visão rápida

| Área | Implementação atual |
| --- | --- |
| Aplicação | TanStack Start v1, React 19, TypeScript e Vite 8 |
| Interface | Tailwind CSS v4, tokens OKLCH, shadcn/ui e Radix UI |
| Backend | Lovable Cloud com PostgreSQL, autenticação e armazenamento |
| Segurança | RLS em todas as tabelas públicas, papéis globais e por projeto |
| Dados | TanStack Query, cliente autenticado e funções de servidor tipadas |
| IA | OpenAI, Gemini ou Opencode-Go por Strategy Pattern |
| Relatórios | PDF, Excel e portal público por token |
| Operação | Notificações, auditoria, backups e fila offline |
| Idiomas | `pt-MZ` padrão e `pt-BR` |
| Testes | Vitest, jsdom e cobertura V8 |

## Princípios documentais

- O código e as migrations aplicadas são a fonte de verdade.
- `supabase/migrations/` representa a evolução incremental do ambiente atual.
- `docs/sql/` é um snapshot auxiliar e deve ser revisto antes de recriar um ambiente.
- Nunca incluir palavras-passe, chaves privadas, tokens de sessão ou credenciais administrativas.
- Atualizar estes guias quando um fluxo, papel, tabela, rota ou integração mudar.
- Termos apresentados ao utilizador seguem português de Moçambique sempre que possível.

## Estado dos guias principais

- **Arquitetura:** atualizado com o fluxo híbrido de consultas diretas protegidas por RLS e funções de servidor.
- **Design:** guia criado para consolidar o sistema visual existente.
- **Banco de dados:** atualizado com categorias exclusivas do Super Admin, edição auditada de lançamentos e permissões endurecidas.

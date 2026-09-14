# Banco de Dados

## 1. Visão geral

O backend usa PostgreSQL gerido pelo Lovable Cloud. Dados de negócio ficam no schema `public`; autenticação e armazenamento são serviços geridos pela plataforma.

Princípios:

- Row Level Security ativa em todas as tabelas públicas;
- GRANTs explícitos para `authenticated`, `anon` somente quando necessário e `service_role`;
- isolamento multi-tenant por associação em `projeto_membros`;
- papéis globais separados em `user_roles`;
- funções `SECURITY DEFINER` com `search_path` fixo e execução restrita;
- trilho de auditoria para alterações críticas;
- arquivos em buckets privados e acesso por links assinados.

As migrations incrementais em `supabase/migrations/` são a referência do ambiente atual. Os arquivos em `docs/sql/` são snapshots auxiliares e precisam ser mantidos alinhados antes de uma instalação nova.

## 2. Modelo de alto nível

```text
Identidade gerida
  └── utilizador
      ├── profiles (1:1)
      ├── user_roles (N)
      ├── assistente_conversas (N)
      ├── notificacoes (N)
      ├── projetos.created_by (N)
      └── projeto_membros (N:N com projetos)

projetos
  ├── projeto_membros
  ├── projeto_convites
  ├── categorias específicas
  ├── etapas
  ├── lancamentos
  │   ├── categoria opcional
  │   └── etapa opcional
  └── relatorio_partilhas

categorias globais
  └── projeto_id = NULL, visíveis em todos os projetos

Operação global
  ├── ai_provedores
  ├── audit_log
  ├── backup_runs
  └── super_admin_seed
```

## 3. Tipos enumerados

| Enum | Valores | Uso |
| --- | --- | --- |
| `app_role` | `super_admin`, `gestor`, `financiador` | Papel global em `user_roles` |
| `projeto_papel` | `gestor`, `financiador`, `leitor` | Papel dentro de um projeto |
| `projeto_estado` | `planeado`, `ativo`, `pausado`, `concluido`, `cancelado` | Ciclo de vida do projeto |
| `projeto_tipo` | `programa_social`, `projeto_sazonal`, `caixa_administrativo` | Modelo financeiro/operacional |
| `lancamento_tipo` | `entrada`, `saida` | Natureza da transação e categoria |
| `convite_estado` | `pendente`, `aceite`, `revogado` | Estado de convite |
| `ai_provedor_tipo` | `openai`, `gemini`, `opencode_go` | Estratégia do provedor de IA |

## 4. Tabelas de identidade e acesso

### `profiles`

Dados de apresentação do utilizador:

| Coluna | Descrição |
| --- | --- |
| `id` | Identificador igual ao utilizador autenticado |
| `full_name` | Nome apresentado |
| `avatar_url` | Avatar opcional |
| `phone` | Contacto opcional |
| `language` | Idioma preferido |
| `position` | Função/cargo |
| `created_at`, `updated_at` | Auditoria temporal |

O utilizador pode ler e atualizar o próprio perfil; Super Admin pode consultar perfis necessários à administração. Exclusão direta não é permitida pela política pública.

### `user_roles`

Associa utilizador a papel global. A combinação `(user_id, role)` é única.

Regras:

- papéis nunca ficam em `profiles`;
- `has_role()` consulta esta tabela com privilégio controlado;
- apenas fluxos administrativos podem conceder `super_admin`;
- o navegador não decide sozinho se alguém é administrador.

### `super_admin_seed`

Lista temporária de e-mails pré-autorizados para promoção no primeiro fluxo de criação/login. A criação atual de Super Admin também pode criar/atualizar diretamente a conta, conceder `user_roles` e remover a pendência.

## 5. Tabelas de projetos

### `projetos`

| Coluna | Descrição |
| --- | --- |
| `id` | UUID do projeto |
| `nome`, `descricao` | Identificação e resumo |
| `tipo` | Programa social, projeto sazonal ou caixa administrativo |
| `estado` | Estado operacional |
| `data_inicio`, `data_fim` | Período opcional |
| `orcamento` | Valor de referência |
| `moeda` | Código monetário usado na apresentação |
| `logo_path` | Caminho privado do logotipo |
| `created_by` | Autor da criação |
| `created_at`, `updated_at` | Datas de sistema |

Leitura é permitida a membros e Super Admin. Criação é administrativa; alterações respeitam Super Admin ou gestor conforme a política aplicada.

### `projeto_membros`

Tabela de associação N:N:

| Coluna | Descrição |
| --- | --- |
| `id` | UUID do vínculo |
| `projeto_id` | Projeto |
| `user_id` | Utilizador |
| `papel` | `gestor`, `financiador` ou `leitor` |
| `created_at` | Data do vínculo |

A combinação `(projeto_id, user_id)` é única.

Proteção contra escalada:

- Super Admin gerencia qualquer vínculo;
- gestor do projeto pode inserir, atualizar e remover apenas linhas cujo papel não seja `gestor`;
- atribuição, alteração ou remoção de gestores é exclusiva do Super Admin;
- membros podem ler os vínculos permitidos para o projeto.

### `projeto_convites`

Convite por e-mail antes ou depois da criação da conta:

- `projeto_id`, `email`, `papel`, `estado`;
- `convidado_por`, `created_at`, `accepted_at`;
- `accept_projeto_convite` conclui a associação validada;
- `handle_new_user` pode aceitar automaticamente convite compatível no cadastro.

## 6. Estrutura financeira

### `categorias`

| Coluna | Descrição |
| --- | --- |
| `id` | UUID |
| `projeto_id` | `NULL` para global ou UUID para específica |
| `tipo` | `entrada` ou `saida` |
| `nome` | Nome exibido |
| `cor`, `icone` | Metadados visuais opcionais |
| `created_at`, `updated_at` | Datas de sistema |

Regras atuais:

- todos os utilizadores autorizados podem ler categorias globais e do projeto;
- **somente Super Admin** cria, altera ou remove categorias;
- a configuração permite escolher escopo global ou projeto específico;
- há uma categoria global `Não sei` para entrada e outra para saída;
- o formulário filtra categorias pelo tipo do lançamento.

### `etapas`

Cronograma físico-financeiro:

- `projeto_id`, `nome`, `descricao`, `ordem`;
- `peso`, `progresso`, `valor_previsto`;
- `data_inicio`, `data_fim`;
- timestamps.

O progresso agregado é calculado na aplicação com base no peso e progresso das etapas. Etapas podem ser associadas aos lançamentos.

### `lancamentos`

| Coluna | Descrição |
| --- | --- |
| `id` | UUID |
| `projeto_id` | Projeto proprietário |
| `tipo` | Entrada ou saída |
| `data` | Data financeira |
| `valor` | Valor positivo |
| `descricao` | Texto opcional |
| `categoria_id` | Categoria opcional compatível |
| `etapa_id` | Etapa opcional do projeto |
| `comprovante_path` | Caminho privado do anexo |
| `created_by` | Autor original |
| `is_demo` | Identifica linha de demonstração |
| `created_at`, `updated_at` | Datas de sistema |

Gestores e Super Admin podem criar, editar e remover conforme a associação. Financiadores e leitores têm acesso de consulta.

A edição posterior pode alterar dados financeiros e substituir/remover comprovativo. O trigger de auditoria registra `old_data` e `new_data`, permitindo reconstruir o que mudou.

## 7. Relatórios e partilhas

### `relatorio_partilhas`

| Coluna | Descrição |
| --- | --- |
| `projeto_id` | Projeto do relatório |
| `token` | Token aleatório único |
| `data_inicio`, `data_fim` | Período |
| `expires_at` | Validade |
| `revoked` | Revogação manual |
| `created_by` | Criador |
| `created_at`, `updated_at` | Datas |

Não há leitura anónima direta da tabela. O portal chama `get_relatorio_publico(token)`, que:

1. procura token válido;
2. rejeita revogado ou expirado;
3. devolve somente o projeto, período, totais e lançamentos necessários;
4. não expõe autores nem linhas de outros projetos.

Essa função é o único ponto de execução concedido a `anon` entre as funções privilegiadas do domínio.

## 8. IA e conversas

### `ai_provedores`

Uma linha por provedor:

- `provedor` como chave;
- `api_key` secreta;
- `default_model`;
- `base_url` opcional;
- `enabled`;
- `updated_at`, `updated_by`.

A tabela é restrita ao Super Admin. Listagens públicas para utilizadores autenticados retornam apenas metadados, nunca a chave. O cliente administrativo lê a chave dentro da função de servidor no momento da chamada.

A aplicação mantém apenas um provedor ativo por vez. Essa exclusividade é regra operacional da interface e deve ser preservada em futuras alterações.

### `assistente_conversas`

| Coluna | Descrição |
| --- | --- |
| `id` | UUID |
| `user_id` | Proprietário |
| `titulo` | Primeira pergunta, limitada pela aplicação |
| `mensagens` | Array JSON de mensagens |
| `created_at`, `updated_at` | Datas |

Cada utilizador acessa somente as próprias conversas. A listagem remove, de forma best-effort, conversas com mais de sete dias desde a última atualização. A função `cleanup_assistente_conversas()` existe para manutenção e não é executável pelo público.

## 9. Notificações, auditoria e backups

### `notificacoes`

- pertence a `user_id`;
- inclui `titulo`, `mensagem`, `tipo` e `link` opcional;
- `lida` controla o badge;
- `email_enviado` registra o canal externo;
- utilizadores podem ler e marcar as próprias notificações;
- inserção é feita por fluxo de servidor autorizado.

### `audit_log`

Registro append-only produzido por trigger:

| Campo | Conteúdo |
| --- | --- |
| `actor_id`, `actor_email` | Sessão responsável, quando disponível |
| `table_name`, `operation` | Entidade e INSERT/UPDATE/DELETE |
| `record_id`, `projeto_id` | Contexto da linha |
| `old_data`, `new_data` | Snapshot JSON antes/depois |
| `created_at` | Momento da mudança |

O cliente não insere, atualiza nem remove linhas diretamente. A leitura administrativa é feita pela função `listAuditLog` após verificar `super_admin`.

### `backup_runs`

Registra cada backup:

- gatilho (`cron` ou `manual`), estado e tempos;
- caminho e tamanho do arquivo;
- contagem de projetos e lançamentos;
- erro principal;
- identificador, URL e erro do espelhamento no Drive.

O histórico é somente leitura para o Super Admin; atualizações são executadas pelo endpoint privilegiado.

## 10. Funções do banco

| Função | Finalidade | Execução |
| --- | --- | --- |
| `has_role(user, role)` | Verificar papel global sem recursão RLS | `authenticated` |
| `is_projeto_member(user, projeto)` | Verificar associação | `authenticated` |
| `is_projeto_gestor(user, projeto)` | Verificar gestão ou privilégio equivalente | `authenticated` |
| `accept_projeto_convite(id)` | Aceitar convite do chamador | `authenticated` |
| `get_relatorio_publico(token)` | Ler relatório válido por token | `anon`, `authenticated` |
| `grant_super_admin_by_email(email)` | Conceder papel administrativo | `authenticated`, com validação interna |
| `revoke_super_admin_by_email(email)` | Revogar papel administrativo | `authenticated`, com validação interna |
| `list_super_admins()` | Estado de administradores/seeds | `authenticated`, com validação interna |
| `list_ai_provedores_publico()` | Metadados sem chave | `authenticated` |
| `handle_new_user()` | Criar perfil/aplicar seed/convites | trigger interno |
| `audit_trigger()` | Escrever auditoria | trigger interno |
| `update_updated_at_column()` | Atualizar timestamps | trigger interno |
| `cleanup_assistente_conversas()` | Limpeza de histórico | manutenção interna |

Funções internas de trigger/manutenção têm execução revogada de `PUBLIC`, `anon` e `authenticated`. Funções chamadas pela aplicação têm execução apenas para o papel necessário e ainda aplicam suas próprias validações.

## 11. Row Level Security

Padrões principais:

### Super Admin

```sql
public.has_role(auth.uid(), 'super_admin')
```

Concede visão global somente onde a política define essa exceção.

### Membro do projeto

```sql
public.is_projeto_member(auth.uid(), projeto_id)
```

Usado em leituras de projetos, lançamentos, etapas e recursos relacionados.

### Gestor do projeto

```sql
public.is_projeto_gestor(auth.uid(), projeto_id)
```

Usado em escrita operacional. Em `projeto_membros`, é combinado com `papel <> 'gestor'` para evitar escalada.

### Proprietário

Conversas, notificações e perfil usam comparação com `auth.uid()`.

### Público por token

Não existe política direta de `SELECT` anónimo em `relatorio_partilhas`. O acesso ocorre pela função específica, que devolve um JSON filtrado.

## 12. Triggers

- `handle_new_user`: após criação de identidade, cria perfil, aplica promoção pré-autorizada e aceita convites compatíveis.
- `update_updated_at_column`: mantém `updated_at` em tabelas mutáveis.
- `audit_trigger`: registra operações em `lancamentos`, `projetos`, `etapas`, `projeto_membros` e `categorias`.

Alterar um lançamento existente gera uma linha `UPDATE` no trilho com snapshots anterior e posterior.

## 13. Armazenamento

| Bucket | Público | Conteúdo | Acesso |
| --- | --- | --- | --- |
| `comprovantes` | Não | JPG, PNG e PDF dos lançamentos | Membros autorizados, via política/link assinado |
| `projeto-logos` | Não | JPG, PNG ou SVG 16:9 | Membros leem; gestão autorizada |
| `backups` | Não | Dumps JSON | Super Admin por link de cinco minutos |

O caminho armazenado na tabela não é uma URL pública. A aplicação gera URL temporária somente após autorização.

## 14. Backups

O dump atual inclui:

- `profiles`, `user_roles`;
- `projetos`, `projeto_membros`, `projeto_convites`;
- `categorias`, `etapas`, `lancamentos`;
- `relatorio_partilhas`, `ai_provedores`, `notificacoes`, `audit_log`.

O JSON é salvo por ano/mês no bucket `backups` e o espelhamento no Google Drive é best-effort. Falha no Drive não apaga o backup principal; o erro fica registrado em `backup_runs`.

## 15. Evolução do schema

Regras obrigatórias para novas migrations:

1. Criar tabela.
2. Conceder GRANTs adequados na mesma migration.
3. Ativar RLS.
4. Criar políticas específicas por operação e papel.
5. Incluir `service_role` quando houver função administrativa legítima.
6. Evitar `anon` salvo para dados realmente públicos.
7. Usar trigger, não `CHECK`, para regras dependentes de tempo.
8. Fixar `search_path` em funções `SECURITY DEFINER`.
9. Revogar execução ampla antes de conceder apenas aos papéis necessários.
10. Atualizar este documento, o snapshot consolidado e os tipos gerados quando aplicável.

## 16. Observações sobre recriação

Para o ambiente atual, aplicar as migrations na ordem é mais seguro do que confiar isoladamente no snapshot consolidado. O snapshot `docs/sql/complete-schema.sql` pode ficar atrás de migrations recentes de endurecimento; antes de usá-lo, confirme especialmente:

- políticas de `projeto_membros` que impedem gestores de gerir gestores;
- categorias exclusivas do Super Admin;
- revogações de funções `SECURITY DEFINER`;
- acesso anónimo somente a `get_relatorio_publico`.

Consulte [Migrations](./MIGRATIONS.md) e [Segurança](./SECURITY.md).

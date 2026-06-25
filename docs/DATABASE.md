# Base de Dados

Postgres gerido pelo Lovable Cloud (Supabase). Todas as tabelas vivem em
`public`, com **RLS ativa** e **GRANTs explícitos**.

## Diagrama (alto nível)

```
auth.users
   │
   ├──< profiles (1-1)
   ├──< user_roles (n: super_admin | gestor | financiador)
   ├──< super_admin_seed (email pré-aprovado)
   │
   └──< projetos (created_by)
           ├──< projeto_membros (papel: gestor|financiador|leitor)
           ├──< projeto_convites
           ├──< categorias        (tipo: entrada|saida)
           ├──< etapas            (cronograma físico, peso, progresso)
           ├──< lancamentos       (tipo, valor, comprovante_path, categoria, etapa)
           └──< relatorio_partilhas (token público, expira)

ai_provedores         (singleton por provedor, 1 ativo por vez)
assistente_conversas  (chat IA por utilizador)
notificacoes          (in-app + email Brevo)
audit_log             (triggers em lancamentos, projetos, etapas, …)
backup_runs           (cron 12:00 / 22:00, mirror Google Drive)
```

## Enums

| Enum | Valores |
| --- | --- |
| `app_role` | `super_admin`, `gestor`, `financiador` |
| `projeto_papel` | `gestor`, `financiador`, `leitor` |
| `projeto_estado` | `planeado`, `ativo`, `pausado`, `concluido`, `cancelado` |
| `projeto_tipo` | `programa_social`, `projeto_sazonal`, `caixa_administrativo` |
| `lancamento_tipo` | `entrada`, `saida` |
| `convite_estado` | `pendente`, `aceite`, `revogado` |
| `ai_provedor_tipo` | `openai`, `gemini`, `opencode_go` |

## Tabelas (colunas-chave)

### `profiles` (1-1 com `auth.users`)
`id (PK→auth.users)`, `full_name`, `avatar_url`, `phone`, `language`, `position`.

### `user_roles`
`user_id`, `role` (`app_role`). Unique `(user_id, role)`. Usado por `has_role()`.

### `super_admin_seed`
`email (PK)`. Lista de e-mails que serão promovidos a `super_admin`
automaticamente no signup (trigger `handle_new_user`).

### `projetos`
`nome`, `descricao`, `tipo`, `estado`, `data_inicio`, `data_fim`, `orcamento`,
`moeda` (default `EUR`), `logo_path`, `created_by`.

### `projeto_membros`
`projeto_id`, `user_id`, `papel`. Unique `(projeto_id, user_id)`.

### `projeto_convites`
`projeto_id`, `email`, `papel`, `estado`. Auto-aceitos no signup pelo trigger.

### `categorias`
`projeto_id` (NULL = global), `tipo`, `nome`, `cor`, `icone`.

### `etapas`
`projeto_id`, `nome`, `ordem`, `peso`, `progresso`, `valor_previsto`,
`data_inicio`, `data_fim`.

### `lancamentos`
`projeto_id`, `tipo`, `data`, `valor`, `descricao`, `categoria_id`, `etapa_id`,
`comprovante_path`, `created_by`.

### `relatorio_partilhas`
`projeto_id`, `token` (gerado), `data_inicio`, `data_fim`, `expires_at`,
`revoked`. Lido via RPC `get_relatorio_publico(token)`.

### `notificacoes`
`user_id`, `titulo`, `mensagem`, `tipo`, `link`, `lida`, `email_enviado`.

### `audit_log`
Preenchida pelo trigger `audit_trigger()` em
`lancamentos`, `projetos`, `etapas`, `projeto_membros`, `categorias`.

### `backup_runs`
Histórico de execuções de backup com `status`, `file_path`, `size_bytes`,
contagens, e `drive_file_id`/`drive_url`/`drive_error` para espelhamento.

### `ai_provedores`
`provedor (PK)`, `api_key`, `default_model`, `base_url`, `enabled`. Apenas 1
linha pode ter `enabled=true` (regra de aplicação no `AiProvedoresCard`).

### `assistente_conversas`
`user_id`, `titulo`, `mensagens jsonb`. Histórico do chat IA.

## Funções SECURITY DEFINER

- `has_role(uuid, app_role)` — verifica papel global.
- `is_projeto_member(uuid, uuid)` — membro do projeto.
- `is_projeto_gestor(uuid, uuid)` — gestor do projeto.
- `handle_new_user()` — trigger em `auth.users` (cria profile, aplica seed,
  auto-aceita convites).
- `grant_super_admin_by_email`, `revoke_super_admin_by_email`,
  `list_super_admins` — gestão de super admins pelo super admin.
- `accept_projeto_convite(uuid)` — aceitar convite manual.
- `get_relatorio_publico(text)` — leitura do portal público (token).
- `list_ai_provedores_publico()` — meta dos provedores (sem API key).
- `audit_trigger()` — popula `audit_log`.
- `update_updated_at_column()` — trigger genérico de timestamp.

## Storage Buckets

| Bucket | Pública | Uso |
| --- | --- | --- |
| `comprovantes` | Não | comprovativos de `lancamentos` (signed URLs) |
| `projeto-logos` | Não | logo 16:9 dos projetos |
| `backups` | Não | snapshots JSON do cron |

## Cron Jobs (pg_cron)

| Hora (Maputo) | Ação |
| --- | --- |
| 10:00 UTC (12:00 local) | `POST /api/public/hooks/backup` |
| 20:00 UTC (22:00 local) | `POST /api/public/hooks/backup` |

## Recriar do Zero

```bash
# 1. Schema completo
psql "$DATABASE_URL" -f docs/sql/complete-schema.sql

# 2. Seed opcional (super admin + projetos base)
psql "$DATABASE_URL" -f docs/sql/seed.sql
```

> O snapshot consolidado **não substitui** os ficheiros em
> `supabase/migrations/`. Estes existem para o pipeline incremental do projeto
> atual. O snapshot serve para clonar a base num novo ambiente.

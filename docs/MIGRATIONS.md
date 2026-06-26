# Migrations

Tudo o que precisas para recriar a base do zero ou auditar o esquema atual está
em `docs/sql/`:

| Ficheiro | Quando correr | O que faz |
|---|---|---|
| `complete-schema.sql` | 1º — sempre | Extensions, enums, tabelas, RLS, funções `SECURITY DEFINER`, triggers de updated_at e audit. |
| `storage.sql` | 2º | Cria buckets (`comprovantes`, `projeto-logos`, `backups`) e suas policies. |
| `seed.sql` | 3º (opcional) | Insere super admin "rafaelcvn@gmail.com", os 12 projetos base e categorias por defeito. |

## Recriar do zero

```bash
export DATABASE_URL="postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/complete-schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/storage.sql

# Fazer login uma vez como rafaelcvn@gmail.com no frontend
# (cria entrada em auth.users e dispara handle_new_user)

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/sql/seed.sql
```

## Ordem importante

1. Enums e extensions vêm primeiro.
2. `profiles` / `user_roles` / `super_admin_seed` antes de `has_role`.
3. `has_role` antes das policies que o invocam.
4. `projetos` antes de `projeto_membros` (FK).
5. `is_projeto_member` / `is_projeto_gestor` antes das policies de `projetos`,
   `categorias`, `etapas`, `lancamentos`, `projeto_convites`,
   `relatorio_partilhas`.
6. Buckets do storage só depois das funções de membership existirem (as policies
   chamam-nas).
7. O bloco final do schema (REVOKE/GRANT EXECUTE) corre sempre por último — fecha
   o acesso público às funções `SECURITY DEFINER` e reabre apenas as
   estritamente necessárias (`has_role`, `is_projeto_member`, `is_projeto_gestor`,
   as RPCs da UI e `get_relatorio_publico` para o portal público).

## Migrations incrementais

Cada alteração é gravada em `supabase/migrations/<timestamp>_*.sql` pelo Lovable
Cloud. `complete-schema.sql` é o snapshot consolidado equivalente a aplicar
todas em ordem.

## Cron jobs

Definidos no Supabase (não fazem parte do schema.sql porque dependem da URL do
deploy):

```sql
SELECT cron.schedule('backup-12h', '0 10 * * *',  $$ SELECT net.http_post(...) $$);
SELECT cron.schedule('backup-22h', '0 20 * * *',  $$ SELECT net.http_post(...) $$);
```

Ver `docs/DEPLOYMENT.md` para o snippet completo.

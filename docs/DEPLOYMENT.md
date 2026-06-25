# Deployment

## Ambiente

- **Frontend + server functions** correm em Cloudflare Workers (TanStack Start
  + Vite build, target edge). Lovable Cloud trata do deploy.
- **Backend** = Supabase Postgres (gerido pelo Lovable Cloud).

## Publicar

1. No editor Lovable → botão **Publish** no topo direito.
2. Lovable Cloud aplica automaticamente migrations pendentes em
   `supabase/migrations/`, faz build do Vite e publica.

## Variáveis de ambiente

### Cliente (browser, Vite)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Servidor (server functions / rotas API)
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (privilegiado)
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
- `LOVABLE_API_KEY`
- `GOOGLE_DRIVE_API_KEY` (via connector)

> Todas estão configuradas no Lovable Cloud. Não as colocar em `.env` commitado.

## URLs estáveis

- Produção: `project--4e38af4c-3639-4633-8366-8f666466ae5e.lovable.app`
- Preview:  `project--4e38af4c-3639-4633-8366-8f666466ae5e-dev.lovable.app`

Estas URLs são usadas pelos cron jobs (chamam `/api/public/hooks/backup`).

## Cron Jobs

Configurados via `pg_cron` no Supabase (já incluídos na migration original):

```sql
SELECT cron.schedule(
  'backup-12h',
  '0 10 * * *', -- 12:00 Maputo (UTC+2)
  $$ SELECT net.http_post(
       url := 'https://project--…lovable.app/api/public/hooks/backup',
       headers := '{"x-backup-secret":"<SECRET>"}'::jsonb
     ); $$
);

SELECT cron.schedule('backup-22h', '0 20 * * *', $$ … $$);
```

## Recriar a base do zero (novo Supabase)

```bash
# 1. Schema completo + funções + triggers + RLS + grants
psql "$DATABASE_URL" -f docs/sql/complete-schema.sql

# 2. (Opcional) seed: super admin + projetos base
psql "$DATABASE_URL" -f docs/sql/seed.sql

# 3. Criar buckets (se ainda não existirem)
psql "$DATABASE_URL" -f docs/sql/storage.sql
```

## Testes antes de deploy

```bash
bun run lint
bun run test
bun run build
```

## Pós-deploy checklist

- [ ] Login com super admin funciona
- [ ] Notificação de teste envia (Brevo)
- [ ] Backup manual cria entrada em `backup_runs`
- [ ] Provedor IA ativo responde no `/assistente`
- [ ] Manifest carrega no telemóvel (PWA install)

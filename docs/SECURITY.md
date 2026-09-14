# Segurança

## Autenticação

- **Email + password** apenas. Google OAuth foi desativado (uso interno).
- Sign-up público desativado. Utilizadores são criados pelo super admin em
  `Configurações → Criar utilizador` (server fn `adminCreateUser`), que:
  1. cria conta via Auth Admin API,
  2. insere `projeto_membros` com o papel escolhido,
  3. opcionalmente promove a super admin.
- Sessão Supabase é persistida em `localStorage` (motivo de `ssr: false` no
  layout `_authenticated`).

## Autorização (RLS)

Todas as tabelas `public.*` têm RLS **ON** + GRANTs explícitos:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated;
GRANT ALL ON public.<tabela> TO service_role;
```

Princípios:

- `super_admin` bypassa via `has_role(auth.uid(), 'super_admin')` em todas as
  políticas críticas.
- `gestor` do projeto pode gerir lançamentos, etapas e membros não gestores via
  `is_projeto_gestor(auth.uid(), projeto_id)`.
- Categorias globais ou por projeto e qualquer atribuição/remoção do papel
  `gestor` são exclusivas do `super_admin` (evita escalada de privilégios e
  mantém a classificação financeira centralizada).
- `financiador` / `leitor` só consegue ler dados do projeto a que pertence
  via `is_projeto_member(...)`.
- Não há leitura anónima direta das tabelas de negócio. O único acesso público é via **RPC**
  `get_relatorio_publico(token)` (SECURITY DEFINER, valida `expires_at` e
  `revoked`).

As funções `SECURITY DEFINER` internas têm execução revogada de `PUBLIC` e
`anon`. Funções chamadas pela aplicação são concedidas apenas a
`authenticated`; triggers e rotinas de manutenção não podem ser chamadas
diretamente por utilizadores autenticados.

### Segurança do portal público de doador

`relatorio_partilhas.token` (24 bytes random hex) + `expires_at` + flag
`revoked`. A RPC nunca devolve `created_by` nem dados de outros projetos.

## Storage

- Buckets privados. Comprovativos e logos servidos via **signed URLs** com
  expiração curta gerada server-side.
- Backups acessíveis apenas a super admin (signed URL na UI de Auditoria).

## Secrets

| Secret | Onde | Uso |
| --- | --- | --- |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | server fn (RLS aplicada) | leituras autenticadas |
| `SUPABASE_SERVICE_ROLE_KEY` | `client.server.ts` apenas em handlers privilegiados | Auth Admin, webhooks |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` | envio de email | notificações |
| `LOVABLE_API_KEY` | Lovable AI Gateway (fallback) | IA |
| `GOOGLE_DRIVE_API_KEY` | connector Lovable | espelhamento de backups |
| API keys de provedores IA | tabela `ai_provedores` (super admin) | chamadas IA |

Regras:
- `service_role` **nunca** chega ao browser. Importação dinâmica
  (`await import("@/integrations/supabase/client.server")`) dentro de handlers.
- `process.env.*` apenas em código server-only.
- Chaves de IA são armazenadas em coluna `api_key` (texto) — acesso restrito
  por RLS (`has_role(...,'super_admin')`). Considerar `vault` para encriptação
  adicional em deployments sensíveis.

## Audit Trail

Triggers de `audit_trigger()` em `lancamentos`, `projetos`, `etapas`,
`projeto_membros`, `categorias`. Registam `actor_id`, `actor_email`,
`operation`, `old_data`, `new_data`. A edição de um lançamento, incluindo
categoria ou comprovativo, fica registada com os valores anterior e novo.
O trilho é visível em `/auditoria` apenas para Super Admins.

## Backups

- Cron diário 2x (12:00 e 22:00 Maputo) via `pg_cron` → webhook
  `/api/public/hooks/backup`.
- Mirror em Google Drive (pasta "RevivaMoz Backups").
- Histórico em `backup_runs` com status + tamanho + contagens.

## Boas práticas operacionais

1. **Nunca** dar role `super_admin` sem consenso documentado.
2. Rever `audit_log` mensalmente para anomalias.
3. Validar testes (`bun run test`) antes de qualquer deploy.
4. Trocar chaves IA a cada 90 dias (rotativo em
   `Configurações → Provedores IA`).
5. Validar restore de backup trimestralmente.

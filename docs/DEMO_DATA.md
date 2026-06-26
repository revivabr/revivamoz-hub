# Dados Fictícios (Demo)

A aplicação permite popular o sistema com **lançamentos de exemplo** apenas
para validar gráficos e KPIs, sem risco para dados reais.

## Garantia de Segurança

Todos os lançamentos demo são marcados com a coluna booleana
`lancamentos.is_demo = true` (default `false`).

- **Inserção**: server function `seedDemoData` (Configurações → Dados Fictícios).
  Cada linha é gravada com `is_demo = true` e descrição começando por `[DEMO]`.
- **Limpeza**: `clearDemoData` executa **apenas**
  `DELETE FROM lancamentos WHERE is_demo = true`. Não toca em:
  - `projetos`, `projeto_membros`, `projeto_convites`
  - `auth.users`, `profiles`, `user_roles`
  - `categorias`, `etapas`
  - lançamentos reais (sem o marcador)
  - `notificacoes`, `audit_log`, `backup_runs`, `ai_provedores`
- Ambas as funções exigem papel `super_admin`.

## Como usar

1. **Configurações → Dados Fictícios (Demo)** → *Gerar dados fictícios (6 meses)*.
2. Explore Dashboard, Inteligência, Relatórios.
3. Antes de produção real: *Limpar dados demo*.

A operação é idempotente: re-executar o seed limpa o conjunto anterior antes
de gerar um novo, evitando duplicação.

## Verificação manual

```sql
SELECT count(*) FROM lancamentos WHERE is_demo = true;
DELETE FROM lancamentos WHERE is_demo = true;
```

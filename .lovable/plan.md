# Edição de lançamentos nos projetos

## Objetivo
Permitir corrigir qualquer lançamento já registado (descrição, valor, data, tipo, categoria, etapa e comprovante) diretamente na página do projeto, para quem tem permissão de gestão (gestor do projeto ou super admin).

## Estado atual (confirmado)
- A lista de lançamentos (`LancamentosLista`) só tem ação de **apagar** — não existe edição.
- A base de dados **já autoriza** a atualização: a regra "Gestores atualizam lancamentos" permite a gestores do projeto e super admins editarem lançamentos. Não é precisa nenhuma migração.
- Cada edição fica automaticamente registada no **trilho de auditoria** (antes/depois), porque o gatilho de auditoria já cobre atualizações na tabela de lançamentos.

## O que será construído

### 1. Formulário partilhado (criar e editar)
- Extrair os campos do formulário de `NovoLancamentoDialog.tsx` (tipo, data, valor, categoria, etapa, descrição, comprovante) para um componente reutilizável, evitando duplicação entre "novo" e "editar".
- O diálogo de criar continua exatamente igual para o utilizador.

### 2. Novo diálogo "Editar lançamento"
- Ficheiro novo `EditarLancamentoDialog.tsx` que abre com os dados do lançamento já preenchidos.
- Ao guardar: atualiza o registo e mostra confirmação ("Lançamento atualizado.").
- **Comprovante**: mostra o ficheiro atual (se existir) com opções de **substituir** (envia novo ficheiro e remove o antigo do armazenamento) ou **remover** sem substituir.
- **Offline**: criar lançamento sem ligação continua a ir para a fila offline, mas **editar exige ligação** — se estiver offline, mostra aviso "Edição requer ligação à internet" (a fila offline atual só suporta criação).
- A criação rápida de categorias dentro do formulário continua restrita ao super admin, como hoje.

### 3. Botão de editar na lista
- Em `LancamentosLista.tsx`, adicionar um ícone de **lápis** ao lado da lixeira em cada linha, visível apenas para quem pode editar (`canEdit` — gestor do projeto ou super admin), as mesmas permissões do botão apagar.
- Leitores e financiadores não veem o botão.
- Após guardar, a lista e os totais/gráficos do projeto atualizam automaticamente.

## Ficheiros afetados
- `src/components/projetos/LancamentosLista.tsx` — botão de editar por linha.
- `src/components/projetos/EditarLancamentoDialog.tsx` — novo diálogo de edição.
- `src/components/projetos/NovoLancamentoDialog.tsx` — extrair campos para componente partilhado (sem mudança visual).
- Novo: `src/components/projetos/LancamentoFormFields.tsx` — campos partilhados.

## Fora de âmbito
- Sem alterações à base de dados ou permissões (já estão corretas).
- Edição offline em fila (pode ser uma fase futura).

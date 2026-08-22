# Edição de lançamentos nos projetos

## Objetivo
Adicionar um **botão de editar (lápis) em cada lançamento** da lista, ao lado do botão apagar. Ao clicar, abre uma janela com os dados daquele lançamento já preenchidos para corrigir o que for necessário (descrição, valor, data, tipo, categoria, etapa ou comprovante) e guardar.

## Como funciona
- Cada linha da lista de lançamentos passa a ter dois ícones: **editar** (lápis) e **apagar** (lixeira).
- O botão editar aparece apenas para **gestor do projeto e super admin** — as mesmas permissões do botão apagar. Leitores e financiadores não veem.
- A janela de edição usa o mesmo formulário do "Novo lançamento", mas vem preenchida com os dados atuais.
- Ao guardar, a lista, os totais e os gráficos do projeto atualizam automaticamente.
- Se o lançamento tiver comprovante, dá para **substituir** o ficheiro ou **removê-lo**.
- Editar exige ligação à internet (criar offline continua a funcionar como hoje).

## Sem mexer na base de dados
- A base de dados **já permite** a edição por gestores e super admin — não é precisa nenhuma alteração.
- Cada correção fica **registada automaticamente no trilho de auditoria** (valores antes e depois), como já acontece com criações e eliminações.

## Detalhes técnicos
- Novo componente `EditarLancamentoDialog.tsx` com o formulário preenchido e a gravação via atualização do registo.
- Campos do formulário extraídos para um componente partilhado, reutilizado pelo diálogo de criar (sem mudança visual).
- Botão de lápis adicionado em `LancamentosLista.tsx` junto à lixeira.

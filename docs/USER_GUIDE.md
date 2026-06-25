# Manual do Utilizador

## Perfis

| Perfil | Pode |
| --- | --- |
| **Super Admin** | Tudo: criar/editar/apagar projetos, gerir utilizadores, provedores IA, ver auditoria e backups |
| **Gestor** | Gerir o(s) projeto(s) onde é gestor: lançamentos, categorias, etapas, convidar membros |
| **Financiador / Leitor** | Ver dashboards, lançamentos e relatórios dos projetos onde foi adicionado |

## Login

1. Abrir a app. Inserir email + password fornecidos pelo super admin.
2. Não existe registo público — peça acesso ao super admin.
3. Após login, o sistema redireciona para o **Painel Global**.

## Como Super Admin

### Criar utilizador
1. `Configurações → Criar utilizador`.
2. Preencher nome, email, password temporária.
3. **Escolher o projeto** (obrigatório) e o **papel** (gestor/financiador/leitor).
4. (Opcional) Marcar "Promover a super admin".
5. Enviar credenciais ao utilizador por canal seguro.

### Criar projeto
1. `Projetos Ativos → Novo projeto`.
2. Definir tipo: **Programa Social** (doações mensais),
   **Projeto Sazonal** (orçamento fixo + datas) ou **Caixa Administrativo**.
3. Carregar logo 16:9 (jpg/png/svg). Caso não haja, o nome aparece como
   fallback.
4. Adicionar gestores e membros depois em `projeto → Membros`.

### Gerir Provedores IA
1. `Configurações → Provedores IA`.
2. Adicionar API key + modelo. Ativar **um** provedor (os outros desativam).
3. Testar com **"Testar endpoint"**.
4. Trocar modelo depois sem precisar repor a API key.

### Backups
- Automáticos às 12:00 e 22:00 (Maputo).
- Para correr manualmente: `Auditoria → Backups → Executar agora`.
- Download via signed URL (botão na linha do backup).

## Como Gestor de Projeto

### Lançar entrada/saída
1. Abrir o projeto → **Novo lançamento**.
2. Escolher tipo (entrada/saída), data, valor, categoria.
3. Para criar uma **nova categoria** no momento, clicar **"+ Criar categoria"**
   no fim da lista — abre modal, preenche nome e a categoria fica disponível
   imediatamente (escopada a este projeto e a este tipo).
4. (Opcional) Anexar comprovativo (jpg/png/pdf).
5. Guardar.

### Cronograma físico (etapas)
1. No projeto → **Etapas** → **Nova etapa**.
2. Definir nome, peso (%), valor previsto, datas e progresso.
3. O progresso global do projeto é a soma ponderada das etapas.

### Convidar membros
1. Projeto → **Membros** → **Convidar por email**.
2. Escolher papel. Quando o utilizador for criado pelo super admin com o
   mesmo email, o convite é aceite automaticamente.

### Partilhar relatório com doador
1. `Relatórios` → filtrar projeto + período → **Gerar link público**.
2. Definir expiração. Enviar o link `…/p/relatorio/{token}` ao doador.
3. Revogar a qualquer momento.

## Como Financiador / Leitor

- `Painel Global` mostra apenas projetos onde foi adicionado.
- Pode descarregar PDF/Excel em `Relatórios`.
- Não pode editar nada.

## Assistente IA

- `Assistente`: faça perguntas em linguagem natural sobre projetos
  ("Qual o saldo do PEPE Emunah em outubro?"). Usa o modelo configurado pelo
  super admin.

## PWA / Mobile

1. Abrir a app no Chrome/Safari do telemóvel.
2. **Adicionar ao ecrã principal**.
3. Lançamentos offline são gravados localmente e sincronizam quando voltar a
   ter rede (indicador no header).

## Idioma e Tema

- Header → bandeira → escolher PT-MZ / PT-BR.
- Header → ícone sol/lua → light / dark.

## Problemas comuns

| Sintoma | Solução |
| --- | --- |
| "Sessão expirada" | Fazer login novamente |
| Não vê um projeto | Pedir ao super admin / gestor para o adicionar como membro |
| Upload de comprovativo falha | Confirmar tamanho < 10 MB e formato jpg/png/pdf |
| IA responde "provedor inativo" | Super admin precisa ativar um provedor em Configurações |

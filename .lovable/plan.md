# Atualização completa da documentação

## Objetivo
Reorganizar e atualizar a documentação técnica da Reviva Moz para refletir o estado atual do sistema, com três documentos principais separados e um README que funcione como porta de entrada.

## Entregas

### 1. Arquitetura (`docs/ARCHITECTURE.md`)
- Atualizar stack, estrutura de pastas e mapa de páginas.
- Documentar autenticação, autorização, papéis e isolamento por projeto.
- Explicar os fluxos de leitura e escrita, funções de servidor e integrações.
- Detalhar os módulos: projetos, finanças, relatórios, IA, notificações, auditoria, backups e operação offline.
- Incluir diagramas textuais dos principais fluxos e decisões arquiteturais.

### 2. Design (`docs/DESIGN.md`)
- Criar um guia próprio para identidade visual e experiência de utilização.
- Documentar cores semânticas, temas claro/escuro, tipografia, espaçamento, raios e sombras.
- Mapear navegação, cabeçalho, sidebar, cartões, tabelas, formulários, diálogos, gráficos e estados.
- Explicar padrões responsivos, mobile, acessibilidade, ícones, feedback e consistência visual.
- Registrar regras para evolução segura do design sem quebrar o sistema existente.

### 3. Base de dados (`docs/DATABASE.md`)
- Atualizar o modelo completo: enums, tabelas, relações, índices lógicos e valores padrão relevantes.
- Detalhar RLS, permissões, funções `SECURITY DEFINER`, triggers e trilho de auditoria.
- Documentar categorias globais/por projeto, edição de lançamentos, comprovativos, relatórios públicos, histórico da IA e backups.
- Separar claramente autenticação, dados públicos por token e operações privilegiadas.
- Incluir diagramas textuais e regras de integridade/manutenção.

### 4. README principal (`README.md`)
- Criar ou atualizar o README da raiz como visão geral do produto e guia inicial.
- Incluir funcionalidades, stack, estrutura, configuração local, comandos, testes, publicação e segurança.
- Adicionar índice para toda a documentação em `docs/`.
- Evitar credenciais, chaves privadas e instruções incompatíveis com Lovable Cloud.

### 5. Índice da documentação (`docs/README.md`)
- Atualizar a navegação entre os documentos.
- Corrigir descrições e números que estejam desatualizados.
- Destacar a nova documentação de design.

## Validação
- Conferir todos os caminhos, nomes de módulos, páginas e comandos contra o código atual.
- Verificar links Markdown e consistência entre README, arquitetura, design e base de dados.
- Garantir que nenhuma credencial ou dado sensível apareça nos documentos.

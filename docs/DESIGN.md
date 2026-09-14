# Sistema de Design

## 1. Direção visual

A interface traduz a identidade institucional da Reviva Moz para um sistema administrativo sóbrio, acolhedor e orientado a dados. O verde da marca domina navegação e ações principais; vermelho e dourado aparecem apenas em estados, alertas e gráficos.

Princípios:

- clareza antes de decoração;
- hierarquia visual curta e consistente;
- dados densos, mas legíveis;
- ações destrutivas sempre diferenciadas;
- mesma linguagem visual em tema claro e escuro;
- navegação utilizável em desktop e telemóvel;
- cores expressas por papéis semânticos, não por valores soltos nos componentes.

## 2. Fonte de verdade

`src/styles.css` define os tokens com Tailwind CSS v4 e OKLCH. Componentes devem usar classes semânticas como:

- `bg-background`, `text-foreground`;
- `bg-card`, `text-card-foreground`;
- `bg-primary`, `text-primary-foreground`;
- `text-muted-foreground`;
- `border-border`, `border-input`, `ring-ring`;
- `text-destructive`, `bg-success`, `bg-warning`;
- `bg-sidebar`, `text-sidebar-foreground`.

Valores de cor não devem ser repetidos diretamente nas páginas quando um token já representa o papel visual.

## 3. Paleta semântica

### Tema claro

| Token | Papel |
| --- | --- |
| `background` | Tela off-white, reduz brilho em páginas longas |
| `foreground` | Texto principal verde muito escuro |
| `card` | Superfícies brancas para itens e ferramentas |
| `primary` | Verde institucional para ações principais |
| `secondary` | Verde muito claro para ações secundárias |
| `accent` | Verde luminoso para seleção e realce |
| `muted` | Áreas neutras e fundos auxiliares |
| `muted-foreground` | Texto secundário |
| `success` | Estado positivo |
| `warning` | Atenção e execução intermediária |
| `destructive` | Erro, remoção e saldo crítico |
| `border` / `input` | Separação leve de superfícies e campos |
| `ring` | Foco visível |

### Tema escuro

A classe `.dark` troca todos os papéis sem mudar o markup. Superfícies tornam-se verdes escuras, o texto principal fica claro e o verde luminoso assume o papel de ação. Bordas usam transparência para não pesar.

### Gráficos

`src/lib/chart-theme.ts` centraliza eixos, grade, tooltip, legenda e paleta. Os cinco primeiros tons vêm de `--chart-1` a `--chart-5`. Cores adicionais só devem ser usadas quando muitas categorias exigirem distinção.

A cor nunca deve ser o único meio de comunicar um estado; rótulos, valores e ícones complementam a leitura.

## 4. Tipografia

- Família principal: **Inter**.
- Fallback: fontes sans-serif do sistema.
- Pesos carregados: 400, 500, 600, 700 e 800.
- Suavização antialias aplicada ao `body`.

Hierarquia recomendada:

| Uso | Padrão |
| --- | --- |
| Título da página | `text-base sm:text-lg font-semibold` no cabeçalho |
| Título de seção | `text-lg` ou `text-xl`, sem saltos excessivos |
| Título de card | `font-semibold` |
| Corpo | `text-sm` ou tamanho base |
| Metadado | `text-xs text-muted-foreground` |
| KPI | destaque numérico forte, rótulo curto |

O assistente limita respostas Markdown a títulos de nível 3 para evitar diferenças exageradas dentro do chat.

## 5. Forma, borda e elevação

- Raio base: `0.75rem` (12 px).
- A escala semântica vai de `radius-sm` a `radius-4xl`.
- Cards usam sombra suave (`shadow-card`) somente quando a separação por borda não for suficiente.
- Inputs, botões e popovers usam borda semântica e foco com `ring-ring`.
- Avatares e logotipo institucional podem ser circulares; logotipos de projetos mantêm 16:9.

Não criar cards dentro de cards. Seções de página são layouts livres; cards representam itens, KPIs ou ferramentas realmente delimitadas.

## 6. Layout autenticado

`DashboardLayout` monta:

```text
SidebarProvider
├── AppSidebar
└── SidebarInset
    ├── AppHeader fixo
    └── conteúdo com px-4/py-5 e sm:px-6/sm:py-6
```

### Sidebar

- Fundo verde profundo e texto claro.
- Logo circular da Reviva Moz no topo.
- Pode recolher para modo de ícones em desktop.
- Em mobile, abre como painel e possui botão explícito para fechar.
- Fecha automaticamente após navegar no telemóvel.
- Itens administrativos aparecem apenas para Super Admin.
- Link ativo recebe o estado visual do componente `SidebarMenuButton`.

Ordem principal:

1. Visão Geral;
2. Projetos Ativos;
3. Fluxo de Caixa;
4. Relatórios;
5. Assistente;
6. Inteligência, Auditoria e Configurações para Super Admin.

### Cabeçalho

O cabeçalho é `sticky`, possui três áreas e mantém o título truncado para evitar sobreposição:

- gatilho da sidebar e título;
- busca visual em telas médias ou maiores;
- idioma, tema, estado offline, notificações e perfil.

A área de perfil contém avatar/iniciais, e-mail e ação de terminar sessão.

## 7. Responsividade

O breakpoint funcional de mobile é 768 px (`useIsMobile`). Regras:

- padding menor no telemóvel e maior a partir de `sm`;
- busca escondida abaixo de `md`;
- rótulos secundários escondidos quando não cabem;
- grids de KPIs e gráficos reduzem colunas progressivamente;
- tabelas devem usar contêiner com rolagem horizontal;
- diálogos devem respeitar a largura do viewport e conteúdo rolável;
- botões essenciais permanecem acessíveis sem depender de hover;
- nenhum texto deve sobrepor ícones, KPIs ou ações.

## 8. Componentes

### Botões

Usar o componente compartilhado `Button` e suas variantes:

- `default`: ação principal;
- `secondary` ou `outline`: ação alternativa;
- `ghost`: ação leve em linhas e toolbars;
- `destructive`: remoção confirmada;
- tamanhos de ícone para ações reconhecíveis, sempre com `aria-label` ou tooltip.

### Formulários

- Label visível para cada campo.
- Campos de palavra-passe usam `PasswordInput` com olho/olho cortado.
- Erros de validação aparecem próximos ao campo ou por toast.
- A ação principal fica no rodapé do diálogo.
- Estados de envio desativam repetição e mostram feedback.
- Datas, valores e seletores devem usar o controle adequado, não texto livre quando houver opções fechadas.

### Diálogos

Padrão Radix:

```text
Dialog
└── DialogContent
    ├── DialogHeader + título/descrição
    ├── formulário/conteúdo
    └── DialogFooter + cancelar/confirmar
```

Operações destrutivas exigem confirmação. Criação e edição de lançamento compartilham `LancamentoFormFields`, garantindo ordem e comportamento equivalentes.

### Cards e KPIs

- Um KPI apresenta rótulo, valor, ícone e, quando necessário, tendência.
- Não usar texto longo em KPIs.
- Cards de projeto mantêm logotipo 16:9 e fallback legível com o nome.
- Estados de projeto usam badges, não apenas cores no card inteiro.

### Tabelas e listas

- Cabeçalho claro e colunas alinhadas ao tipo de dado.
- Números e moedas alinhados à direita.
- Ações de linha agrupadas no final.
- Editar usa lápis; remover usa lixeira e estilo destrutivo.
- Conteúdo extenso deve truncar ou quebrar de forma controlada.
- Mobile usa rolagem horizontal ou versão empilhada quando implementada pelo módulo.

### Gráficos

- Recharts com animações curtas e não intrusivas.
- Tooltip usa fundo e texto de `card`.
- Eixos e grade usam tokens suaves.
- Pizza/donut inclui legenda ou rótulo compreensível.
- Entradas, saídas e saldo mantêm significados consistentes entre páginas.

### Feedback e estados

- `sonner` no canto superior direito para sucesso e erro.
- `EmptyState` para listas vazias com próxima ação possível.
- Skeleton/spinner apenas enquanto a informação relevante carrega.
- `OfflineBadge` mostra perda de ligação e ajuda a explicar itens pendentes.
- Erros globais oferecem tentar novamente ou voltar ao início.

## 9. Ícones e imagens

- Biblioteca padrão: `lucide-react`.
- Ícones não substituem texto quando a ação não for universal.
- Botões apenas com ícone precisam de nome acessível e tooltip.
- Logos de projeto aceitam JPG, PNG ou SVG conforme validação do formulário.
- Quando o projeto não possui logotipo, mostrar o nome; não usar imagem genérica.
- Relatórios usam a marca Reviva Moz à esquerda e o projeto à direita, com título central.

## 10. Tema e idioma

`ThemeProvider` persiste `light` ou `dark` em `revivamoz.theme` e considera a preferência do sistema na primeira visita. O seletor de idioma alterna `pt-MZ` e `pt-BR`; a escolha também é persistida.

Novos textos compartilhados devem entrar no catálogo de `src/lib/i18n.tsx`. Textos específicos e administrativos podem permanecer no componente quando ainda não houver chave equivalente, mas devem conservar a terminologia do produto.

## 11. Acessibilidade

- Radix UI fornece foco, teclado e ARIA para os primitivos.
- Foco visível usa `ring-ring`.
- Ícones decorativos não devem duplicar o nome anunciado.
- Imagens informativas precisam de `alt` específico.
- Contraste deve ser verificado nos dois temas.
- Ações não podem depender apenas da cor.
- Controles devem manter área clicável confortável em mobile.
- Conteúdo truncado importante deve estar acessível por tooltip, expansão ou detalhe.
- Respeitar `prefers-reduced-motion` em novas animações relevantes.

## 12. Regras para evolução

Ao criar ou alterar interface:

1. Reutilizar componentes de `src/components/ui`.
2. Usar tokens semânticos; não codificar cores diretamente na página.
3. Testar tema claro e escuro.
4. Testar pelo menos mobile e desktop.
5. Garantir que textos longos e valores grandes não alterem o layout.
6. Manter ações por permissão consistentes com o backend.
7. Usar o mesmo vocabulário entre páginas, PDF e notificações.
8. Evitar criar uma nova variante quando uma existente já resolve o papel.
9. Centralizar cores de gráficos em `chart-theme.ts`.
10. Adicionar feedback de carregamento, vazio, sucesso e erro.

## 13. Lacunas conhecidas

- Não há escala semântica própria de espaçamento; usa-se a escala padrão do Tailwind.
- Não há escala formal de `z-index`; os componentes usam valores locais.
- A busca do cabeçalho ainda não está conectada a resultados.
- Algumas cores categóricas adicionais dos gráficos são valores diretos e devem migrar para tokens se passarem a ser usadas fora do módulo.
- As durações de animação ainda são definidas por componente; novas animações devem ser discretas e consistentes.

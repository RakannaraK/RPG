# Fase 61 — Acabamento dos efeitos do mapa

Fecha três limites que ficaram das Fases 57–60. Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas.

## 61.A — Editor de habilidade lista os efeitos das extensões instaladas

Hoje o select "Efeito visual no mapa" só mostra os efeitos do pacote Essencial.

- `src/components/sistema/SistemaEditor.jsx` (já recebe `mesaId`) chama `useExtensoesMesa(mesaId)` e passa `efeitosVfx={conteudo.efeitos}` ao `RacasClassesEditor`, que leva a lista até o select (perto da linha 750 de `RacasClassesEditor.jsx`).
- Opções: "Nenhum" + `efeitosVfx`. Enquanto carrega, ou se a lista vier vazia, usa `PACOTE_ESSENCIAL.efeitos`.
- Continua valendo: valor gravado que não está na lista aparece como opção extra (a extensão pode ter sido removida).
- Sem SQL: `habilidades.efeito_visual` já aceita qualquer id válido.

## 61.B — Arrastar efeito e luz direto no mapa

Hoje é preciso apertar "Mover" no painel e depois clicar no mapa.

- `src/lib/atmosfera.js`: `alcasDaAtmosfera(atmosfera, grade)` devolve `[{ chave, tipo: 'efeito' | 'fonte', id, x, y, raioPx, nome, cor }]`, só para efeitos presos a um ponto (têm `x`/`y`) e fontes de luz fixas. `chave` é única (`tipo:id`). Reaproveitar o que já existe (`ehLocal`, conversão de raio para px). Teste em `atmosfera.test.js`.
- `src/components/mapa/AlcasAtmosfera.jsx` (novo): `<g>` de SVG com props `{ alcas, ctx, largura, altura, onMover }`, onde `onMover(tipo, id, x, y)`.
  - Cada alça: um anel tracejado de raio `raioPx` (mostra o alcance, sem capturar ponteiro) e um círculo de pegar de raio `14 / ctx.vista.zoom` (fica com 28 px na tela em qualquer zoom), com `<title>` dizendo o nome.
  - Arrastar igual ao token em `CamadaTokens.jsx`: `setPointerCapture`, limiar de 4 px, `ctx.paraMapa`, `touchAction: 'none'`, e o gesto não pode virar arrastar do mapa.
  - Durante o arrasto guarda a posição localmente; chama `onMover` só ao soltar, com a posição limitada a `0..largura` e `0..altura`. Sem encaixe na grade.
  - Cores por token do tema; a cor do efeito só no miolo da alça.
- `src/pages/MapaPage.jsx`: renderiza `AlcasAtmosfera` por último dentro de `camadas(ctx)` (acima da névoa), só quando a pessoa é gestora, o painel de atmosfera está aberto e não há `colocando`. `onMover` chama `mudarAtmosfera(atualizarEfeito(...))` ou `mudarAtmosfera(atualizarFonte(...))` com `{ x, y }`.
- O botão "Mover" do painel continua existindo: é o caminho no celular (onde o painel cobre o mapa) e para quem não arrasta.

## 61.C — Extensão na Comunidade

Hoje uma extensão só circula como arquivo `.json`.

- SQL `sql/fase61_extensao_na_comunidade.sql`: amplia a restrição `publicacoes_tipo_check` com `'extensao'`. Já rodado.
- `src/lib/comunidade.js`: `TIPOS_PUBLICACAO` ganha `extensao` (nome "Extensão"). `validarPublicacao`, para esse tipo, exige `validarPacote(conteudo).ok` e o que é gravado é o pacote normalizado (`pacote`), nunca o arquivo cru. Teste em `comunidade.test.js`.
- `src/lib/extensoes.js`: `validarPacote` precisa aceitar tanto texto quanto objeto e aplicar o limite `LIMITES.bytesPacote` nos dois casos. Ajustar só se ainda não for assim.
- `src/pages/ComunidadePage.jsx`:
  - Formulário de publicar, tipo `extensao`: escolher um arquivo `.json`, validar com `validarPacote` e mostrar os erros. Se título ou descrição estiverem vazios, preencher com `nome` e `descricao` do pacote.
  - Cartão: desenho próprio em `ARTE_DO_TIPO`, procedural como os outros.
  - "Levar para a mesa": mesmas mesas oferecidas para o tipo `sistema` (onde a pessoa é gestora). Revalida o conteúdo com `validarPacote` e chama `instalarNaMesa`. Ao dar certo, avisa "Extensão instalada em (nome da mesa)" e não navega.
- `src/hooks/useExtensoesMesa.js`: `export async function instalarNaMesa(mesaId, pacote)` lê `mesas.extensoes`, aplica `instalar` e grava com a RPC `definir_extensoes` (ela já barra quem não é gestor e listas com mais de 20). Erro vira mensagem em português.
- `src/components/mapa/ModalExtensoes.jsx`: na seção "Importadas", um link "Publicar na Comunidade" para a página da Comunidade, com a frase "Baixe o .json e publique lá."

## Fora desta fase

- Paredes e linha de visão (decisão mantida no `NOTAS.md`).
- Publicar direto do modal, já com o pacote preenchido.

## Como ficou

- **61.A** — `SistemaEditor` chama `useExtensoesMesa(mesaId)` e entrega `efeitosVfx` ao `RacasClassesEditor`. Dentro dele a lista chega ao select por um React context (passar por prop exigiria mexer em 5 componentes). Lista vazia ou carregando usa o Essencial; valor gravado fora da lista continua aparecendo.
- **61.B** — `alcasDaAtmosfera` em `lib/atmosfera.js` e o componente `AlcasAtmosfera.jsx`, que entra por último em `camadas(ctx)` da `MapaPage`. Grava só ao soltar; `pointercancel` e perda de captura descartam o arrasto.
- **61.C** — tipo `extensao` na Comunidade:
  - Publicar: o arquivo é validado ao ser escolhido, todos os erros aparecem, e título e descrição vazios são preenchidos pelo pacote. O que é gravado é o pacote normalizado.
  - Cartão: usa a ilustração `lanterna`, que já existia. Filtro com plural explícito ("Extensões").
  - Levar para a mesa: só lista mesas em que a pessoa é mestre ou co-mestre; sem nenhuma, avisa "Você precisa ser mestre ou co-mestre de uma mesa." Instala com `instalarNaMesa` (em `hooks/useExtensoesMesa.js`).
  - `validarPacote` passou a medir objeto em bytes, como já fazia com texto.
  - `ModalExtensoes`: link "Publicar na Comunidade" dentro da seção "Importadas".

### Limite conhecido

`instalarNaMesa` lê, altera e grava a lista inteira. Se dois gestores gravarem ao mesmo tempo, uma instalação pode se perder. A saída é uma RPC que acrescenta o pacote no servidor (há um comentário `ponytail:` no código).

### Como foi conferido

- Lint sem erros (108 avisos antigos), build ok, 1053 testes passando.
- SQL rodado; a restrição `publicacoes_tipo_check` foi lida de volta com `'extensao'`.
- Navegador, com sessão falsa e respostas simuladas:
  - Mapa: 2 alças com o painel aberto e nenhuma com ele fechado; arrastar gravou a posição nova (x 455 → 652) sem deslocar o mapa; clicar sem arrastar não gravou nada.
  - Comunidade: filtro "Extensões"; arquivo válido preenche título e descrição e gera a gravação com `tipo: "extensao"`; formato errado e JSON quebrado mostram erro ao escolher e não enviam; "Levar para a mesa" chamou `definir_extensoes` com o pacote e mostrou o aviso de instalada.
- Não conferido na tela: o select do editor de habilidade (61.A), só por revisão de código; e nada foi testado com login real.
- Revisão final de código feita em separado; as quatro correções obrigatórias e as pequenas foram aplicadas.

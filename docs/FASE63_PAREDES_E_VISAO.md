# Fase 63 — Paredes e linha de visão

O mestre desenha paredes e portas no mapa. Com a linha de visão ligada, cada jogador só enxerga o que os próprios tokens veem, e a luz não atravessa parede. Estava registrado como "não fazer"; foi reaberto a pedido do dono em 2026-11-13.

Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas.

## Dados

- SQL `sql/fase63_paredes.sql` (já rodado): coluna `mapas.paredes JSONB NOT NULL DEFAULT '{}'`, limite de 60 000 bytes. Jogador lê (mapa ativo), só o gestor grava; as políticas de `mapas` não mudaram.
- Formato: `{ ativa: boolean, segmentos: [{ id, x1, y1, x2, y2, porta: boolean, aberta: boolean }] }`. Coordenadas em px do mapa, inteiras. `id` curto (8 caracteres). No máximo 300 segmentos.
- `src/hooks/useMapas.js`: incluir `paredes` na leitura. Gravar com o `atualizar(id, { paredes })` que já existe.

## `src/lib/visao.js` (puro, com teste em `visao.test.js`)

- `MAX_SEGMENTOS = 300`, `PAREDES_VAZIAS`.
- `normalizarParedes(json)` devolve `{ ativa, segmentos }` descartando o que for inválido (é dado não confiável) e cortando no máximo.
- `adicionarSegmento(paredes, { x1, y1, x2, y2, porta })` (ignora com menos de 8 px), `removerSegmento(paredes, id)`, `alternarPorta(paredes, id)`, `definirVisaoAtiva(paredes, ligada)`, `limparParedes(paredes)`. Todas devolvem objeto novo.
- `bloqueios(paredes)`: os segmentos que bloqueiam (paredes e portas fechadas).
- `poligonoVisivel(origem, segmentos, { largura, altura })` devolve `[[x, y], …]`: lança raios para as pontas de cada segmento (com um desvio mínimo para cada lado) e para os cantos do mapa, pega o cruzamento mais próximo e ordena por ângulo. A borda do mapa conta como parede.
- `enxerga(origem, ponto, segmentos)`: `true` se o segmento origem–ponto não cruza nenhum bloqueio.
- `encaixarPonta(ponto, paredes, grade, tolerancia)`: gruda na ponta de parede mais próxima dentro da tolerância; senão no canto de célula da grade mais próximo dentro da tolerância; senão devolve o ponto.
- `segmentoMaisProximo(ponto, paredes, tolerancia)`: id do segmento sob o clique, ou `null`.
- `caminhoSvg(pontos)`: texto de `path` (`M … L … Z`).

Testes mínimos: sala fechada (o polígono não sai da sala); porta aberta deixa ver, fechada não; `enxerga` dos dois lados de uma parede; mapa sem parede dá o retângulo inteiro; `normalizarParedes` com lixo; teto de 300.

## `src/components/mapa/Paredes.jsx` (novo, no molde de `Nevoa.jsx`)

- `CamadaVisao({ caminhos, largura, altura, translucida })`: `<g>` com máscara (id por `useId`): tudo coberto, menos os polígonos visíveis. Mesma cor da névoa de guerra. `translucida` (0,55 de opacidade) para o gestor em "ver como jogador".
- `ParedesGestor({ paredes, selecionada })`: as linhas, só para o gestor. Parede em traço cheio, porta em outra cor de token, porta aberta tracejada. Espessura que não muda com o zoom (`vectorEffect="non-scaling-stroke"`).
- `EditorParedes`: captura os gestos com `CapturaMapa`, como `EditorNevoa`. Arrastar cria um segmento (as duas pontas passam por `encaixarPonta`, tolerância de 12 px na tela). Clicar sem arrastar: em porta, abre ou fecha; em parede, seleciona.
- `BarraParedes`: barra flutuante no molde de `BarraNevoa`. Modo "Parede" ou "Porta"; interruptor "Linha de visão ligada"; com segmento selecionado, "Apagar"; "Limpar tudo" com confirmação (`useConfirmar`); contador "N de 300"; uma linha de dica.

## Integração

- `src/components/mapa/Desenhos.jsx`: ferramenta `parede`, rótulo "🧱 Paredes (W)", só gestor.
- `src/pages/MapaPage.jsx`:
  - Tecla `W`. Estado local otimista das paredes com gravação adiada de 400 ms, igual ao que já existe para a atmosfera.
  - Origens da visão: para o jogador, o centro dos tokens `meu`. Para o gestor em "ver como jogador", os tokens ligados a ficha que não é criatura. Sem nenhuma origem, a linha de visão não se aplica (a pessoa vê como antes).
  - Com `paredes.ativa`, bloqueios e pelo menos uma origem, e a pessoa não vendo tudo (`verTudo` falso): desenhar `CamadaVisao` acima dos tokens e da luz, e tirar de `tokensNaTela` os tokens que nenhuma origem `enxerga` (os `meu` ficam sempre).
  - Gestor: `ParedesGestor` sempre que a ferramenta estiver ativa ou "ver como jogador" estiver desligado.
  - Calcular polígonos com `useMemo`. Deixar um comentário `// ponytail:` dizendo que o cálculo roda a cada movimento de token e que o próximo passo, se pesar, é limitar a frequência.
- `src/components/mapa/CamadaLuz.jsx`: prop opcional `recortes` (`{ [fonte.id]: caminho }`). Quando existe o recorte de uma fonte, o círculo dela na máscara e o brilho ficam dentro de um `clipPath` com esse caminho. A `MapaPage` calcula um `poligonoVisivel` por fonte quando há bloqueios (independe de `ativa`: luz nunca atravessa parede).

## Limites conhecidos

- É visual: os tokens escondidos continuam chegando ao navegador do jogador, como já acontece com a névoa de guerra.
- Porta só abre pelo gestor, com a ferramenta de paredes ativa.
- Paredes são retas; sem janelas, sem altura e sem visão no escuro por personagem.

## Como ficou

- `src/lib/visao.js` com tudo que a especificação lista; `src/components/mapa/Paredes.jsx` com `CamadaVisao`, `ParedesGestor`, `EditorParedes` e `BarraParedes`; `CamadaLuz` com a prop `recortes`; ferramenta "🧱 Paredes (W)" na barra; integração na `MapaPage`.
- `useMapas.js` não precisou mudar: a leitura já traz todas as colunas.
- `CamadaVisao` recebe `{ chave, blocos, largura, altura, translucida }` e calcula os caminhos dentro dela (o compilador do React recusou o `useMemo` na página).
- Efeitos de ação (projétil, explosão…) cujo destino o jogador não enxerga deixam de aparecer para ele.
- A barra de ferramentas do mapa ganhou rolagem para telas baixas.

### Correções da revisão

- Defeito grave corrigido: a folga da conta de cruzamento era proporcional ao comprimento da parede, e perto da ponta de uma parede o jogador ficava cego através de portas e vãos. A folga agora é fixa e mínima. O teste "vão na parede, origem perto da ponta" falha com a conta antiga e passa com a nova (conferido trocando a conta de volta).
- Os recortes de luz eram refeitos a cada render da página (13 ms por fonte com 300 paredes); agora dependem de uma chave de texto das fontes.
- `encaixarPonta` só gruda na grade quando ela está ligada.

### Limites que ficaram

- Efeitos de cena presos a um ponto (fogo, neblina local) continuam aparecendo por cima da parte não vista.
- Os demais limites da seção "Limites conhecidos" continuam valendo.

### Como foi conferido

- Lint sem erros, build ok, testes passando (12 em `visao.test.js`).
- Banco, em transação desfeita: mestre grava paredes; jogador lê e não grava; tamanho e formato barrados.
- Navegador, com sessão falsa: tecla W abre a barra; arrastar grava a parede com as pontas nos cantos da grade; porta abre e fecha; apagar e ligar a linha de visão gravam; como jogador, o token do outro lado da parede some e o do mesmo lado fica; a luz é recortada na parede; o botão da ferramenta fica visível em janelas de 720 e 600 px de altura.
- Não conferido: desempenho arrastando token com centenas de paredes, e nada com login real.

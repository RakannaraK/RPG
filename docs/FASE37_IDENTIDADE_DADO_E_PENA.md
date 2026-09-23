# Fase 37 — Identidade visual: **Dado & Pena**

> Reformulação do visual. O nome "RPG Ficha" era descrição, não marca. O site passa a se chamar
> **Dado & Pena** — as duas ferramentas da mesa: o dado que decide e a pena que escreve a ficha.
> Intensidade escolhida: **carregada**.

## Princípios (não negociar depois)
1. **Zero arquivo de imagem.** Tudo é SVG inline e CSS. Nada de PNG/JPG no repositório: o Render é grátis, o bundle é pequeno e nenhuma arte de terceiro entra com licença duvidosa.
2. **Em cima dos tokens, nunca no lugar deles.** `theme/tokens.css` (superfícies, `--accent-*` por tema, âmbar dos dados, semânticas) continua sendo a fonte da cor. A camada nova só desenha.
3. **Os 5 temas continuam valendo.** Violeta, esmeralda, carmim, âmbar e gelo mudam o ornamento junto com o acento — nada fica roxo chumbado.
4. **Layout não se mexe.** Ornamento é ornamento: ninguém abre o site e perde o botão que usava ontem.
5. **O overlay do OBS não recebe nada.** Fundo transparente é requisito do overlay; textura e vinheta ficam desligadas lá.
6. **Movimento é opcional.** Tudo que anima respeita `prefers-reduced-motion`.

## O que entra
1. **Marca** — nome, selo (d20 cruzado com pena), assinatura e favicon; o nome vive num módulo só.
2. **Camada temática** — velino (pergaminho escurecido) nos painéis, vinheta na cor do tema, molduras com cantos ornamentados, divisórias com filigrana.
3. **Campos com transição de cor** — foco com borda em gradiente (acento → âmbar do dado) e brilho; botões com gradiente.
4. **Arte de RPG em SVG** — d20, espada, escudo, poção, baú, pergaminho, elmo, mapa, garra, lanterna — nos estados vazios e nos cabeçalhos de seção, no lugar dos emojis.
5. **Carregado** — moldura de pergaminho na ficha, **capa por mesa** (padrão SVG que o gestor escolhe) e brasão animado nos cabeçalhos.

## Sub-fases
- **37.1** — marca: `lib/marca.js`, `components/marca/` (selo + assinatura), aplicação nas telas, `index.html`, favicon.
- **37.2** — `theme/rpg.css`: velino, vinheta, moldura, divisória, campos e botões.
- **37.3** — `components/arte/`: biblioteca SVG + troca dos emojis nos estados vazios.
- **37.4** — carregado: moldura da ficha, capa da mesa (`mesas.capa`, SQL aditivo), brasão animado.
- **37.5** — acessibilidade (contraste nos 5 temas, `prefers-reduced-motion`, overlay intacto), testes, docs.

## Banco
Só uma coluna, aditiva: `ALTER TABLE mesas ADD COLUMN capa TEXT;` (id do padrão de capa; `NULL` = sem capa). Sem RLS nova — quem já edita a mesa escolhe a capa.

## Teste de aceitação
Abrir o site: o nome é Dado & Pena, com selo. Trocar o tema 5 vezes: ornamento, vinheta e foco dos campos acompanham o acento, e o texto continua legível em todos. Um campo em foco mostra a transição de cor. Estado vazio mostra arte, não emoji. A ficha tem moldura; a mesa mostra a capa escolhida. `/overlay/:token` continua com fundo transparente e sem ornamento. Com "reduzir movimento" ligado no sistema, nada pulsa.

## Como ficou (implementado — 37.1 … 37.5)

**37.1 — marca.** `lib/marca.js` guarda nome, tagline e descrição; `components/marca/Selo.jsx` desenha o d20 cruzado pela pena e `Marca.jsx` junta selo + nome com o "&" em âmbar, em três tamanhos. Aplicada na entrada, no painel, na comunidade e no "conta criada". Título da aba, `meta description`, `theme-color` e `favicon.svg` refeitos. O selo foi redesenhado depois de ver no navegador: a pena tapava a face do dado e em 26 px virava mancha — hoje a pena é menor e abaixo de 30 px o desenho se simplifica sozinho.

**37.2 — camada temática.** `theme/rpg.css`: brasa na cor do tema, grão de velino e vinheta no fundo (duas camadas fixas, fora do fluxo de rolagem); `.velino` (fibra de pergaminho), `.moldura-cantos` (filigrana nos quatro cantos, por máscara, então segue o tema), `.divisor-rpg`, brilho nos botões e o pulso do selo. Campos ganharam **transição de cor no foco**: borda no acento, anel de brilho e um acender de 0,55 s que parte do âmbar. O overlay do OBS liga `data-sem-arte` e as camadas somem — conferido: `display: none` nas duas, fundo `transparent`.

**37.3 — arte.** `components/arte/Ilustra.jsx` com 12 desenhos (d20, pergaminho, mapa, baú, garra, espadas, moldura, tomo, escudo, poção, elmo, lanterna). Trocaram os emojis dos 8 estados vazios. Conferidos numa folha de contato gerada do próprio arquivo — garra, espadas e elmo não passaram de primeira e foram refeitos.

**37.4 — carregado.** `mesas.capa` (SQL aditivo) + `lib/capas.js` com 8 capas; `CapaMesa.jsx` repete o motivo sobre um gradiente do tema, com as pontas escurecidas para o texto continuar legível; aparece no topo da mesa e como faixa fina no cartão do painel; `SeletorCapa.jsx` na aba Membros (dono). A ficha inteira passou a morar dentro de `.moldura-pergaminho`, com grão e filigrana nos cantos — em tela estreita vira uma linha simples.

**37.5 — acessibilidade.** Contraste medido em todo texto visível nos 5 temas, resolvendo a cor pelo canvas (com `color-mix` na jogada, ler a string de `getComputedStyle` dá resultado errado: o Chrome devolve `oklab(...)` ou `color(srgb ...)` e a conta sai sem sentido — meu primeiro medidor acusou "1.06:1" em 10 textos que estavam visíveis nas capturas). Dois problemas **reais** apareceram e foram corrigidos: `text-purple-500/600` reprovava em todos os temas (2,21:1 no carmim) porque a regra da F35 misturava o acento com preto, e `text-purple-400` reprovava no carmim porque o `#fff 0%` da mesma regra derrubava a opacidade para 75%. Depois: **0 reprovações nos 5 temas**, pior razão 4,75:1. `prefers-reduced-motion` conferido — pulso do selo e acender do campo ficam em `none`.

### O que ficou de fora, e por quê
- **Nenhum arquivo de imagem.** Tudo é SVG/CSS: o repositório não ganhou peso, não há licença de terceiro e a arte acompanha os 5 temas. Ilustração pintada (bitmap) exigiria origem confiável e CDN; não entrou.
- **A capa é um motivo repetido, não uma cena.** Desenhar cenários em SVG à mão sairia caro e envelheceria mal.
- **`package.json` continua `rpg-ficha`.** É o nome do pacote, não do site; mexer nele só mexeria no deploy à toa.


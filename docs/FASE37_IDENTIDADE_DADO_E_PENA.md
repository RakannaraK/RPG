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

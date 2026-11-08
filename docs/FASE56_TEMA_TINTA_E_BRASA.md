# Fase 56 — Tema "Tinta e Brasa" (azul, preto, branco e vermelho) como padrão

Origem: um comentário público no vídeo do concorrente reclamou do "roxo de site vibecodado". O nosso padrão era o mesmo violeta `#8B5CF6`. O dono pediu um tema que misture **azul, preto, branco e vermelho com transições suaves**.

**Ideia:** a pena escreve em tinta azul sobre o preto; o dado queima em brasa vermelha; o branco é o papel (o texto) e o ponto de luz entre os dois. As transições passam pelo preto (fundos) ou pelo branco (energia), nunca pelo roxo — azul direto para vermelho no sRGB vira um lilás no meio, que é justamente o que se quer evitar.

## Decisões (fechadas)

1. Tema novo `{ id: 'tinta', nome: 'Tinta e Brasa', amostra: '#2A5FE6', gradiente: 'linear-gradient(135deg, #2A5FE6 0%, #F4F7FC 38%, #E23A4A 66%, #070A12 100%)', cores: ['#7FA6FF', '#FF5468'], particula: 'brasas', energia: 'Brasas azuis e vermelhas sobre tinta preta' }`, **primeiro** da lista `TEMAS`.
2. **Vira o padrão:** `PADRAO.tema = 'tinta'` no `PreferenciasContext`. Violeta continua existindo (é o `:root`, `data-tema` nulo). Quem já escolheu um tema mantém.
3. Diferente dos outros temas, este redefine **também superfícies, texto e cor de dado** (o preto-azulado e o vermelho fazem parte da identidade; âmbar seria uma 5ª cor). `--ok`, `--warn`, `--harm`, `--temp` não mudam (semânticas).
4. Valores (com canal RGB `-c` de cada um, no mesmo molde do arquivo):

| Variável | Valor | | Variável | Valor |
|---|---|---|---|---|
| `--bg` | `#05070C` | | `--accent-300` | `#A9C4FF` |
| `--void` | `#0A0E18` | | `--accent-400` | `#7FA6FF` |
| `--raised` | `#111829` | | `--accent-500` | `#3D74F5` |
| `--hover` | `#1A2338` | | `--accent-600` | `#2A5FE6` |
| `--border` | `#26314A` | | `--accent-700` | `#1F4BC2` |
| `--ink` | `#F4F7FC` | | `--accent-800` | `#183A94` |
| `--ink-dim` | `rgba(244,247,252,.60)` | | `--p900-c` | `12 24 56` |
| `--dice-200` | `#FFC9CF` | | `--p950-c` | `6 12 28` |
| `--dice-400` | `#FF7080` | | `--sobre-acento` | `#FFFFFF` |
| `--dice-500` | `#F0445A` | | `--energia-1` | `#7FA6FF` |
| `--dice-700` | `#A81E2F` | | `--energia-2` | `#FF5468` |
| | | | `--energia-meio` | `#F4F7FC` |

   Contraste medido (WCAG): texto 18,4:1; `--accent-400` sobre o fundo 8,3:1; branco sobre `--accent-600` 5,0:1; `--dice-400` sobre o fundo 7,4:1.
5. **`--energia-meio`** (variável nova): no `:root` vale `color-mix(in srgb, var(--energia-1), var(--energia-2))` — igual ao meio do degradê de 2 cores de hoje, então os outros temas não mudam. Todo degradê que hoje vai de `--energia-1` a `--energia-2` (a chama arcana em `componentes.css` e outros que aparecerem na busca) passa a ter 3 paradas: 1 → meio → 2. No Tinta e Brasa o meio é branco.
6. **Fundo global** só neste tema (`:root[data-tema="tinta"] body::before` em `rpg.css`): brilho azul vindo do canto superior esquerdo, brilho vermelho vindo do inferior direito, preto no meio — `radial-gradient(1200px 800px at 0% 0%, rgb(31 75 194 / .35), transparent 60%), radial-gradient(1000px 700px at 100% 100%, rgb(168 30 47 / .30), transparent 60%), linear-gradient(160deg, #070A12, #05070C)`. Respeitar as regras que já desligam o fundo (efeitos desligados, overlay do OBS / `data-sem-arte`).
7. Partículas: `brasas` já existe em `src/lib/ambiente.js`; as cores vêm de `--energia-1/2`. Não criar tipo novo.
8. Amostra no seletor de tema (`PreferenciasModal.jsx`): fundo `t.gradiente || t.amostra`.
9. `index.html` (`theme-color`) e `public/manifest.json` (`theme_color` e, se houver, `background_color`) passam a `#05070C`. Se o `index.html` tiver script que aplica o tema antes do React, o padrão dele também vira `tinta`.

## O que fazer
1. `src/lib/personalizacao.js`, `src/context/PreferenciasContext.jsx`, `src/components/preferencias/PreferenciasModal.jsx`, `src/theme/tokens.css`, `src/theme/rpg.css`, `src/theme/componentes.css` (e outro CSS só se a busca por `--energia-1` achar degradê), `index.html`, `public/manifest.json`.
2. Testes: atualizar `personalizacao.test.js` e `fase35.acceptance.test.js` (agora são 6 temas e o padrão é `tinta`). Teste novo `src/lib/temaTinta.test.js` que lê o bloco `[data-tema="tinta"]` do `tokens.css` (com `fs`) e confere, pela fórmula WCAG, que: `--ink`/`--bg` ≥ 7; `--accent-400`/`--bg` ≥ 4,5; `--sobre-acento`/`--accent-600` ≥ 4,5; `--dice-400`/`--bg` ≥ 4,5; e que todo hex tem o canal `-c` correspondente igual.
3. Seção **"Como ficou"** no fim deste documento.

## Como ficou
- Tema `tinta` é o 1º de `TEMAS` e o padrão (`PADRAO.tema`); violeta segue como `:root` (data-tema nulo). Seletor mostra `gradiente` na amostra e "(padrão)" agora está no Tinta e Brasa.
- `tokens.css`: bloco `[data-tema="tinta"]` com superfícies, texto, acento, dado, p900/p950, energia e `--energia-meio` (branco); `--energia-meio` no `:root` = mistura das duas energias. Chama arcana (`componentes.css`) ganhou a parada do meio (20%); era o único degradê de energia.
- `rpg.css`: fundo azul/vermelho só no tema; "efeitos desligados" continua com fundo liso e o OBS (`data-sem-arte`) continua sem fundo.
- `theme-color` e `manifest.json` (theme e background) = `#05070C`. O `index.html` não tem script de tema.
- Testes: `temaTinta.test.js` (contraste WCAG + canais `-c`), `personalizacao.test.js` e `fase35.acceptance.test.js` ajustados (6 temas, padrão tinta).

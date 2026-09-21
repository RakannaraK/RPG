# Fase 33 — Transformações e árvore de habilidades

> 8ª fase do roadmap de paridade com o LICHRPG. Aproveita a ideia da F31 (uma ficha pode ser outra coisa além de personagem) e a F30 (duplicar ficha, permissões).

## Transformações (forma alternativa)
**Uma forma é uma ficha**, pendurada na ficha original (`forma_de_id`). Assim ela tem atributos, vida, habilidades, itens e rolagens próprios — sem inventar um segundo motor.
- Criar forma: em branco ou **a partir de uma criatura do bestiário** (duplica) — o lobisomem usa a ficha do Lobo.
- **Transformar / voltar:** um clique. Enquanto transformado, a sessão, o combate e o mapa mostram a forma ("Aria (Lobo)") e **o dano vai para a vida da forma**; ao voltar, a ficha original continua como estava.
- A forma não aparece na lista de personagens nem no bestiário: ela vive dentro da ficha dona.
- Sem limite de formas por personagem.

## Árvore de habilidades visual
- Habilidade pode **exigir outra habilidade** (`requer_habilidade_id`), além do nível mínimo que já existia.
- A árvore desenha as habilidades em camadas (quem não exige nada em cima), ligadas por linhas, com três estados: **conhecida**, **disponível** (tem o pré-requisito e o nível) e **bloqueada** (com o motivo).
- Na ficha: aba **Árvore** — clicar numa disponível adiciona a habilidade. No sistema: o mestre escolhe o pré-requisito de cada habilidade e vê a árvore montada.
- Sem limite de camadas nem de ramos.

## Banco (`sql/fase33_transformacoes_arvore.sql`)
- `fichas.tipo_ficha` passa a aceitar `'forma'`; `fichas.forma_de_id` (a forma pertence a esta ficha, cai junto se ela for apagada) e `fichas.forma_ativa_id` (qual forma está ativa agora).
- `habilidades.requer_habilidade_id` (pré-requisito; NULL = raiz).

## Sub-fases
- **33.1** — SQL + motores puros (`lib/transformacao.js`, `lib/arvoreHabilidades.js`) com testes.
- **33.2** — formas na ficha: criar (em branco ou do bestiário), transformar/voltar, banner, exclusão das listas; sessão/combate/mapa mostram a forma ativa e o dano vai na vida dela.
- **33.3** — árvore visual: aba na ficha (adicionar habilidade disponível) e pré-requisito no editor do sistema.
- **33.4** — aceitação + docs.

## Restrições
1. Sem o SQL: nada muda (ninguém tem forma; nenhuma habilidade exige outra). 2. A forma é ficha de verdade: vale export/import, permissões e bestiário como qualquer outra. 3. Ciclo de pré-requisito (A exige B que exige A) não pode travar a tela: vira raiz com aviso. 4. Transformar não apaga nada — é só trocar qual ficha está valendo.

## Teste de aceitação
Criar a forma "Lobo" a partir da criatura do bestiário; transformar: o card da sessão vira "Aria (Lobo)" com a vida do Lobo, o dano do mestre tira vida do Lobo e, ao voltar, a vida de Aria está intacta. Na árvore, "Golpe Duplo" exige "Golpe Rápido": sem ela fica bloqueada com o motivo; com ela, aparece disponível e um clique adiciona.

# Fase 31 — Bestiário

> 6ª fase do roadmap de paridade com o LICHRPG. Usa F14 (combate/encontros), F26 (mapa/tokens), F30 (ficha privada, pastas, exportar/importar/duplicar) e o motor de sistema inteiro (F17–F25).

## Ideia central
**Criatura é uma ficha completa**, marcada como criatura. Assim ela ganha de graça tudo o que a ficha já tem: atributos, perícias, habilidades com recurso, itens, modificadores, fórmulas, rolagens, arte, exportar/importar e duplicar. O bestiário é a lista dessas fichas na mesa; invocar é pôr a criatura no combate (e no mapa).

## O que entra
- **Bestiário da mesa:** aba própria, criaturas com arte, **ameaça**, **espécie** e som; criar, editar (é a ficha), duplicar, exportar/importar `.json` (F30), apagar.
- **Privada por padrão:** o jogador não vê a ficha do monstro; vê só o que aparece no combate e no mapa.
- **Invocar no combate:** quantas quiser de uma vez ("Goblin 1…8"), como inimigo/aliado/NPC, vida e defesa vindas da ficha da criatura (editáveis na hora), som ao aparecer.
- **Invocar no mapa:** token com a arte da criatura, ligado ao combatente.
- **Boss / criatura importante:** invocar "com ficha própria" — a criatura ganha uma cópia da ficha só dela (recursos, habilidades e vida próprios, editáveis durante o jogo), ligada à criatura de origem.
- Sem limite de criaturas, cópias ou invocações.

## Banco (`sql/fase31_bestiario.sql`)
`fichas`: `tipo_ficha TEXT ('personagem'|'criatura')`, `ameaca TEXT`, `especie TEXT`, `som_preset TEXT`, `origem_id UUID` (cópia em jogo aponta para a criatura do bestiário). Sem política nova: criatura é ficha e já segue as regras da F30.

## Sub-fases
- **31.1 bestiário** — SQL; criaturas fora das listas de personagens; aba **Bestiário** na mesa (criar/duplicar/importar/exportar/apagar, filtro por espécie e ameaça); bloco "Criatura" na ficha (ameaça, espécie, som, arte).
- **31.2 invocar no combate** — diálogo (quantidade, tipo, vida, defesa, ficha própria), combatentes numerados ligados à criatura, som ao aparecer.
- **31.3 invocar no mapa** — tokens com a arte pela gaveta de tokens e pelo próprio diálogo; boss com cópia própria acessível pela gaveta de ficha.
- **31.4** — aceitação + docs.

## Restrições
1. Sem o SQL: tudo segue como antes (nenhuma ficha vira criatura). 2. Criatura não aparece na lista de personagens nem nos cards da sessão. 3. Invocar mook não cria ficha nova (só combatente); "ficha própria" é escolha explícita. 4. O que o jogador vê do monstro é só nome, vida (se o mestre mostrar) e token.

## Teste de aceitação
Criar "Goblin" no bestiário com arte e ameaça; jogador não vê a ficha; invocar 3 como inimigos gera "Goblin 1/2/3" com a vida da ficha; pôr no mapa cria 3 tokens com a arte; invocar o "Dragão" com ficha própria cria uma cópia editável ligada à criatura, e gastar recurso nela não mexe na criatura do bestiário; exportar o Goblin e importar em outra mesa recria a criatura.

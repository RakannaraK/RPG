# Fase 32 — Combate avançado

> 7ª fase do roadmap de paridade com o LICHRPG. Usa F14 (encontros, turnos, condições com duração), F15/F20 (recursos e pools), F22.5–22.6 (defesa ativa e contra-ataque, que **já existem**) e F31 (bestiário).

## O que falta e entra aqui
1. **Recarga em turnos** (cooldown): habilidade que, depois de usada, só volta depois de N turnos do dono.
2. **Ultimate**: habilidade que enche uma **carga** (por rodada e/ou na mão) e só pode ser usada cheia; usar zera.
3. **Dano e cura contínuos**: condição que tira ou devolve vida no começo do turno de quem a carrega (veneno, regeneração, queimando).
4. **Reserva e troca**: combatentes no banco; o mestre troca quem está em jogo por quem está na reserva, herdando o lugar na iniciativa.
5. **Habilidade contra habilidade**: responder a um ataque usando uma **habilidade da própria ficha** (não só as opções fixas do sistema).
6. **Contra-ataque com rolagem**: quando a defesa vira contra-ataque, o defensor rola o troco na hora (antes só narrava).

## Banco (`sql/fase32_combate_avancado.sql`)
- `habilidades`: `recarga_turnos INT`, `carga_max INT`, `carga_por_rodada INT`.
- `habilidades_ficha`: `recarga_restante INT` (NULL = pronta), `carga_atual INT`.
- `condicoes_ativas`: `efeito_turno JSONB` — `{ tipo: 'dano'|'cura', notacao?, valor? }`.
- `combatentes`: `reserva BOOLEAN`.
- RPC `avancar_turno_ficha(ficha)` (SECURITY DEFINER): baixa a recarga e sobe a carga das habilidades daquela ficha — o mestre avança o turno de fichas que não são dele (o RLS não deixaria escrever direto), como já acontece em `pagar_custo_turno`.

## Sub-fases
- **32.1** — SQL + RPC + `lib/combateAvancado.js` puro (estado da habilidade, uso, efeitos de turno, troca de reserva) com testes.
- **32.2** — recarga e ultimate na ficha (estado visível, bloqueio, botão de usar) e no editor de habilidade do sistema.
- **32.3** — dano/cura contínuos: condição com efeito por rodada, aplicada no começo do turno, com rolagem e aviso no feed.
- **32.4** — reserva e troca no painel de combate.
- **32.5** — habilidade contra habilidade + contra-ataque com rolagem.
- **32.6** — aceitação + docs.

## Restrições
1. Sem o SQL: tudo segue como antes (nenhuma habilidade tem recarga nem carga; ninguém fica na reserva). 2. Sem limite de ultimates, recargas ou reservas. 3. O motor é puro e testável sem banco. 4. Nada é aplicado sem o mestre avançar o turno (o efeito contínuo não roda sozinho no servidor).

## Teste de aceitação
Habilidade com recarga 2: usar bloqueia, passa 1 turno do dono ainda bloqueada, no 2º volta. Ultimate com carga 3 e ganho 1/rodada: só usa na 3ª rodada, e usar zera. Veneno de 1d4 por rodada tira vida no começo do turno do alvo e aparece no feed. Trocar reserva põe o suplente no lugar do titular, com a mesma iniciativa. Defender com uma habilidade da ficha rola a notação dela; contra-ataque abre a rolagem do troco.

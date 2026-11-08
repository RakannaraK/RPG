# Fase 53 — Combate em área, vários alvos, barras afetadas e responsável

Origem: análise do LICHRPG (2026-11-07). Ele lança habilidade em alvo único, múltiplos ou área (raio no mapa), escolhe a barra atingida de cada alvo e põe um jogador como responsável por cada criatura. Nós tínhamos um alvo só, dano direto na vida, nenhuma comparação de ataque com defesa, e jogador não conseguia ferir inimigo (o RLS de `combatentes` barra e o erro era engolido).

## Decisões (fechadas — não reabrir)

1. **Acerto x defesa por alvo.** Se a ação rolou ataque, cada alvo compara `ataque >= defesa` (empate acerta). Defesa = a CA efetiva que o `CombatePanel` já calcula (base + condições). Alvo sem defesa conhecida = acerta. Sem rolagem de ataque = todos acertam.
2. **Área = círculo** no mapa, raio na unidade da grade (`mapas.grade.unidade` / `unidade_nome`, padrão 1,5 m por quadrado). Entra quem tem o centro do token dentro do raio. Cone e linha ficam para depois.
3. **Metade em quem defendeu** é uma opção marcável só no modo Área (piso de valor/2). Fora dela, quem errou não toma nada.
4. **Barras afetadas:** para alvo com ficha, as barras são Vida + os pools do tipo `pontos` visíveis da ficha (Fase 20). Inimigo sem ficha: só Vida. Vida vem marcada por padrão; quem errou vem desmarcado. O mesmo valor vai para cada barra marcada.
5. **Cura** usa o mesmo modal (alternador Dano/Cura); cura limita ao máximo (vida: `hpMax` do card; pool: `maximo` do card).
6. **Escrita no servidor:** tudo que sai do modal passa pela RPC `aplicar_resultado_combate` (`sql/fase53_combate_em_area.sql`), que valida quem participa do encontro. O cliente calcula os valores novos com a MESMA regra do `useAplicarHp` (vida temporária consome primeiro). Os botões antigos de dano/cura do mestre continuam como estão.
7. **Responsável** (`combatentes.controlador_id`): o gestor escolhe, por combatente, "Mestre" (nulo) ou um membro. O responsável passa a poder agir naquele combatente.
8. **Ação livre:** para quem não tem arma na ficha (inimigo sem ficha, NPC), um campo de notação de dano/cura e um de ataque opcional. É o que torna o NPC controlável útil.

## Sub-fases

### 53.1 Motor puro — `src/lib/alvosCombate.js` + `src/lib/alvosCombate.test.js`
- `podeAgirNoCombate(c, { isGestor, meuUserId, cardsPorFicha })` = gestor OU `c.controlador_id === meuUserId` OU regra atual (`c.ficha_id && podeEditarFicha(...)`). **Substitui** a função inline do `CombatePanel` (L578-579).
- `defesaDoAlvo(c, { cardsPorFicha, campoCaId, condicoes })` → número ou `null`. **Extrair** o cálculo de CA efetiva que já existe no `CombatePanel` (base do jogador por `card.combate[campoCaId]`, do inimigo por `c.ca`, + mods de condição tipo `combate`/`ca`) e fazer o `CombatePanel` usar esta função.
- `vidaDoAlvo(c, cardsPorFicha)` → `{ fichaId | null, hpAtual, hpMax, temp }`. **Extrair** a decisão ficha-ou-combatente do `useAplicarHp` (inclui forma ativa: `card.ficha.id`).
- `calcularVida({ hpAtual, hpMax, temp }, delta)` → `{ hp, temp }`. **Extrair** a regra do `useAplicarHp` (dano gasta temp primeiro; cura limita em hpMax; piso 0) e fazer o `useAplicarHp` usar esta função. Comportamento atual idêntico.
- `alvosNaArea({ centro, raio, tokens, combatentes, grade })` → ids de combatentes (fora da reserva) cujo token tem centro a ≤ raio (distância em px ÷ `grade.tamanho` × `grade.unidade`). Token liga a combatente por `token.combatente_id`; se nulo, por `token.ficha_id === c.ficha_id`. Confira em `CamadaTokens` se `x,y` é canto ou centro e use o centro.
- `resolverAcertos({ ataque, alvos, defesaDe })` → `[{ id, defesa, acertou }]`.
- `planejarAplicacao({ alvos, valor, modo, barras, metadeAoErrar, cardsPorFicha })` → `{ escritas, linhas }`. `alvos = [{ c, acertou }]`, `barras = { [combatenteId]: ['vida', poolId, ...] }`, `modo = 'dano' | 'cura'`. `escritas` no formato exato de `p_alvos` da RPC; `linhas` = textos curtos para o feed ("Zumbi: −25 vida", "Aranha: errou").
- Testes cobrindo cada função, inclusive: empate acerta; sem ataque todos acertam; metade com piso; temp consumida antes; cura limitada; pool limitado a 0 e ao máximo; token fora do raio; combatente na reserva fora.

### 53.2 Hook — `src/hooks/useAplicarHp.js`
- Passa a usar `calcularVida` e `vidaDoAlvo` (sem mudar o comportamento de `aplicarHp`).
- Nova função `aplicarEmAlvos(plano, rotulo)` → `supabase.rpc('aplicar_resultado_combate', { p_encontro_id, p_alvos: plano.escritas })` e um único `registrarEvento` com `rotulo + ': ' + plano.linhas.join(' · ')`. **Não engolir erro:** devolve `{ erro }` com a mensagem da RPC para a tela mostrar.

### 53.3 Sessão — `AcoesCombate.jsx`, novo `ModalAplicarResultado.jsx`, `CombatePanel.jsx`, `SessaoPage.jsx`
- `ModalAplicarResultado` (use `components/ui/Modal`): valor editável, alternador Dano/Cura, uma linha por alvo com selo "Acertou"/"Errou" (mostra "def N × atq M" quando houver), caixas das barras; no modo Área, a caixa "Metade em quem defendeu". Botão "Aplicar" monta o plano com `planejarAplicacao` e chama `aplicarEmAlvos`; mostra o erro se vier.
- `AcoesCombate`: seletor de modo **Único / Vários / Área** (Área só aparece se receber a prop `onEscolherArea`). Único = o select de hoje. Vários = caixas de marcar (combatentes fora da reserva). Área = campo de raio (com `unidadeArea`) + botão "Marcar no mapa" → chama `onEscolherArea(raio)`; os ids chegam pela prop `alvosArea` e aparecem como selos.
  - Armas (como hoje): "Ataque" rola e guarda o total dessa arma; com alvos escolhidos, mostra na hora quem acertou. "Dano" rola e abre o modal com os alvos e os acertos (se o ataque dessa arma foi rolado). Sem alvo = só rola (comportamento atual).
  - Nova seção "Ação livre": rótulo, notação de ataque (opcional), notação de dano/cura, botões "Dano" e "Cura" → rola (ataque primeiro, se houver) e abre o modal.
  - A seção de armas só aparece se o combatente tem ficha e card; a Ação livre aparece sempre.
- `CombatePanel`: usa `podeAgirNoCombate` e `defesaDoAlvo`; mostra `AcoesCombate` quando há ativo e `podeAgir(ativo)` (sem exigir ficha); para o gestor, um select **Responsável** em cada linha ("Mestre" + membros via `useMembrosMesa`) que grava `controlador_id` por `atualizarCombatente`; selo "por <apelido>" quando houver responsável.
- `SessaoPage`: passa o que faltar (membros, `aplicarEmAlvos`, encontro).

### 53.4 Mapa — `MapaPage.jsx`, `components/mapa/PainelMesa.jsx` (PainelCombateMapa), nova camada de área
- `PainelCombateMapa` mostra `AcoesCombate` para o combatente da vez quando `podeAgirNoCombate` permite (os dados já estão na MapaPage: `useEncontro`, `useAplicarHp`, `useCardsDaMesa`).
- Ferramenta de área: `onEscolherArea(raio)` põe a página em modo "área" (use a captura de gesto compartilhada `CapturaMapa`). Toque/clique no mapa = centro. Desenha um círculo (acento com 15% de preenchimento, traço no acento) e realça os tokens dentro. Barra flutuante "N alvos na área · Confirmar · Cancelar"; Esc cancela. Confirmar devolve os ids (via `alvosNaArea`) para a `AcoesCombate`.
- Se `useDesenhosMapa` já tiver broadcast efêmero (como a régua), mostre o círculo para todos do mesmo jeito; se não tiver, não crie infraestrutura nova (registre em "Como ficou").

### 53.5 Aceitação e fechamento
- `src/lib/fase53.acceptance.test.js`: cena do vídeo do concorrente — Aracnasita ataca em área (raio 3 m, grade 1,5 m/70 px), ataque 15; Zumbi (def 12) acerta, Barata (def 18) erra; dano 25; com "metade" a Barata toma 12; Zumbi com Vida e Esforço marcados perde 25 em cada; cura não passa do máximo.
- Acrescentar a seção **"Como ficou"** no fim deste documento (o que mudou, arquivos, o que ficou de fora).

## Regras do projeto (valem para todo o código)
Português na interface. Componentes `ui/` (Botao, Modal, Icone, EstadoVazio). Cores só por token (`bg-void`, `border-border`, `text-ink`, `text-ink-dim`, `accent-*`, `harm/ok/warn/temp`); texto sobre botão de acento = `text-sobre-acento`, nunca `text-white`. Fonte mínima 12 px (nada de `text-[10px]`). Alvo de toque ≥ 24 px. Raios: `rounded-lg`, `rounded-xl`/`2xl`, `rounded-full`. Âmbar só para dado/aviso. Canal Realtime novo leva sufixo `useId()`. Sem dependência nova.

## Fora do escopo
Cone e linha; travar a ação ao dono da vez (a RPC aceita qualquer participante — anotado com `ponytail:` no SQL); aplicar a sugestão de dano de poder (F14.6) em vários alvos.

## Como ficou

**Feito (53.1–53.5).**
- `src/lib/alvosCombate.js` (+ teste): `podeAgirNoCombate`, `caInfo`/`defesaDoAlvo` (CA efetiva extraída do `CombatePanel`), `vidaDoAlvo`, `calcularVida` (regra extraída do `useAplicarHp`), `alvosNaArea` (token `x,y` é o CENTRO), `resolverAcertos`, `planejarAplicacao`. Cena do vídeo em `src/lib/fase53.acceptance.test.js`.
- `useAplicarHp` usa `calcularVida`/`vidaDoAlvo`. `aplicarEmAlvos(plano, rotulo)` vem como propriedade da função devolvida (`aplicarHp.aplicarEmAlvos`) para não quebrar quem já usa o hook como função (`useAvancarTurno`); chama a RPC, escreve um evento no feed e devolve `{ erro }` sem engolir.
- `ModalAplicarResultado` (novo), `AcoesCombate` (Único/Vários/Área, ataque guardado por arma, Ação livre), `CombatePanel` (ações para qualquer combatente da vez que a pessoa controla, select "Responsável" para o gestor, selo "por <apelido>" para os demais), `SessaoPage` (membros, `aplicarEmAlvos`, `atualizarCombatente`).
- Mapa: `PainelCombateMapa` mostra as ações; modo área em `src/components/mapa/CamadaArea.jsx` (círculo, anel nos tokens dentro, barra Confirmar/Cancelar, Esc cancela). Só entram tokens que a pessoa enxerga (respeita névoa/ocultos). No celular o painel lateral some durante a marcação (CSS, mantém o estado).
- Círculo para a mesa toda: não criei evento novo; o centro e o raio saem pela régua (broadcast `regua` que já existe), então todos veem a linha do raio com a medida. O círculo preenchido é só de quem marca.

**Desvios/limites.**
- `calcularVida` agora tem piso 0 também no caminho antigo (antes a vida podia ficar negativa).
- Pools são gravados na ficha base e a vida na forma ativa: duas escritas por alvo na RPC (a RPC usa um `ficha_id` por item).
- Se a coluna `controlador_id` ainda não existir, o select de responsável mostra o erro da gravação; sem a coluna, `undefined` = sem responsável.
- Jogador que é responsável vê também os botões antigos de dano/cura da linha (o RLS de `combatentes` ainda barra inimigo; o caminho certo é o modal, via RPC).
- Ficou de fora: cone e linha; travar a ação ao dono da vez; sugestão de dano de poder (F14.6) em vários alvos.
- Sem teste de tela (nada rodado no navegador; banco offline). Falta rodar `sql/fase53_combate_em_area.sql`.

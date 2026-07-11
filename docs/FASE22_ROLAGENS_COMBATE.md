# Fase 22 — Rolagens e Combate Avançados (fase final do plano mestre)

> 6ª e última fase do PLANO_MESTRE. PRÉ-REQUISITOS: Fases 17-21 concluídas com suíte verde.
> Fecha: distribuição de pontos de status, crítico configurável, defesa ativa. Ao fim, Krad e IC rodam de ponta a ponta.
> Implementar em sub-fases, na ordem. Motores puros e testes primeiro. Perguntar antes de decisões não especificadas.

## Objetivo
1. Distribuição de pontos de status (point-buy) — modo "pontos" da F3: pool inicial por raça, ganho por nível (fixo ou ROLADO "d6+10"), tela de distribuição com validação e histórico
2. Crítico configurável — dado, limiar, multiplicador, limiar DINÂMICO por fórmula (IC: d100, limiar 85, desce com maestria até min 25)
3. Defesa ativa — rolagem oposta no combate: defensor escolhe desvio/bloqueio/contra-ataque, rola, resultado aplica faixas de redução (35/60/90%)
4. Validação da CA múltipla (17/19/21) — condições manuais F12
5. Campos derivados no combate

## Parte 1 — Pontos de status

### config_layout.pontos_status
```
{ "ativo": true, "rotulo": "Pontos de Status",
  "inicial_por_raca": true, "inicial": "16",
  "ganho_por_nivel": "1d6 + 10",   // notação F17 rolada a cada nível
  "custo_por_ponto": 1, "maximo_por_atributo": null }
```
Por raça: `ALTER TABLE racas ADD COLUMN pontos_config JSONB;` // { "inicial":"16", "ganho_por_nivel":"1d6 + 10" }

### SQL
```sql
CREATE TABLE pontos_status_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  disponiveis INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ficha_id)
);
CREATE TABLE pontos_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('ganho_inicial','ganho_nivel','gasto','ajuste')) NOT NULL,
  quantidade INTEGER NOT NULL,          -- + ganho / - gasto
  detalhe JSONB,                        -- {"rolagem":"1d6+10","resultado":14,"nivel":7} ou {"atributo_id","de","para"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: dono ALL; membros SELECT (padrão do projeto)
```

### Comportamento
- Criação de ficha (pontos ativo): em vez de rolar atributos, resolve o INICIAL (raça/padrão), credita o pool, abre tela de distribuição (+/-, contador, teto). Confirma → grava base + log.
- Level-up (F19.3): rola ganho_por_nivel (feed: "Ganhou 14 pontos (1d6+10)"), credita, loga; distribuição fica no painel.
- SEM redistribuição (gasto definitivo); mestre corrige via `ajuste` com motivo.
- pontos_status e rolagem de atributo (F3) são EXCLUDENTES por sistema.
- Testes: inicial 16 Humano IC; ganho d6+10 por nível; distribuição respeita saldo/teto; log íntegro (ganhos-gastos=disponíveis).

## Parte 2 — Crítico configurável

### config_layout.critico
```
{ "ativo": true, "aplica_em": "acerto",
  "limiar_formula": "max(25, 85 - 15 * piso(maestria / 2))",  // var nova 'maestria' (F21); 0 se não houver
  "multiplicador_padrao": 2,
  "modo_multiplicador": "total"   // "total" (dobra tudo, Krad) | "dados" (só dados, clássico)
}
```
Por categoria: `ALTER TABLE categorias_item ADD COLUMN critico_config JSONB;` // { "multiplicador": 3 }

### Comportamento
- Acerto com item: se DADO PURO (antes de bônus) >= limiar resolvido → CRÍTICO.
- Limiar resolvido por fórmula no momento, com `maestria` do item (formulaEngine ganha resolver `maestria`, reservado desde F17).
- Feed: "🎯 CRÍTICO! (rolou 91, limiar 70)".
- Dano subsequente em modo crítico: "total" = resultado×N; "dados" = rola dados N vezes, fixos 1 vez. UI conecta acerto crítico → botão dano em modo crítico.
- ORDEM (CONTRATO): dados+fixos → multiplicador crítico → percentuais (F18) → piso.
- Testes: limiar IC maestria 0→85, 2→70, 8→25, 10→25 (piso); modo total dobra resultado; modo dados dobra só dados; ordem c/ percentual (+20% sobre dobrado); d20 clássico limiar 20.

## Parte 3 — Defesa ativa

### config_layout.defesa_ativa
```
{ "ativo": true,
  "opcoes": [ {"id":"desviar","nome":"Desviar","notacao":"1d100 + atributo(agilidade)"},
              {"id":"bloquear","nome":"Bloquear","notacao":"1d100 + atributo(forca)"},
              {"id":"contra","nome":"Contra-atacar","notacao":"1d100 + atributo(agilidade)"} ],
  "faixas": [ {"de":5,"ate":null,"reducao_percentual":90,"rotulo":"Defesa superior"},
              {"de":-4,"ate":4,"reducao_percentual":60,"rotulo":"Empate técnico"},
              {"de":null,"ate":-5,"reducao_percentual":35,"rotulo":"Defesa inferior"} ],
  "contra_ataque": { "sofre_dano_cheio": true, "efeito_no_atacante": "condicao",
     "condicao": {"nome":"Exposto","duracao_rodadas":1,"descricao":"Desvantagem dupla no próximo desvio"} }
}
```

### Fluxo no combate (F14)
1. Atacante rola acerto contra alvo (F14.6)
2. Defesa ativa ligada → oferece ao DONO do alvo (jogador; mestre p/ inimigos): Desviar/Bloquear/Contra/Não reagir
3. Defensor rola a notação da opção (F17)
4. Compara (defesa - ataque), acha a faixa, aplica REDUÇÃO % sobre o dano (pipeline: dano final F18/crítico → redução → piso)
5. Contra-ataque: defensor sofre dano cheio, MAS aplica condição no atacante (F14 c/ duração) e ganha ataque imediato (atalho UI)
6. Feed: "Zara desviou (78 vs 71, +7): dano reduzido em 90% → 2"
7. ASSÍNCRONO e tolerante: escolha via Realtime; sem resposta, mestre resolve ("Não reagir") — nunca trava o turno
- Testes (motor faixas): +7/0/-9 nas faixas certas; redução c/ piso; validação faixas (F19.4); contra aplica condição + oferece rolagem.

## Parte 4 — CA múltipla e derivados (validação/polimento)
- CA situacional 17/19/21: campo combate base + condições manuais/toggles (F12) que somam; polir toggles agrupados no card (F14).
- Derivados no combate: campos calculados (F17.4) marcáveis "exibir no combate" no card (ex: "Ações extras: 3" via piso(atributo(agilidade)/10)).
- Sem estrutura nova; validar peças existentes + ajustes UI.

## Sub-fases (ordem)
- 22.1 Pontos: config (sistema + raça) + motor puro (ganhos c/ rolagem F17, validação distribuição) — testes primeiro
- 22.2 Pontos: fluxo na ficha (criação em modo pontos, painel, integração level-up, ajuste do mestre)
- 22.3 Crítico: config + resolver `maestria` no formulaEngine + detecção no acerto + feed. Testes limiares IC
- 22.4 Crítico: dano em modo crítico (total/dados); ordem c/ percentuais testada
- 22.5 Defesa ativa: config + motor de faixas + validação
- 22.6 Defesa ativa: fluxo assíncrono no combate (Realtime), redução, contra-ataque, fallback do mestre
- 22.7 CA múltipla + derivados (validação/polimento)
- 22.8 Polimento final + TESTE DE ACEITAÇÃO FINAL do plano (dois checklists abaixo)

## Decisões/restrições
1. Motores puros e testes primeiro (pontos, crítico, faixas).
2. Ordem crítico×percentual é CONTRATO: dados+fixos → mult. crítico → percentuais → piso.
3. Crítico no DADO PURO do acerto, contra limiar resolvido (com `maestria` do item).
4. Pontos e rolagem de atributo são EXCLUDENTES por sistema (editor impede misturar).
5. Gasto de ponto é DEFINITIVO; correção via ajuste do mestre com log. Sem "resetar".
6. Defesa ativa opcional e assíncrona — nunca trava o turno; mestre resolve; Realtime + fallback.
7. Faixas usam validação da F19.4 (contíguas, sem sobreposição, extremos abertos).
8. Retrocompat total — tudo desligado = idêntico a antes.
9. Nada proprietário — números digitados pelo mestre.

## Pré-req SQL
1. ALTER TABLE racas ADD COLUMN pontos_config JSONB;
2. CREATE pontos_status_ficha + pontos_status_log + políticas
3. ALTER TABLE categorias_item ADD COLUMN critico_config JSONB;
4. Realtime: pontos_status_ficha opcional; defesa ativa usa canais do encontro/combatentes (F14)

## TESTE DE ACEITAÇÃO FINAL (fecha o plano)
**Krad (D&D house rule):** Bárbaro 9/Paladino 4 + XP/level-up; CA 17/19/21 toggles + CA sem armadura calculada; Fúria (recurso/efeitos/vantagem) + Frenesi condicionado; Sopro por faixa + reserva 4d12 + Mãos Consagradas 5×nivel(paladino); grimório (slots 3/3, CD 14, escala de círculo, Destruição Divina); Espada Devoradora 29/50 + manoplas convertendo + crítico "total" + carteira 5 moedas.
**Infinit Corridor:** 8 atributos por distribuição (inicial raça; ganho d6+10 por nível); classe +% (Lutador +13%) + vida 4d4+(vitalidade)d3; Thariuns 2×nível + Pontos de Foco + poder custando Thariuns; Transformação (nv mín 40, percentuais, custo/turno, condições pós-uso); maestria por categoria (XP 10/20/50, +10%/nível, Crítico/Dupla/Disparo em 2/4/6); crítico d100 limiar dinâmico (85→25); defesa ativa (desviar/bloquear/contra, faixas 90/60/35, condição no contra); recompensas de nível (criar habilidade em 1/5/9).

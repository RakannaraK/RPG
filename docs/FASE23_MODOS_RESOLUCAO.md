# Fase 23 — Modos de Resolução de Rolagem

> Primeira fase da trilha "sistemas narrativos" (Vampiro: A Máscara, Call of Cthulhu, PbtA e afins). PRÉ-REQUISITOS: Fases 17-18 concluídas (formulaEngine + percentuais com suíte verde); F20 (pools) recomendada para rerolagem com recurso.
> Esta fase mexe no CORAÇÃO da rolagem (F7) — mesmo rigor das Fases 17-18: motores puros, testes primeiro, contratos explícitos.
> A premissa que cai: até aqui, rolar = SOMAR dados e comparar. Esta fase torna a RESOLUÇÃO configurável por sistema.
> Implemente em sub-fases, na ordem. Pergunte antes de decisões não especificadas.

## Objetivo — quatro modos
1. **soma** — o atual (rola, soma, compara). Padrão e retrocompatível byte a byte.
2. **sucessos** — parada de dados; cada dado ≥ dificuldade conta 1 sucesso (WoD: parada de d10, dif 6). Opcionais: dado máximo conta 2, 1 anula sucesso, botch, par de máximos = crítico (V5: cada par de 10s = +2 sucessos).
3. **roll_under** — sucesso se rolar ≤ alvo (CoC: d100 sob a perícia), com qualidades (extremo ≤ alvo/5, bom ≤ alvo/2, normal ≤ alvo), crítico no 1, desastre no 100.
4. **faixas** — rola e soma, mas o RESULTADO é uma faixa com rótulo e texto (PbtA: 2d6+atributo → 6- falha; 7-9 parcial; 10+ pleno).

Transversais: 5) **explosão** (máximo rola de novo; limite 20); 6) **rerolagem com recurso** (gastar pool p/ rerolar até N dados escolhidos, uma vez por rolagem, debita antes); 7) **dados especiais** na parada (Dados de Fome: parte da parada em outra cor; eventos com eles disparam marcações nomeadas pelo mestre).

## Contratos (viram testes literais)

### sucessos
config: `{ modo:'sucessos', dado:10, dificuldade_padrao:6, max_conta_dobrado:false, par_de_max_critico:true, um_anula_sucesso:false, botch:true }`
Ordem: 1) rola a parada (qtd por fórmula F17) 2) conta sucessos: dados ≥ dif (+1; +2 se máximo e max_conta_dobrado) 3) se par_de_max_critico: cada par de máximos +2 extras 4) se um_anula_sucesso: −1 por dado=1 (mín 0) 5) `{sucessos, critico?, botch?}` — botch se sucessos finais=0 e houve ≥1 dado=1.
- 7d10 dif6 [10,10,8,6,4,2,1] V5 → base 4 + par 2 = **6 sucessos, crítico**
- 5d10 dif6 [5,4,3,1,1] botch → **botch**
- WoD clássico (um_anula) [9,7,6,1,1] dif6 → 3−2 = **1 sucesso**

### roll_under
config: `{ modo:'roll_under', dado:100, faixas_qualidade:true, critico_em:1, desastre_em:100 }` (opcional desastre_formula)
rola 1dX vs alvo (o alvo vem da rolagem). `{valor, alvo, sucesso, qualidade?, critico?, desastre?}`.
- alvo 60: 11→extremo (≤12); 29→bom (≤30); 55→normal; 61→falha; 1→crítico; 100→desastre.

### faixas
config: `{ modo:'faixas', notacao_base:'2d6', faixas:[{ate:6,rotulo,texto,cor},{de:7,ate:9,...},{de:10,...},{de:12,...,opcional:true}] }`
soma normal, mapeia o total na faixa. `{total, faixa:{rotulo,texto,cor}}`. O TEXTO aparece no feed.

### explosão (transversal)
Dado no máximo rola de novo; soma (modo soma) ou entra na parada (sucessos). Limite 20 explosões por dado.

### rerolagem com recurso (requer F20)
config: `{ pool_id, custo:1, max_dados:3, uma_vez_por_rolagem:true }`. Após rolar: botão "Rerolar até N (gasta X)"; jogador seleciona dados clicando, confirma, DEBITA antes, rerola só aqueles e RE-RESOLVE. Feed mostra original → rerolada. Só o autor, uma vez por rolagem.

### dados especiais (sucessos)
config na rolagem: `{ especiais:{ nome:'Fome', quantidade_formula:'recurso(fome)', dado:10 } }`. Os N primeiros dados viram do tipo especial (skin distinta F11). Marcações: crítico (par de máximos) incluindo especial → marcação; botch/falha com 1 em especial → marcação. NOMES/textos configuráveis pelo mestre (estrutura genérica: "se <evento> envolve especial → marcação <rótulo>"). Destaque no feed; efeito arbitrado pela mesa.

## Banco
`config_layout.resolucao = { modo, ...config do modo, explosao:{ativo}, rerolagem:{ativo,pool_id,custo,max_dados}, dados_especiais:{ativo,nome,quantidade_formula,marcacoes:[...]} }`
```sql
ALTER TABLE rolagens ADD COLUMN modo TEXT DEFAULT 'soma';
ALTER TABLE rolagens ADD COLUMN resultado_estruturado JSONB;
```

## Sub-fases
- 23.1 — `resolutionEngine.js` puro (RNG injetável; explosão c/ limite 20; soma delega ao pipeline e não muda NADA) + exemplos canônicos como testes literais. Não avançar sem verde.
- 23.2 — config no editor (modo + campos; presets NEUTROS; validação faixas F19.4 e fórmulas F17; aviso ao trocar modo com fichas; regras de atributo/perícia adaptadas ao modo).
- 23.3 — rolagem e feed nos novos modos (usa o motor; feed por modo; dado 3D coerente; dificuldade ad-hoc).
- 23.4 — rerolagem com recurso (debita antes; só autor; uma vez; janela = até a próxima rolagem própria).
- 23.5 — dados especiais e marcações (config; visual distinto; marcações destacadas; sem automação).
- 23.6 — polimento (retrocompat byte a byte; painel de sessão/combate; vantagem por modo [sucessos ±2 dados; roll_under 2 rolagens]; percentuais F18 NÃO em sucessos/roll_under — editor avisa; regressão WoD-like + roll-under-like).

## Restrições
1. resolutionEngine puro, RNG injetável, exemplos canônicos = testes literais. 2. Modo soma intocado. 3. Um modo por sistema. 4. Presets neutros; textos do mestre; nada proprietário. 5. Marcações/faixas informam, não automatizam. 6. Vantagem por modo e percentuais desabilitados onde não fazem sentido — explícito. 7. Rerolagem debita ANTES, do autor, uma vez. 8. Explosão com limite 20.

## Teste de aceitação
(a) WoD-like: Força+Briga parada d10 dif6, crítico por par de 10s, botch, rerolagem gastando pool, dados de Fome com marcações no feed; (b) roll-under: perícia 60 com qualidades; (c) faixas 2d6 com textos no feed; (d) todos os sistemas soma idênticos; (e) suíte verde.

# Fase 24 — Trilhas, Dots e Estados com Gatilhos

> 2ª fase da trilha "sistemas narrativos". PRÉ-REQ: Fase 23 concluída; usa F17 (fórmulas), F12/14 (condições), F15 (descansos), F19 (faixas). Tudo é MODO alternativo — sistemas numéricos intocados. Sub-fases na ordem; perguntar antes de decisões não especificadas.

## Objetivo
1. **Trilhas** — recursos como caixinhas com TIPOS de marca (superficial `/` e agravado `X`; Sanidade; relógios). Tamanho fixo ou fórmula; comportamento ao encher.
2. **Dots** — exibição de atributos/perícias em bolinhas (●●●○○), edição por clique. SÓ exibição.
3. **Estados com gatilhos** — contadores centrais (Fome 0-5, Humanidade 0-10) com EFEITOS POR FAIXA (via motor F12/18) e destaque na ficha.
4. **Integrações**: trilha pode substituir a vida; estados alimentam dados especiais F23 (`estado(fome)`); descansos e combate entendem trilhas.

## Trilha — config
`{ id, nome, tamanho_formula ("10" ou F17), tipos_marca:[{id,nome,simbolo,severidade}], regra_transbordo:"converter"|"ignorar", ao_encher_do_maior:{rotulo,descricao,aplica_condicao}, substitui_vida, recuperacao:{<descanso_id>:{<tipo>:{modo,valor}}} }`

### CONTRATO DE MARCAÇÃO (testes literais)
1. Marcar T: primeira caixinha VAZIA recebe T.
2. Sem vazia + transbordo=converter: a caixinha com o tipo MENOS severo mais antigo converte para o tipo imediatamente mais severo; se TODAS já são do mais severo → dispara `ao_encher_do_maior`.
3. Marcar tipo mais severo sem vazia: sobrescreve a menos severa mais antiga (primeiro vazias, depois sobrescreve).
4. Curar T remove a marca T mais RECENTE.
5. Exibição: severas à esquerda, depois menos severas, depois vazias — função de exibição, NÃO mutação (armazenar na ordem de marcação). Configurável `ordem_marcada_primeiro`.

### Exemplos canônicos
- Trilha 7 vazia, marcar 3 superficiais → [/, /, /, ○, ○, ○, ○]
- Trilha 7 cheia de superficial, +1 superficial (converter) → [X, /, /, /, /, /, /]
- Trilha 7 [X, X, /, /, ○, ○, ○], +1 agravado → ocupa a primeira VAZIA; exibição reordena → [X, X, X, /, /, ○, ○]
- Trilha cheia de agravado + 1 agravado → dispara "Incapacitado" (condição, feed avisa)
- Curar 1 superficial de [X, /, /, ○...] → [X, /, ○, ○...]

## Dots
- `exibicao: 'numero'|'dots'` (padrão do sistema em `config_layout.exibicao_atributos` + override por atributo), `maximo_dots` (padrão 5, até 10). Valor é NÚMERO em banco/motores/paradas — nenhum motor muda. Clicar na bolinha N define N; clicar na mais alta cheia reduz p/ N-1. Buffs = bolinhas extras destacadas.

## Estado com gatilhos — config
`{ id, nome, min, max, inicial, destaque, efeitos_por_faixa:[{de,ate,modificadores:[...F12],aviso,bloqueios:[...]}], alimenta_dados_especiais }`
- Valor por ficha; +/- com feed opcional. Efeitos por faixa entram/saem AUTOMATICAMENTE via motor F12 (estado = métrica avaliável; NÃO criar segundo mecanismo). `bloqueios` informativos (chip+aviso; desabilita de verdade só onde há integração direta, ex pool ligado). `estado(id)` vira variável F17 — resolve `alimenta_dados_especiais` (quantidade de dados especiais F23 = valor do estado).

## Banco
- `config_layout.trilhas` e `config_layout.estados` (JSONB). Dots: `ALTER TABLE atributos ADD COLUMN exibicao TEXT DEFAULT NULL;` + `config_layout.exibicao_atributos`.
- `CREATE TABLE trilhas_ficha (id, ficha_id FK, trilha_id TEXT, marcas JSONB DEFAULT '[]', UNIQUE(ficha_id,trilha_id))` — marcas = array por caixinha [null|tipoId,...].
- `CREATE TABLE estados_ficha (id, ficha_id FK, estado_id TEXT, valor INT DEFAULT 0, UNIQUE(ficha_id,estado_id))`.
- RLS padrão (dono ALL; membros SELECT). Realtime: adicionar as duas à publicação.

## Sub-fases
- 24.1 `trackEngine.js` puro: `marcar(marcas,tipoId,config)→{marcas,eventos}` (eventos: 'transbordo_convertido', 'encheu_do_maior'), `curar`, `redimensionar` (cresce com vazias; encolhe vazias primeiro, depois menos severas — avisar se remover marcas), `ordenarExibicao`. Testes: canônicos + conversão em cadeia + encher do maior + redimensionar ± + curar inexistente (no-op) + 3 severidades. NÃO avançar sem verde.
- 24.2 trilhas no sistema e na ficha (editor CRUD; caixinhas clicáveis; substitui_vida troca a EXIBIÇÃO/controles mas dano/cura passam pelos fluxos F14/F15 traduzidos p/ marcas; ao_encher aplica condição; restEngine cura marcas por tipo; redimensiona no level-up).
- 24.3 dots (config padrão + override; card F8; perícias; motores intocados).
- 24.4 estados (editor c/ modificador F12 + faixas F19.4; cabeçalho com +/- e cor por faixa; `estado(id)` no formulaEngine; integração dados especiais F23; sessão ao vivo).
- 24.5 polimento (retrocompat absoluta; painéis adaptativos; animações; mobile; feed configurável por trilha; regressão WoD-like com trilhas+dots+Fome).

## Restrições
1. trackEngine puro, contrato = testes literais. 2. Dots é SÓ exibição. 3. Estados usam a coleta F12 — sem segundo mecanismo. 4. Bloqueios informativos. 5. substitui_vida não bifurca a lógica de combate. 6. Encolher nunca perde marcas silenciosamente. 7. `marcas` na ordem de marcação; ordenação severa-à-esquerda é exibição. 8. Nada proprietário — nomes/símbolos/textos do mestre. 9. Retrocompatibilidade é a régua.

## Teste de aceitação da fase
"Vampiro-like" sem conteúdo proprietário: dots; Vitalidade/Força de Vontade como trilhas superficial/agravado (Vitalidade substitui vida, transbordo converte, "Incapacitado" ao encher); Fome 0-5 em destaque alimentando dados especiais F23 com efeito por faixa; descanso curando superficiais; sessão ao vivo; sistemas anteriores intocados; suíte verde.

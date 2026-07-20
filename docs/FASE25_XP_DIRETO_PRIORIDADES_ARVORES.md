# Fase 25 — Progressão por XP Direto, Criação por Prioridades e Árvores de Poder

> 3ª e ÚLTIMA fase da trilha "sistemas narrativos". PRÉ-REQ: F23-24; usa F17 (fórmulas), F19 (progressão), F20 (poderes), F22 (padrão de log). Tudo é MODO alternativo — F19 intocada; o mestre escolhe UMA progressão por sistema. Sub-fases na ordem; perguntar antes de decisões não especificadas.

## Objetivo
1. **XP direto** — sem níveis: XP compra melhorias (atributo/perícia/linha/trilha) com CUSTO POR FÓRMULA por categoria ("novo_valor * 5"). Tudo logado.
2. **Criação por prioridades** — assistente WoD: distribuir valores entre GRUPOS (7/5/3 Físico/Social/Mental; 13/9/5 perícias), etapas configuráveis.
3. **Árvores/linhas de poder** — linhas com RATING em dots (Dominação ●●●) compradas com XP; cada nível desbloqueia poderes (F20) daquele nível.

## Config unificada
`config_layout.progressao = { modo: 'nivel'|'xp_direto'|'nenhum', categorias_compra: [{ id, nome, alvo: 'atributo'|'pericia'|'linha_poder'|'trilha_tamanho_bonus', custo_formula, maximo, custo_formula_fora? }] }`
— amplia a `progressao_xp` da F19 (que segue sendo a CURVA do modo 'nivel'). Migração: sistemas existentes → modo 'nivel' (comportamento F19 idêntico, inclusive curva 'nenhum' = subida manual).

## CONTRATO DE COMPRA (testes literais)
1. Compra sobe o alvo em EXATAMENTE +1 por transação.
2. Custo = fórmula avaliada com `novo_valor` = valor APÓS a compra (variável canônica; demais variáveis F17 valem).
3. Só compra se XP ≥ custo e novo_valor ≤ máximo da categoria.
4. Débito/crédito SEMPRE logados (xp_log, padrão F22): ganho (mestre, com motivo), gasto (alvo + de/para), ajuste.
5. Compra definitiva; correção via ajuste do mestre (sem "vender de volta").
Exemplos: atributo 2→3 "novo_valor*5" = 15; perícia 0→1 "*3" = 3; linha nativa 2→3 = 15, não-nativa (custo_formula_fora "*7") = 21; bloqueio por XP e por máximo; log íntegro (Σganhos−Σgastos=saldo).

## Criação por prioridades
`config_layout.criacao_prioridades = { ativo, etapas: [...] }` — tipos: `prioridade_grupos` (jogador ORDENA grupos nos valores_prioridade; distribui pontos entre membros com base_por_membro/maximo_por_membro; validação EXATA), `pontos_livres` (N pontos entre itens do alvo; apenas_nativas), `texto_guia`. Voltar permitido antes de finalizar; finalizar grava tudo + log. MÉTODOS DE CRIAÇÃO EXCLUDENTES: rolagem F3 | pontos F22 | prioridades F25.

## Árvores/linhas de poder
Tabela `linhas_poder` (sistema, nome, maximo). `poderes.linha_id` + `poderes.nivel_linha` (poder pendura numa linha/nível). `linhas_ficha` (ficha×linha×rating; dots F24.3). Nativas: `racas.linhas_nativas`/`classes.linhas_nativas` (UUID[]) — nativa usa custo_formula, fora usa custo_formula_fora. Rating ≥ nível → poderes desbloqueados (fluxo F20.4; abaixo = "req. X"); `auto_conceder` opcional. NÃO é segundo sistema de poderes — agrupador com rating sobre a F20.

## Banco (pré-req manual; SQL completo em sql/fase25_pre_req.sql)
linhas_poder + poderes.linha_id/nivel_linha + linhas_ficha + racas/classes.linhas_nativas + xp_log + RLS padrão + Realtime linhas_ficha (opcional). `fichas.xp` (F19) reutilizado como saldo no xp_direto. Migração de config progressao→ read-time no merge + script opcional.

## Sub-fases
- 25.1 modo unificado (migração F19→25 idempotente, revisada pelo usuário) + `purchaseEngine.js` puro (custoCompra/validarCompra) + `novo_valor` na gramática + editor (modo + CRUD categorias). Testes canônicos. NÃO avançar sem verde.
- 25.2 comprar na ficha (modo xp_direto: XP em destaque, sem nível; fluxo categoria→alvo→custo ao vivo→confirma→aplica+debita+loga+feed; afford-hint nos dots; mestre concede XP; histórico legível).
- 25.3 linhas de poder (editor CRUD + campos no poder + nativas em raça/classe; painel Linhas na ficha com rating em dots e poderes por nível desbloq./bloq.; compra via 25.2; auto_conceder).
- 25.4 assistente de prioridades (editor de etapas; fluxo com ordenação de grupos, contadores validados EXATOS, revisão, finalizar; excludência dos 3 métodos).
- 25.5 polimento + ACEITAÇÃO (WoD-like de referência completo: criar 7/5/3+13/9/5+3 pontos em linhas nativas; jogar F23/24; ganhar XP e comprar atributo/perícia/rating 2 desbloqueando poderes — tudo logado; sistemas anteriores intocados).

## Restrições
1. purchaseEngine puro; canônicos = testes literais. 2. Progressões EXCLUDENTES (nivel|xp_direto|nenhum); métodos de criação idem. 3. Compra +1, definitiva, logada. 4. `novo_valor` = variável canônica (valor APÓS). 5. REUSAR: dots F24.3, catálogo F20, log F22 — nada paralelo. 6. Nativas via raça/classe (sem entidade "clã"). 7. Assistente valida exato; voltar antes de finalizar. 8. Nada proprietário. 9. Retrocompat é a régua — F19 intocada.

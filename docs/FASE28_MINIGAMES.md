# Fase 28 — Minigames de teste

> 3ª fase do roadmap de paridade com o LICHRPG. Usa F7 (feed/`registrarEvento`), F13 (sessão), F16 (papéis, `sou_gestor`, `pode_escrever_mesa`), F27 (padrão de ouvinte no App). Sub-fases na ordem.

## Objetivo
Testes de **habilidade real do jogador** como alternativa aos dados: três minigames jogáveis no navegador (mouse, toque e teclado), com resultado enviado direto para o feed da mesa, ranking por mesa e **desafios** em que o mestre põe vários jogadores para disputar o mesmo jogo, nas mesmas condições.

## Os jogos (motores puros, determinísticos por semente)
- **Roda Rúnica** — um ponteiro gira; uma runa acende num arco. Tocar com o ponteiro dentro do arco = acerto (combo sobe, ponteiro acelera, arco estreita; nas dificuldades altas o giro inverte). Tocar fora ou deixar o arco passar tempo demais = perde uma vida e zera o combo. Acaba sem vidas. **Pontos por acerto = 1 + ⌊combo/5⌋** (combos multiplicam). Mede pontos, acertos, maior combo e tempo sobrevivido.
- **Cronômetro** — "pare exatamente em X,XX s". O cronômetro some depois de um tempo (ou nem aparece, no Impossível). **Pontos = max(0, 1000 − erro em ms)**, com faixa (Perfeito ≤ 30 ms, Excelente ≤ 100, Bom ≤ 250, Razoável ≤ 500, Errou).
- **Memória** — uma sequência de runas aparece por pouco tempo e some; repetir a ordem tocando nas runas. Acertou a sequência inteira → próxima rodada com uma runa a mais. Errou → acaba. **Pontos = runas certas no total**; mede a maior sequência.
- **Dificuldades:** Normal, Difícil, Impossível e **Personalizada** (qualquer parâmetro — sem limite).
- **Semente:** mesma semente + mesma configuração = mesma partida (mesmos arcos, alvo, sequências). É o que torna um desafio justo.

## Desafios (competitivo)
Mestre/co-mestre cria: jogo, dificuldade, participantes (quantos quiser, incluindo ele mesmo), meta opcional ("precisa de 800 pontos") e motivo. Cada participante recebe um aviso em qualquer página da mesa, joga, e o resultado aparece ao vivo no painel do mestre. Ao encerrar, o feed recebe a classificação ("1º Aria 23 · 2º Borin 17") e quem bateu a meta.

## Banco (`sql/fase28_minigames.sql`)
- `desafios (id, mesa_id, criado_por, tipo, dificuldade, config JSONB, semente BIGINT, participantes UUID[], meta INT NULL, motivo, status 'aberto'|'encerrado', created_at, encerrado_em)` — SELECT membro; escrita só gestor.
- `minigames_resultados (id, mesa_id, usuario_id DEFAULT auth.uid(), ficha_id NULL, desafio_id NULL, tipo, dificuldade, pontos INT, detalhes JSONB, created_at)` — SELECT membro; INSERT próprio se `pode_escrever_mesa` (espectador não joga valendo); DELETE próprio ou gestor. Em desafio, só participante e uma vez (índice único `(desafio_id, usuario_id)`).
- Realtime nas duas. O feed usa `rolagens` via `registrarEvento` com `resultados.minigame`.
- Limite honesto: o placar é calculado no navegador de quem joga (como no Lich) — é jogo entre amigos, não competição com prêmio.

## Sub-fases
- **28.1 motores** — `lib/minigames/` (`semente.js`, `rodaRunica.js`, `cronometro.js`, `memoria.js`, `resultado.js`) + testes (determinismo por semente, regras, pontuação, dificuldades).
- **28.2 jogos jogáveis** — componentes dos 3 jogos + `JogoMinigame` (instruções, contagem 3-2-1, jogo, tela de resultado); teclado (espaço/enter), toque e mouse; seção de teste em `/teste-dados`.
- **28.3 banco** — SQL + RLS + Realtime (rodado e testado em transação desfeita); `useMinigames`.
- **28.4 jogar pela mesa** — painel "Minigames" (escolher jogo/dificuldade, jogar, resultado no feed, ranking da mesa, minhas estatísticas) na aba Dados da mesa e na gaveta de rolagens do mapa.
- **28.5 desafios** — criar (gestor), aviso ao participante em qualquer página da mesa (ouvinte no App), resultados ao vivo, encerrar com classificação no feed.
- **28.6 polimento + aceitação** — celular, sons, acessibilidade possível (teclado; o jogo é de reflexo por natureza), docs.

## Restrições
1. Motores puros, sem `Math.random` direto: tudo pela semente. 2. Tempo passado explicitamente aos motores (testáveis sem relógio). 3. Resultado no feed sempre com jogo e dificuldade. 4. Sem limite de participantes, partidas ou parâmetros. 5. Retrocompatível: sem o SQL, jogar avulso funciona e vai ao feed; ranking e desafios mostram aviso.

## Como ficou (implementado — a639219 … 28.6)
- **Arquivos:** `lib/minigames/` (semente, rodaRunica, cronometro, memoria, resultado, desafios + testes e aceitação); `components/minigames/` (JogoRodaRunica, JogoCronometro, JogoMemoria, JogoMinigame, SeletorJogo, PainelMinigames, PainelDesafios, OuvinteDesafios); hooks `useMinigames` (+ `registrarResultado` solto) e `useDesafios`; `sql/fase28_minigames.sql` (rodado).
- **Onde:** aba Dados da mesa (minigames + desafios), gaveta de rolagens do mapa (minigames), página da sessão (desafios), aviso de desafio em qualquer página da mesa (App).
- **Segurança:** RLS testado 20/20 no banco real. Resposta de desafio não pode ser apagada pelo jogador (senão apagaria e jogaria de novo); placar sem UPDATE.
- **Achado de passagem (fora da fase):** `expulsar_membro` aceitava chamada sem login → `sql/seguranca_funcoes_anon.sql` (anônimo sem EXECUTE em funções; lógica corrigida).
- **Canais Realtime com nome único por instância** (`useId`): com o mesmo nome o Supabase devolve o canal existente e dois painéis na mesma página se atrapalhariam.
- **Sons:** acertos/erros/faixas usam os presets de "sons de ação" e respeitam essa preferência.
- **Limites conhecidos:** placar calculado no navegador (como no Lich); desafios/resultados testados sem duas contas reais ao mesmo tempo (RLS e motores testados; interface do desafio revisada, não clicada logada).

## Teste de aceitação da fase
Mesma semente produz a mesma Roda/Cronômetro/Memória; acertar 5 seguidos na Roda dobra os pontos por acerto; parar o cronômetro 20 ms fora dá "Perfeito" 980; memória erra na 2ª runa da rodada 3 → pontos = 4+5+1 (Normal). Mestre desafia 3 jogadores na Roda Difícil com meta; cada um joga uma vez só; resultados chegam ao vivo; encerrar publica "1º … 2º … 3º" e quem bateu a meta. Espectador não registra resultado. Suíte verde.

# Fase 27 — Dados 3D na mesa (física, para todos)

> 2ª fase do roadmap de paridade com o LICHRPG. Usa F7 (rolagem/feed/Realtime), F11 (dado three.js, skins, som), F23 (modos de resolução — o resultado continua vindo deles). Sub-fases na ordem.

## Objetivo
Toda rolagem da mesa cai numa **bandeja** por cima da tela de todos que estão na mesa (mesa, sessão, mapa, ficha): dados 3D com **física real** (queda, quique, rolamento, parada), na **skin de quem rolou**, e ao parar mostram o **resultado oficial**. Sem limite de quantidade de dados.

## Decisões (2026-09-16)
- **Física com `cannon-es`** (MIT, pmndrs), carregada sob demanda no mesmo chunk do three.js — nunca no bundle inicial (regra F11).
- **Resultado ≠ física:** o número exibido é o de `rolagens.resultados` (RNG oficial da F7/F23). A física é só visual; cada navegador simula a sua (não precisa ser idêntica entre clientes).
- **Revê a F11.5** ("só o autor vê o 3D"): passa a ser preferência `dados_mesa: 'todos' | 'meus' | 'nenhum'`, padrão `'todos'` (paridade com o Lich). Os dados pequenos dentro dos cards continuam como estão.
- **Sem limite de quantidade:** até 40 dados rolam fisicamente por vez; o excedente aparece somado num selo "+N dados (soma S)" — o resultado completo continua no feed.
- **prefers-reduced-motion:** sem bandeja (os dados dos cards bastam).

## Contratos
- `resultados.skin` (novo, opcional) gravado em toda rolagem; ausente → `padrao`.
- Evento dispara a bandeja: INSERT em `rolagens` da mesa via Realtime (inclusive as minhas). Rajadas não viram chuva de dados: no máximo 6 lançamentos simultâneos, saem os mais antigos (sem comparar relógios — o do navegador pode estar errado).
- `lib/bandejaDados.js` (puro, testado): `planejarLancamento(n, bandeja, rng)`, `separarExcedente(dados, limite)`, `enfileirarLancamento(fila, novo)`, `deveMostrar(pref, ehMinha)`.
- `lib/fisicaDados.js` (three + cannon-es, só no chunk lazy): geometria por nº de lados e o corpo convexo gerado dos MESMOS vértices (o que se vê é o que colide); mundo com chão, paredes nas bordas da tela e teto.

## Sub-fases
- **27.1 bandeja** — `cannon-es`; `lib/bandejaDados.js` + testes; `components/dados/BandejaDados3D.jsx` (lazy: renderer em canvas de tela cheia, chão + paredes nas bordas da tela, corpos convexos por tipo de dado, dorme → rótulos com o valor, some com fade); botão na `/teste-dados`.
- **27.2 para todos** — `resultados.skin` nas inserções do `useRolagem`; `OuvinteDadosMesa` montado uma vez no `App` (via rota `/mesa/:id/*`), lê a preferência, ignora rajadas, enfileira rolagens simultâneas.
- **27.3 preferências e polimento** — opção no modal de preferências; reduced-motion; excedente somado; DPR limitado no celular; dispose de geometria/material/renderer; teste de aceitação.

## Restrições
1. three.js e cannon-es fora do bundle inicial. 2. O valor exibido é sempre o oficial. 3. A bandeja nunca captura clique (pointer-events: none). 4. Nada grava no banco além de `resultados.skin`. 5. Retrocompatível: rolagens antigas sem `skin` rolam com a padrão.

## Como ficou (implementado — 76ee776, 2672805, 27.3)
- **Arquivos:** `lib/bandejaDados.js` (+ testes), `lib/fisicaDados.js` (+ testes que simulam), `lib/materialDado.js`, `components/dados/BandejaDados.jsx` (invólucro leve), `BandejaDados3D.jsx` (lazy), `OuvinteDadosMesa.jsx` (no `App`), `bandeja.acceptance.test.js`; `/teste-dados` tem botões da bandeja.
- **Física:** corpo convexo com triângulos coplanares fundidos (faces trianguladas faziam o d12 tremer sem nunca dormir) e 30 iterações de solver.
- **Tela:** portal no `<body>` (o `transform` da transição de página prendia o `fixed` à página); tamanho medido pelo canvas (sem barra de rolagem); o **lado menor da tela** vale 12 unidades (9 em telas < 600 px) — no celular em pé a bandeja fica alta, não estreita.
- **Tempo máximo rolando** conta em segundos de física (aparelho lento não mostra valor com dado no ar).
- **Som:** quem rolou ouve no clique; os outros ouvem o dado cair; o feed não toca aviso quando a bandeja vai mostrar a rolagem.
- **Rajadas:** teto de 6 lançamentos simultâneos em vez de comparar horário (relógio do navegador pode estar errado).
- **Limites conhecidos:** d10/d100 usam icosaedro (como na F11); a física não é idêntica entre navegadores (só o valor é).

## Teste de aceitação da fase
Jogador A (skin Madeira) rola 3d6 na ficha; jogador B, no mapa, vê 3 dados de madeira caírem, quicarem e pararem mostrando os mesmos valores do feed; A também vê. B com preferência "só os meus" não vê a de A. Rolagem de 60d6 mostra 40 dados + "+20 dados (soma S)". Rajada de 10 rolagens seguidas mostra no máximo 6 lançamentos. Suíte verde, build com three/cannon fora do chunk inicial.

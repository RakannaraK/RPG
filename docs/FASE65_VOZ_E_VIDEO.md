# Fase 65 — Chamada de voz e vídeo

Uma chamada por mesa, direto entre os navegadores (WebRTC), sem servidor de mídia e sem dependência nova. Estava registrado como "não fazer"; foi reaberto a pedido do dono em 2026-11-13.

Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas.

## Como funciona

- Malha ponto a ponto: cada participante se liga a cada um dos outros. Teto de 8 pessoas por chamada.
- Sinalização por um canal PRIVADO do Supabase Realtime, tópico `chamada:<id da mesa>`: `supabase.channel('chamada:' + mesaId, { config: { private: true, broadcast: { self: false }, presence: { key: idDoPar } } })`. Broadcast leva oferta, resposta e candidatos; Presence diz quem está na chamada.
- SQL `sql/fase65_chamada.sql` (já rodado): a função `posso_entrar_na_chamada(topico)` e duas políticas em `realtime.messages` deixam só membro da mesa receber e enviar nesse tópico. É a exceção à regra do `useId()` no nome do canal: o tópico precisa ser fixo, e cada página monta a chamada uma vez só.
- Antes de assinar o canal privado, chamar `await supabase.realtime.setAuth()` (a documentação pede para canais com autorização).
- Servidores ICE: por padrão só o STUN público `stun:stun.l.google.com:19302`. Se existir a variável `VITE_ICE_SERVERS` (JSON com a lista no formato de `RTCConfiguration.iceServers`), ela substitui o padrão; é o lugar de pôr um TURN no futuro.

## `src/lib/chamada.js` (puro, com teste em `chamada.test.js`)

- `MAX_PARTICIPANTES = 8`.
- `servidoresIce(textoDaVariavel)`: lê o JSON da variável; inválido ou vazio devolve o padrão.
- `quemOferece(meuId, outroId)`: `true` se `meuId < outroId` (só um dos dois lados cria a oferta, sem colisão).
- `normalizarSinal(payload)`: o que chega pelo broadcast é dado não confiável. Aceita só `{ de, para, tipo: 'oferta' | 'resposta' | 'candidato', sdp?, candidato? }`, com ids no formato de uuid, `sdp` texto de até 20 000 caracteres e `candidato` objeto pequeno; senão devolve `null`.
- `participantesDaPresenca(estado)`: lista `{ id, usuarioId, nome, avatar, mic, cam }` sem repetição, com textos cortados e no máximo `MAX_PARTICIPANTES`.

## `src/hooks/useChamada.js`

`useChamada(mesaId)` devolve `{ estado, participantes, naChamada, entrar, sair, micLigado, alternarMic, camLigada, alternarCam, fluxos, erro }`.

- `estado`: `'fora' | 'entrando' | 'dentro'`. `participantes` vem da Presence mesmo com a pessoa fora da chamada (para mostrar "3 na chamada"); quem está só olhando não anuncia presença.
- Cada aba tem um id próprio (`crypto.randomUUID()`), então a mesma pessoa em duas abas conta duas vezes sem quebrar nada.
- `entrar()`: pede o microfone (`getUserMedia` com cancelamento de eco e redução de ruído), anuncia presença com nome e avatar da pessoa na mesa, e cria uma `RTCPeerConnection` por participante já presente (quem oferece é decidido por `quemOferece`). Áudio e vídeo têm transceptores desde o começo; ligar a câmera depois usa `replaceTrack`, sem renegociar.
- Câmera começa desligada. `alternarMic` só liga e desliga a faixa (`enabled`), e atualiza a presença.
- `fluxos`: `{ [idDoPar]: MediaStream }` dos outros, mais o próprio vídeo local.
- Recusar um participante que passaria do teto. Fechar tudo em `sair()`, ao desmontar e no evento `pagehide`.
- Erros em português: permissão do microfone negada, navegador sem suporte, chamada cheia, falha ao entrar no canal.

## `src/components/chamada/BarraChamada.jsx`

- Montada uma vez em `src/App.jsx`, ao lado dos outros ouvintes, só em rotas `/mesa/:id/*` e com a pessoa logada. Como fica fora das páginas, a chamada continua ao trocar entre ficha, sessão e mapa da mesma mesa; ao sair da mesa, encerra.
- Fora da chamada: um botão compacto "Entrar na chamada" com a contagem de quem está nela.
- Dentro: um cartão flutuante com um quadro por participante (vídeo se a câmera estiver ligada; senão avatar e nome), marca de microfone desligado e destaque em quem está falando (medidor simples com `AnalyserNode`, umas 10 vezes por segundo). Botões: microfone, câmera, sair. Dá para recolher o cartão sem sair da chamada.
- O áudio dos outros toca por elementos `<audio autoplay>`; o próprio vídeo aparece espelhado e sem som.
- Posição: escolher um canto que não cubra os outros elementos fixos que já existem (bandeja de dados, cartão de desafio, trilha e efeitos, barra de ferramentas do mapa). Conferir no código onde cada um fica.
- Acessibilidade: botões com rótulo, estado com `aria-pressed`, região com `aria-label="Chamada da mesa"`, avisos de erro com `role="alert"`.

## Limites conhecidos

- Sem servidor TURN: em algumas redes (operadora de celular, empresa) a ligação direta não fecha e a pessoa não ouve os outros. A saída é contratar um TURN e pôr em `VITE_ICE_SERVERS`.
- O STUN é um servidor do Google: ele vê o endereço IP de quem entra na chamada, e os participantes veem o IP uns dos outros (é assim que a ligação direta funciona).
- Malha: acima de umas 6 pessoas com vídeo, pesa na banda de cada um.
- Sem gravação, sem compartilhar tela, sem volume por pessoa.

## Como ficou

- `src/lib/chamada.js`, `src/hooks/useChamada.js` e `src/components/chamada/BarraChamada.jsx`, montada no `App.jsx`. O cartão fica no canto superior direito, abaixo dos modais (`z-[45]`).
- Quem oferece cria os transceptores de áudio e vídeo; quem responde põe os seus em `sendrecv` e usa `replaceTrack` antes de responder. Ligar a câmera depois é só `replaceTrack`, sem renegociar. Candidatos que chegam cedo esperam numa fila.
- Uma oferta só é aceita de quem está na presença e é o lado que deveria oferecer.
- A mesma pessoa em duas abas aparece duas vezes na lista, mas as abas não se ligam entre si (evita eco).
- Queda de conexão: o par é refeito pelo lado que oferece, até 2 vezes; o quadro mostra "Reconectando…" e depois "Sem ligação".
- Botões com texto ("Mic", "Câmera", "Sair"): o site não tem esses ícones.

### Como foi conferido

- Lint sem erros, build ok, testes passando (9 em `chamada.test.js`).
- Banco, em transação desfeita: `posso_entrar_na_chamada` devolve verdadeiro para membro e dono, falso para estranho e para tópico malformado; anônimo não executa.
- Navegador, duas abas com microfone e câmera falsos e o canal trocado por um canal local de teste: as duas ficam ligadas, com áudio chegando nos dois sentidos e vídeo dos dois lados; microfone desligado aparece no outro lado; sair encerra faixas e conexões; a reconexão refaz a ligação quando a queda é simulada.
- NÃO conferido, porque depende de login real e de duas pessoas: a autorização do canal privado na prática (um não membro tentando entrar), a chamada em redes diferentes (onde a falta de TURN pesa), a chamada cheia e o áudio de verdade.

# Fase 26 — Mesa Virtual (mapa)

> 1ª fase do roadmap de paridade com o LICHRPG (`ROADMAP_PARIDADE_LICH.md`). Usa F13 (sessão/presença), F14 (combate), F7 (feed/rolador). Sem dependência nova (SVG + Pointer Events nativos). Sub-fases na ordem; perguntar antes de decisões não especificadas. Sem limite de quantidade (cenas, tokens, desenhos); só tamanho de arquivo.

## Objetivo
Mapa em tela cheia, sincronizado ao vivo para a mesa: cenas preparadas pelo mestre, grade ajustável, tokens arrastáveis ligados a fichas e combatentes, névoa de guerra, desenho livre, régua, ping e um painel com rolagens/combate/ficha sem sair do mapa.

## Rota e entrada
- `/mesa/:id/mapa` → `pages/MapaPage.jsx` (ocupa a tela toda, sem rolagem de página).
- Botão "🗺 Mapa" no cabeçalho da MesaPage e da SessaoPage.
- Mesa arquivada / espectador: vê, não edita.

## Coordenadas (contrato)
- Tudo é gravado em **pixels da imagem do mapa** (tamanho natural após compressão).
- Visão local `{x, y, zoom}`: `tela = mapa × zoom + (x, y)`. Nunca gravada no banco.
- Zoom limitado a [0,05; 8]. Zoom da roda/pinça mantém fixo o ponto sob o cursor/dedos.

## Grade — `mapas.grade` (JSONB)
`{ ativa, tamanho (px, aceita decimal), offset_x, offset_y, cor, opacidade, unidade (ex 1.5), unidade_nome (ex "m"), diagonal: 'chebyshev'|'alternada'|'euclidiana' }`
- Encaixe do token de `s` células: centro em `offset + (round((p − offset − s·t/2)/t) + s/2)·t` (ímpar → centro da célula; par → cruzamento).
- Distância entre dois pontos: células `(di, dj)` de cada ponta → chebyshev `max`; alternada `max + floor(min/2)` (5-10-5); euclidiana `√(di²+dj²)` com 1 casa. Valor exibido = células × unidade.
- Atalho no editor: "N quadrados na largura" → `tamanho = largura / N`.

## Névoa — `mapas.nevoa` (JSONB)
`{ ativa, ops: [ {modo:'revelar'|'cobrir', forma:'ret', x,y,w,h} | {modo, forma:'traco', pontos:[[x,y]…], raio} | {modo, forma:'tudo'} ] }`
- Névoa ativa com `ops` vazia = tudo coberto. Ops aplicadas **em ordem** (máscara SVG).
- Op `forma:'tudo'` descarta todas as anteriores (compactação). Retângulo arrastado ao contrário é normalizado.
- Mestre vê a névoa translúcida; jogadores, opaca. Tokens e desenhos ficam **abaixo** da névoa para jogadores.
- Limite honesto: névoa é visual. Para esconder de verdade, o token deve ser marcado `oculto` (RLS não entrega ao jogador).

## Banco (`sql/fase26_mesa_virtual.sql`, idempotente)
- `mapas (id, mesa_id FK, nome, imagem_url, imagem_path, largura, altura, grade JSONB, nevoa JSONB, jogadores_desenham BOOL DEFAULT TRUE, ativo BOOL DEFAULT FALSE, ordem, created_at)` + índice único parcial `(mesa_id) WHERE ativo` (uma cena ativa por mesa).
- `tokens_mapa (id, mapa_id FK, mesa_id, ficha_id FK NULL, combatente_id FK NULL, nome, imagem_url, cor, x, y, tamanho NUMERIC DEFAULT 1, oculto BOOL, created_at)`.
- `desenhos_mapa (id, mapa_id FK, mesa_id, autor_id DEFAULT auth.uid(), forma 'livre'|'linha', pontos JSONB, cor, espessura, created_at)`.
- RLS: **mapas** — gestor ALL; membro SELECT só da cena ativa (cenas preparadas não vazam). **tokens** — gestor ALL; membro SELECT de tokens não-ocultos da cena ativa; dono da ficha UPDATE do próprio token. **desenhos** — membro SELECT; INSERT se gestor OU (membro não-espectador E `jogadores_desenham`); DELETE autor OU gestor.
- Realtime nas três. Eventos que o RLS esconde do jogador (cena desativada, token ocultado) são avisados por broadcast `recarregar` no canal do mapa.
- Storage: bucket `fichas-imagens`, pasta `${uid}/mapas/${mesaId}/` (política de INSERT atual já cobre).

## Arquivos
- Imagem do mapa: maior lado ≤ 4096 px, sempre recomprimida em JPEG; recusa > 10 MB após compressão. Token: ≤ 512 px.

## Tempo real
- Banco (postgres_changes): cenas, tokens, desenhos, névoa — estado persistente.
- Broadcast no canal `mapa-${mesaId}` (efêmero, nada gravado): arraste de token em andamento (~15/s), régua, ping, `recarregar`.

## Sub-fases
- **26.1 base** — SQL; `lib/mapaEngine.js` puro (visão/zoom, enquadrar, encaixe, distância, névoa) + testes; `useMapas(mesaId)` (CRUD de cenas, upload comprimido, ativar/desativar, Realtime + broadcast); MapaPage com pan/zoom (mouse, roda, toque/pinça), ajustar à tela, tela cheia, grade (SVG pattern) e editor de grade do mestre; painel de cenas do mestre; jogador vê a cena ativa e acompanha a troca ao vivo; botões de entrada.
- **26.2 tokens** — `useTokensMapa`; adicionar token de ficha da mesa / dos combatentes do combate ativo / avulso (imagem ou cor+iniciais); arrastar com encaixe e broadcast; tamanho em células; ocultar; permissão (dono move o seu, mestre tudo); barra de vida (ficha via motor da sessão; inimigo via combatente — só o mestre vê a de inimigos); destaque do turno atual.
- **26.3 névoa** — ativar; revelar/cobrir com retângulo e pincel; revelar/cobrir tudo; translúcida p/ mestre, opaca p/ jogadores.
- **26.4 desenho, régua e ping** — pincel livre e linha reta (cor/espessura), borracha (próprio; mestre qualquer), limpar (meus / tudo p/ mestre), interruptor "jogadores podem desenhar"; régua visível a todos com distância na unidade; ping (ferramenta + segurar parado).
- **26.5 painel da mesa** — gaveta lateral: Rolagens (feed + rolador), Combate (ordem, turno, próximo turno p/ mestre), Ficha (abre a ficha completa dentro da gaveta); camadas visíveis por pessoa (grade, desenhos, tokens, "ver como jogador" p/ mestre); atalhos de teclado; mobile.
- **26.6 polimento + aceitação** — reconexão re-sincroniza; limpeza do arquivo ao apagar cena; estados vazios; desempenho (arraste sem re-render global); teste de aceitação do motor.

## Restrições
1. `mapaEngine` puro; contrato = testes. 2. Coordenadas sempre em px do mapa. 3. Nada efêmero no banco (arraste/régua/ping só broadcast). 4. Sem dependência nova. 5. Sem limite de quantidade. 6. Retrocompatibilidade: nada do que existe muda de comportamento; sem o SQL, o botão Mapa mostra aviso e o resto do app segue igual.

## Teste de aceitação da fase
Mestre prepara 2 cenas (uma com grade 5-10-5 em metros), ativa a primeira; jogador entra e vê só ela; mestre troca de cena e o jogador acompanha sem recarregar; tokens de 2 fichas + 3 inimigos do combate ativo; jogador move só o próprio token e todos veem o arraste; destaque segue o turno; névoa revelada por retângulo e pincel esconde o resto do jogador; régua mede "3 quadrados · 4,5 m" igual para todos; ping visível; rolagem feita pelo painel aparece no feed da sessão; suíte verde.

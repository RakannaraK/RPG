# Fase 34 — Escudo do mestre e overlay para OBS

> 9ª fase do roadmap de paridade com o LICHRPG. Junta o que já existe (tabelas aleatórias, relógios, notas da F29, bestiário da F31, combate) numa tela só, e publica um painel de vida por **link secreto** para quem transmite.

## Escudo do mestre
Uma tela (aba **Escudo** na mesa) com o que o mestre olha o tempo todo, sem ficar trocando de página:
- **Turno e rodada** do combate ativo, com a ordem de iniciativa compacta.
- **Vida de todo mundo** (inclui a forma ativa, F33) e as condições em jogo.
- **Tabelas aleatórias** do sistema com um botão de rolar (o resultado vai ao feed).
- **Notas fixadas** (F29) e **relógios da campanha**.
- **Rolador** e atalho para o bestiário.
Nada novo no banco: é montagem do que já existe, só para o mestre (jogador não vê a aba).

## Overlay para OBS (link secreto)
Uma página **sem login**, fundo transparente, para entrar como "fonte de navegador" no OBS: retratos e barras de vida do grupo, turno atual e última rolagem — o que o mestre escolher mostrar.
- O link tem um **token secreto** (`/overlay/<token>`); sem token válido, nada aparece.
- O mestre escolhe: vida em números, só barra ou nada; mostrar turno; mostrar última rolagem; tamanho.
- Ficha privada (F30) **nunca** entra no overlay. Notas, chat e eventos secretos também não.
- Regenerar o token invalida o link antigo na hora.

## Banco (`sql/fase34_overlay.sql`)
- `mesas.overlay_token TEXT` (único quando existe) e `mesas.overlay_config JSONB`.
- `overlay_dados(token)` — SECURITY DEFINER, **a única função que o anônimo pode chamar**: devolve só o que o token libera e só o que a configuração manda mostrar.
- `definir_overlay(mesa, config, novo_token)` — gestor (dono ou co-mestre) ajusta a configuração e gera/regenera o token.

## Sub-fases
- **34.1** — SQL + RPCs + testes no banco (token errado não devolve nada; ficha privada fora; anônimo não lê tabela nenhuma direto).
- **34.2** — página `/overlay/:token` (sem login, fundo transparente, atualiza sozinha) + painel de configuração do overlay na mesa.
- **34.3** — aba **Escudo** do mestre.
- **34.4** — aceitação + docs.

## Restrições
1. Sem o SQL: nada muda; a aba Escudo funciona (é só montagem) e o overlay avisa que falta ativar. 2. O overlay é só leitura e só do que o mestre liberou. 3. O anônimo continua sem acesso a tabela nenhuma: ele só chama `overlay_dados`. 4. Sem limite de mesas com overlay.

## Como ficou (implementado — 34.1 … 34.4)
- **Arquivos:** `pages/OverlayPage.jsx` (rota pública `/overlay/:token`), `components/mesa/PainelOverlay.jsx` (link e configuração), `components/mesa/PainelEscudo.jsx` (aba Escudo), `lib/barraVida.js` puro (barra com escudo, usada no overlay E no escudo) + testes; `sql/fase34_overlay.sql` (rodado, 16/16 no banco).
- **Overlay:** fundo transparente de verdade, retratos, barra de vida com pedaço de escudo (vida temporária), turno e última rolagem conforme a configuração; atualiza sozinho a cada 3 s (o anônimo não tem Realtime). Link inválido mostra só um aviso discreto.
- **Configuração (mestre):** vida em barra/números/nada, sentido deitado ou em pé, tamanho, mostrar turno, mostrar última rolagem; botões copiar, abrir prévia e **trocar link** (invalida o antigo na hora).
- **Escudo:** turno e ordem de iniciativa, vida do grupo, tabelas aleatórias do sistema com rolagem indo ao feed, notas fixadas, relógios da campanha, rolador e o painel do overlay.
- **Segurança:** `overlay_dados` é a única função que o anônimo pode chamar; testado no banco que ele não lê tabela nenhuma direto, que ficha privada fica fora, que token errado/curto não devolve nada e que regenerar invalida o link.
- **Limites conhecidos:** o overlay pergunta de novo a cada 3 s (não é instantâneo); quem tiver o link vê as barras (é um link secreto, como no Lich).

## Teste de aceitação
Gerar o link, abrir sem estar logado: aparecem os retratos e as barras de vida do grupo; tomar dano na sessão muda a barra no overlay em poucos segundos; ficha privada não aparece; trocar a configuração para "não mostrar vida" tira os números; regenerar o token faz o link antigo mostrar "link inválido". Na aba Escudo, o mestre vê turno, vidas, tabelas aleatórias (com rolagem indo ao feed), notas fixadas e relógios.

# Fase 29 — Chat da mesa, notas e calendário do mundo

> 4ª fase do roadmap de paridade com o LICHRPG. Usa F7 (feed/`registrarEvento`/`registrarRolagem`), F16 (papéis, `sou_gestor`, `minhas_mesas`), F26 (painéis do mapa). Sub-fases na ordem.

## Objetivo
Três ferramentas de mesa que o Lich tem e aqui faltavam, sem limite de quantidade:
- **Chat** ao vivo, com **sussurro** (mensagem só para quem você escolher) e **`/r 2d6+3`** para rolar direto do chat (vai ao feed, com dado 3D).
- **Notas** privadas (do mestre ou de qualquer membro) — e, se o autor quiser, **compartilhadas** com a mesa (handouts, resumo, pistas).
- **Calendário do mundo**: meses e dias da semana do jeito que o mestre quiser, data atual da campanha, **passar o tempo** (vai ao feed), eventos anuais ou únicos, eventos **secretos** (só o mestre vê).

## Banco (`sql/fase29_chat_notas_calendario.sql` — rodado)
- `mensagens_mesa (id, mesa_id, autor_id, texto ≤ 2000, para UUID[] NULL, created_at)` — lê: membro; sussurro só autor e destinatários (nem o mestre lê sussurro alheio). Escreve: qualquer membro, espectador inclusive, se a mesa não está arquivada. Apaga: autor ou gestor. Sem edição.
- `notas_mesa (id, mesa_id, autor_id, titulo ≤ 200, texto ≤ 100 000, compartilhada, fixada, created_at, updated_at)` — lê: autor, ou a mesa se compartilhada. Escreve/apaga: só o autor.
- `calendarios_mesa (mesa_id PK, config JSONB, ano, mes, dia, updated_at)` — lê: membro; escreve: gestor.
- `eventos_calendario (id, mesa_id, ano NULL = todo ano, mes, dia, titulo, descricao, secreto)` — lê: membro (secreto só gestor); escreve: gestor.
- Realtime nas quatro. RLS testado 38/38 no banco real (transação desfeita).

## Motor do calendário (`lib/calendarioEngine.js`, puro)
`normalizarCalendario`, `diasNoAno`, `diaAbsoluto`/`deAbsoluto`, `avancarDias`, `limitarData`, `diaDaSemana`, `gradeDoMes`, `eventosDoDia`, `proximosEventos`, `formatarData`, `textoPassagem`; modelos prontos genéricos (Gregoriano sem bissexto, Fantasia 12×30) — nenhum calendário de cenário com direitos autorais.

## Sub-fases
- **29.1** — SQL + RLS + motor do calendário com testes.
- **29.2 chat** — `useChatMesa` + `PainelChat` (sussurro, `/r`, apagar, não lidas); aba **Chat** na mesa, lateral da sessão, gaveta do mapa.
- **29.3 notas** — `useNotasMesa` + `PainelNotas` (lista, editor com salvamento automático, compartilhar, fixar); aba Resumo da mesa, sessão e mapa.
- **29.4 calendário** — `useCalendario` + `PainelCalendario` (data atual, grade do mês, passar o tempo ±1/±7/n dias → feed, eventos, editor de meses/semana para o gestor); aba Resumo; data da campanha na sessão.
- **29.5 aceitação + docs.**

## Restrições
1. Sem o SQL: nada quebra; os painéis avisam. 2. Sem limite de mensagens, notas, eventos, meses ou dias. 3. Mensagem com `/r` inválido não é enviada como texto (mostra o erro). 4. Sussurro é privado de verdade (RLS), não só escondido na tela.

## Teste de aceitação
Jogador sussurra ao mestre e ninguém mais lê; `/r 1d20+5` rola e aparece no feed; espectador conversa mas não rola; nota privada do mestre não aparece para jogador até ser compartilhada; mestre passa 3 dias de 29 de Fevereiro-que-não-existe (normalizado) e a data vira mês seguinte com dia da semana correto; evento anual aparece todo ano; evento secreto não aparece para jogador.

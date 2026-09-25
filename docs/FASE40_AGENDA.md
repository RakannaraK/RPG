# Fase 40 — Agenda da mesa (sessões no mundo real)

> Da análise de concorrência de 2026-09: MesaQuest, QG do Mestre e Códice têm.
> O calendário da F29 é o do **mundo do jogo**; este é o da vida real — marcar data é a maior dor de grupo.

## Como ficou
- **Banco** (`sql/fase40_agenda.sql`, rodado): `agenda_mesa` (início, duração, recorrência
  uma vez / semanal / quinzenal / mensal, "até" opcional, título) e `presencas_agenda`
  (resposta **por ocorrência**: o "vou" desta semana não vale para a próxima). Membros veem;
  só quem gere a mesa marca/muda/desmarca; cada um responde só a própria presença; anônimo
  não tem acesso. **10/10 checagens de RLS no banco**, em transação desfeita.
- **`lib/agenda.js`** (puro, 10 testes): próxima ocorrência (sessão em andamento ainda conta),
  mensal no dia 31 cai no último dia do mês, fim da recorrência, "hoje / amanhã / dom., 27/09",
  "começa em 40 min / daqui a 2 dias". Contas de calendário no **fuso de quem vê**, sem biblioteca
  (`Intl` + duas voltas para achar o deslocamento).
- **`AgendaMesa.jsx`** abaixo do banner de sessão: "Próxima sessão · dom., 27/09 às 20:00 ·
  daqui a 2 dias · toda semana", botões Vou / Talvez / Não vou e quem respondeu o quê.
  Formulário com `datetime-local` nativo. Salvar avisa a mesa pelo sininho.
- **Painel**: cada cartão de mesa mostra "Próxima: …" (uma consulta só para todas as mesas).
- Conferido com duas contas: mestre marca e confirma; o jogador recebe o aviso, não vê "Editar",
  responde "Talvez", e os nomes aparecem certos.

## Limites conhecidos
- Desmarcar uma agenda recorrente desmarca **todas** as ocorrências (não há "pular só esta semana").
- A recorrência mensal é calculada no fuso de quem vê (anotado com `ponytail:` no componente).

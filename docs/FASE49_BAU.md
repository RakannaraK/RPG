# Fase 49 — Baú do grupo e passar item entre personagens

> Da lista "talvez depois" da análise de concorrência de 2026-09.

## Como ficou
- **Na ficha, em Inventário**: cada item ganhou um botão de baú com duas opções:
  - **Guardar no baú do grupo**;
  - **Dar para…** um dos outros personagens da mesa.
- **Na mesa, aba Fichas → "Baú do grupo"**: a lista do que ninguém está carregando.
  - Quem joga clica em **Pegar** e o item vai para a ficha dele. Se a pessoa tem mais de uma
    ficha, escolhe qual.
  - **O mestre** põe o saque direto no baú ("+ Pôr no baú": nome e descrição) e pode tirar um
    item (com confirmação).
  - Atualiza sozinho para todos.
- Espectador vê o baú mas não pega. Mesa arquivada: ninguém mexe.

## Banco (`sql/fase49_bau.sql`, rodado)
- **O item do baú é o mesmo registro** de `itens_ficha`: sem ficha e com a mesa em
  `bau_mesa_id`. Uma regra do banco garante que o item está **sempre** numa ficha **ou** num baú.
  - Mudar de lugar mantém o id. Por isso a **maestria** ligada ao item (que é apagada em cascata
    se o item for apagado) não se perde; o teste confere isso.
- Três funções (DEFINER, com checagem de login):
  - `guardar_no_bau`: só quem é dono ou editor da ficha, numa mesa em que pode escrever;
  - `pegar_do_bau`: só para uma ficha sua da mesma mesa;
  - `dar_item`: da sua ficha para qualquer personagem da mesma mesa (quem recebe não precisa
    autorizar).
- O jogador não põe nada direto no baú nem puxa item de volta por fora: as regras antigas do
  inventário só enxergam item com ficha.
- **20/20 checagens** em transação desfeita (jogador, espectador, mestre, estranho e anônimo, ficha
  de outra mesa, maestria preservada).

## Código
- `lib/bau.js` (puro, 3 testes): fichas que eu uso, para quem dá para dar, validação do saque.
- `hooks/useBau.js`, `components/mesa/BauGrupo.jsx`, e `MoverItem` dentro de
  `EquipamentosTab.jsx`.

## Conferido no navegador
- O jogador guardou a "Adaga de Prata" no baú; ela sumiu da ficha e apareceu no baú.
- Pegou de volta, e depois deu ao personagem do mestre (o banco confirmou o novo dono).
- O saque que o mestre pôs apareceu sozinho na tela do jogador.
- No celular (375 px), sem rolagem lateral.

## Limites conhecidos
- Sem quantidade: cada item é uma linha, como já era no inventário ("3 poções" = 3 itens, ou um
  item "Poções (3)").
- Sem moedas no baú; a carteira continua por personagem.

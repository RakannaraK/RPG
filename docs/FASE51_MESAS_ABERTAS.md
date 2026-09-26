# Fase 51 — Mesas abertas: vitrine de mesas procurando jogadores

> Da lista "talvez depois" da análise de concorrência de 2026-09 (MesaQuest e Samwise têm).
> **Sem pagamento de nenhum tipo**, por decisão do dono do site.

## Como ficou
- **Mestre (aba Membros → "Procurar jogadores")**: "Anunciar na Comunidade" com sistema, quando,
  vagas (1 a 20), "aceita iniciantes" e uma descrição da campanha. Dá para editar, pausar e retomar.
- **Pedidos de vaga** aparecem logo abaixo, com o nome e a mensagem de quem pediu, e os botões
  **Aceitar** e **Recusar**.
  - Aceitar põe a pessoa na mesa como jogador e gasta uma vaga. A última vaga tira o anúncio da
    vitrine ("as vagas foram preenchidas; edite para abrir mais").
  - Os dois lados recebem aviso no sininho: o mestre quando chega um pedido; quem pediu quando é
    aceito (com link para a mesa) ou recusado.
- **Comunidade → "Mesas procurando jogadores"**: cartões com capa, sistema, horário, vagas,
  número de jogadores, selo "Aceita iniciantes" e descrição, com busca e filtro de iniciantes.
  - **Quem não tem conta vê a vitrine** (é para atrair gente nova) e o botão leva ao login.
  - Com conta: "Quero jogar" pede uma mensagem opcional e manda o pedido. Depois aparece "Pedido
    enviado" com a opção "Cancelar pedido".
  - Quem já é da mesa vê "Você já está nesta mesa · abrir". O convidado sem conta (F47) é
    convidado a criar uma.
- **O código de convite nunca aparece na vitrine.** Entrar é sempre pelo aceite do mestre.

## Banco (`sql/fase51_mesas_abertas.sql`, rodado)
- `anuncios_mesa` (uma linha por mesa) e `pedidos_mesa` (um por pessoa por mesa, com status
  pendente, aceito ou recusado).
- `mesas_abertas()`: a **3ª função liberada ao anônimo**, de propósito. Devolve só o que está no
  anúncio, mais o nome, a capa e o número de jogadores. Não devolve convite, dono nem lista de
  membros.
  - O teste confere que o anônimo executa **exatamente** as 3 funções públicas (`mesas_abertas`,
    `overlay_dados`, `vitrine_publica`). Funções de gatilho não contam: não dá para chamá-las
    diretamente.
- `pedir_vaga()` exige conta de verdade (convidado não pede), mesa anunciada e com vaga, e que a
  pessoa ainda não seja da mesa. Ela guarda o nome de quem pede, porque o mestre ainda não enxerga
  o perfil dela.
- `responder_pedido()` é só para quem gere a mesa, e não deixa responder o mesmo pedido duas vezes.
- **24 checagens** em transação desfeita.

## Código
- `lib/mesasAbertas.js` (puro, 3 testes): validação do anúncio, o que o cartão oferece a cada
  pessoa, e a busca e o filtro.
- `components/mesa/AnuncioMesa.jsx` e `components/comunidade/MesasAbertas.jsx`.

## Conferido no navegador (com as contas de teste)
- A conta do jogador criou uma mesa temporária e anunciou.
- **Deslogado**, a Comunidade mostrou o cartão com "Entre para pedir uma vaga".
- O mestre (que não era da mesa) pediu vaga com mensagem e viu "Pedido enviado".
- O dono recebeu o aviso, abriu pelo link, viu o pedido e aceitou. O mestre virou jogador da mesa,
  recebeu "Você entrou numa mesa!", e o anúncio saiu da vitrine.
- No celular (375 px), sem rolagem lateral.

## Limites conhecidos
- Sem denúncia de anúncio ainda. Um anúncio impróprio pode ser tirado pelo painel de admin do
  banco; se virar problema, dá para reusar o esquema de denúncias da F36.
- Quem foi recusado não pede de novo naquela mesa (o pedido fica registrado).

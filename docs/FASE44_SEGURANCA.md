# Fase 44 — Ferramentas de segurança: X-Card, linhas e véus, combinados

> Da análise de concorrência de 2026-09: Let's Role e Alchemy têm; nenhum concorrente brasileiro
> tem. Custa quase nada e é prática consolidada na comunidade.

## Como ficou
- **Banco** (`sql/fase44_seguranca.sql`, rodado): `limites_mesa` (linha, véu ou combinado) e
  `xcard_mesa` (um toque).
  - **Nenhuma das duas guarda quem escreveu.** Não existe a coluna, então ninguém descobre de
    quem veio, nem o mestre nem quem tem acesso ao banco pelo site.
  - Qualquer participante acrescenta e toca o X. Só quem gere a mesa tira um item (duplicata,
    brincadeira). Ninguém edita nem apaga um toque de X.
  - O horário do toque vem do banco: não dá para "tocar no passado".
  - **18/18 checagens de RLS** em transação desfeita.
- **`lib/seguranca.js`** (puro, 3 testes): valida o texto, agrupa por tipo e decide se o aviso do
  X-Card ainda aparece. Aparece o toque mais recente que a pessoa ainda não dispensou, por até
  10 minutos; quem chega depois não vê aviso velho.
- **Aba Membros → "Combinados e limites"**: três colunas (Linhas, Véus, Combinados), cada uma com
  uma frase explicando o que é. O mestre tira itens com confirmação.
- **Botão X-Card**:
  - Fica no cabeçalho da mesa e da sessão ao vivo, e flutua no canto do mapa (no celular, o
    cabeçalho do mapa não tinha espaço).
  - Tocar pede uma confirmação curta ("ninguém fica sabendo que foi você").
  - Todo mundo recebe em tempo real o aviso "Alguém tocou o X-Card". O mestre lê "corte ou mude
    a cena agora, não pergunte quem foi"; os jogadores leem "o mestre vai cortar ou mudar".
- Conferido no navegador com as contas de teste:
  - o jogador pôs uma linha, um véu e um combinado, e tocou o X;
  - o mestre viu o aviso ao abrir a sessão;
  - outro toque chegou na tela do mestre sem recarregar;
  - o mestre tirou os três itens.
  - No celular (375 px), sem rolagem lateral. A confirmação virou um diálogo centralizado, porque
    como balão ela saía da tela.

## Limites conhecidos
- Anônimo também quer dizer sem freio: alguém pode tocar o X várias vezes de brincadeira, e não
  há como saber quem foi. É o preço do anonimato, e a ferramenta foi feita assim de propósito.
- Os toques de X ficam guardados (não dá para apagar pelo site). Somem da tela depois de
  10 minutos.

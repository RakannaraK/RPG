# Fase 48 — Atlas: mapa-mundi com pinos ligados à enciclopédia

> Da lista "talvez depois" da análise de concorrência de 2026-09 (o Mestre RPG tem). É o passo
> natural depois da enciclopédia da F41.

## Como ficou
- **Na aba Enciclopédia**, dois botões no topo: **Verbetes** e **Atlas**.
- **Mestre**:
  - cria mapas com nome e imagem (até 2400 px, maior que a de verbete, para dar detalhe);
  - o mapa **nasce escondido**, e um botão mostra ou esconde para os jogadores;
  - "Fixar no mapa": escolhe um verbete e clica no lugar do mapa;
  - clicar num pino dá as opções **Abrir**, **Mover** (e clicar no lugar novo) e **Tirar do mapa**;
  - pode ter vários mapas (reino, cidade, masmorra).
- **Jogador**:
  - vê só os mapas mostrados;
  - em cada mapa, vê **só os pinos de verbetes que já recebeu** (qualquer campo revelado conta).
    Um pino de lugar secreto entregaria "tem algo aqui";
  - se o nome ainda é secreto, o pino aparece como "Local desconhecido";
  - clicar no pino abre o verbete;
  - quando o mestre revela algo, o pino aparece sozinho, sem recarregar.
- Os pinos guardam a posição como **fração** da largura e da altura da imagem (0 a 1), então
  ficam no mesmo lugar do desenho em qualquer tela.

## Banco (`sql/fase48_atlas.sql`, rodado)
- `atlas_mesa` (nome, imagem, visível) e `pinos_atlas` (mapa, verbete, x, y), com um pino por
  verbete em cada mapa.
- Um gatilho preenche a mesa do pino e **recusa verbete de outra mesa**.
- RLS:
  - mestre e co-mestre fazem tudo;
  - o jogador lê o mapa se estiver visível e o pino se o verbete foi revelado a ele (ou à mesa
    toda);
  - estranho e anônimo não veem nada.
- **17/17 checagens** em transação desfeita.

## Código
- `lib/atlas.js` (puro, 4 testes): clique vira posição relativa (presa dentro do mapa), pinos
  com o verbete que o leitor enxerga, verbetes ainda sem pino, validação.
- `hooks/useAtlas.js` e `components/mesa/PainelAtlas.jsx`.

## Achados no caminho (corrigidos)
1. **O bucket de imagens tinha sido apagado.** Ao pedir para apagar o bucket vazio
   `ficha-imagens`, o apagado no painel foi o `fichas-imagens`, que é o de verdade, e as regras de
   acesso dele foram junto.
   - Desde então nenhum envio de imagem ou som funcionava.
   - Recriei o bucket e as regras em `sql/storage_fichas_imagens.sql`, que agora está no
     repositório (antes as regras só existiam no painel).
   - Conferi pela API: envia na própria pasta, a URL pública abre, é barrado na pasta de outro e
     apaga.
   - Perda real: só a imagem da cena de teste "mapa-teste".
2. **A barra da trilha (F43) não ficava presa à tela** na página da mesa. Um elemento com
   animação acima dela prendia o `fixed` ao conteúdo, e ela tampava botões no fim da página.
   - Agora ela é desenhada direto no `body` (portal, igual ao X-Card).
   - E reserva no fim da página a própria altura, acompanhando quando abre ou recolhe.

## Conferido no navegador
- O mestre criou um mapa enviando uma imagem de verdade, fixou dois lugares clicando (as
  posições gravadas batem com o clique), moveu um pino e mostrou o mapa.
- O jogador viu só o pino do lugar revelado a ele, e clicar abriu o verbete.
- O segundo pino apareceu sozinho quando o mestre o revelou.
- No celular (375 px), sem rolagem lateral.

## Limites conhecidos
- Sem zoom nem arrastar: a imagem ocupa a largura da tela. Para mapas muito grandes, dá para
  cortar por regiões e criar um mapa por região.

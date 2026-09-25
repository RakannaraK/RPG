# Fase 43 — Trilha sonora sincronizada e mesa de efeitos

> Da análise de concorrência de 2026-09: o item mais pedido (5 concorrentes têm: Let's Role,
> Alchemy, Firecast, MasterApp, Character Sheet Online).

## Como ficou
- **Banco** (`sql/fase43_trilha.sql`, rodado): `som_mesa`, com **uma linha por mesa**.
  - Guarda o id do vídeo do YouTube, se está tocando, e "estava no segundo X no instante T".
  - Guarda também o último efeito disparado e quando foi.
  - Quem participa lê; só quem gere a mesa muda; anônimo e estranho não veem nada.
  - O banco recusa id de vídeo e nome de efeito fora do formato.
  - **10/10 checagens de RLS** em transação desfeita.
- **`lib/trilha.js`** (puro, 5 testes):
  - lê links do YouTube (watch, youtu.be, shorts, embed, music, com `?t=1m30s`);
  - calcula onde a música deveria estar agora, dando a volta se "repetir" estiver ligado;
  - corrige o tocador só se ele escorregou mais de 2 s;
  - um efeito só toca se for novo e recente: quem abre a página depois não ouve o trovão de
    10 minutos atrás.
- **Sons**: três sons de ambiente sintetizados no motor da F11/FV.4 (trovão, sino, batidas na
  porta), somados aos 9 de combate. Nenhum arquivo de áudio: cada navegador sintetiza o som, e o
  volume segue a preferência "som de ação" de cada pessoa.
- **`TrilhaMesa.jsx`**: um painel no canto inferior esquerdo, nas três telas da mesa (mesa,
  sessão ao vivo e mapa).
  - Recolhido, é uma barrinha com a miniatura do vídeo.
  - Aberto, o **mestre** tem: link do YouTube → Tocar, Pausar/Continuar, Do começo, Repetir,
    Tirar e a grade de efeitos.
  - O **jogador** tem Silenciar/Ouvir e o volume. Essas escolhas, e o recolher, ficam guardados
    no navegador de cada um.
  - Se o navegador barrar o som por falta de clique, aparece "Clique para ouvir".
- Conferido no navegador com as contas de teste:
  - mestre pôs um vídeo começando em 0:30;
  - o jogador entrou depois e caiu na mesma posição, com **0,07 s** de diferença;
  - o mestre pausou (pelo banco) e o jogador pausou no segundo 60;
  - o efeito disparado chegou e tocou **uma vez só**, sem eco para o mestre;
  - no celular (375 px), sem rolagem lateral.

## Limites conhecidos
- A sincronia usa o relógio de cada computador. Com o relógio do sistema certo (o normal hoje),
  a diferença fica abaixo de 1 s. Um relógio muito errado desalinha a música, mas não os efeitos
  nem o resto.
- Só vídeo único; playlist do YouTube não (o link com `&list=` toca só o vídeo).
- O vídeo precisa permitir incorporação: alguns vídeos musicais são bloqueados pelo dono fora do
  YouTube.

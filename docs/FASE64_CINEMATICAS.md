# Fase 64 — Cinemáticas

O mestre monta uma cena em quadros (imagem, título, texto, som ambiente) e a exibe em tela cheia para toda a mesa, em qualquer página da mesa. Na interface o nome é "Cinemática". Estava registrado como "não fazer" (cutscenes); foi reaberto a pedido do dono em 2026-11-13.

Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas.

## Dados

SQL `sql/fase64_cinematicas.sql` (já rodado):

- `cinematicas (id, mesa_id, titulo, quadros JSONB, created_at)`: só o gestor lê e escreve, para o jogador não ver a cena antes da hora. Até 12 quadros, 30 000 bytes.
- `cinematica_ao_vivo (mesa_id PK, cinematica_id, quadro JSONB, indice, total, atualizado_em)`: uma linha por mesa. Membro lê, só o gestor escreve. `quadro` nulo quer dizer nada em exibição. Está na publicação do Realtime.
- Quadro: `{ id, imagem_url, titulo, texto, som, segundos }`. `som` é um id de `SONS_AMBIENTE` (em `src/lib/efeitosVocabulario.js`) ou `null`. `segundos` 0 quer dizer avanço manual; senão, 3 a 120.
- Imagem: enviada para o balde `fichas-imagens` em `<uid>/cinematicas/<uuid>.<ext>`, com `redimensionarImagem(arquivo, 1600)`, no molde de `enviarImagem` em `src/hooks/useEnciclopedia.js`.

## `src/lib/cinematica.js` (puro, com teste em `cinematica.test.js`)

- `LIMITES_CINEMATICA = { quadros: 12, titulo: 80, texto: 600, url: 500 }`.
- `normalizarQuadro(json)` e `normalizarQuadros(json)`: descartam o inválido e cortam nos limites. `imagem_url` só passa se começar com `https://`. É o que protege o lado do jogador: tudo que chega de `cinematica_ao_vivo` passa por `normalizarQuadro`.
- `novoQuadro()`, `moverQuadro(quadros, id, direcao)`, `validarCinematica({ titulo, quadros })` devolvendo `{ ok, erro }` (título obrigatório; pelo menos um quadro; cada quadro com imagem, título ou texto).
- `trechoDigitado(texto, msDecorridos, caracteresPorSegundo = 40)`: o pedaço do texto já "digitado".

## `src/hooks/useCinematicas.js`

- `useCinematicas(mesaId)` (gestor): `{ cinematicas, loading, erro, criar, atualizar, apagar, enviarImagem, exibir, encerrar }`. `exibir(cinematica, indice)` grava em `cinematica_ao_vivo` (upsert por `mesa_id`) o quadro normalizado, `indice`, `total` e `cinematica_id`. `encerrar()` grava `quadro: null`.
- `useCinematicaAoVivo(mesaId)`: leitura inicial e assinatura de `postgres_changes` em `cinematica_ao_vivo` filtrando por `mesa_id` (canal com sufixo `useId()`). Devolve `{ aoVivo }`, com `aoVivo = { quadro, indice, total, cinematicaId } | null`.

## Componentes (`src/components/cinematica/`)

- `PainelCinematicas.jsx`: aba nova de gestor "Cinemáticas" na `MesaPage` (entra em `TABS_GESTOR`, ao lado de "Escudo"). Lista as cinemáticas, com `EstadoVazio`. Criar e editar num `Modal`: título e os quadros (enviar imagem, título, texto, som, segundos; subir, descer e apagar quadro). Botões "Exibir para a mesa" e "Encerrar exibição".
- `CinematicaAoVivo.jsx`: a tela cheia, em portal, acima de tudo (`role="dialog"`, `aria-modal`, rótulo com o título).
  - Faixas pretas em cima e embaixo; imagem ocupando a tela com aproximação lenta (classe nova em `src/theme/motion.css`, desligada com movimento reduzido); título e texto que se digita (com movimento reduzido, aparece inteiro); troca de quadro com desvanecer.
  - Som ambiente do quadro com `criarSomAmbiente()`, respeitando as mesmas preferências de som que o mapa usa; parar ao fechar.
  - Jogador: botão "Fechar para mim" e Esc. Fechar vale só para aquela exibição; se o mestre trocar de quadro, a cena não reabre sozinha até começar outra exibição.
  - Gestor: "Anterior", "Próximo", "Encerrar" e "2 de 5". Com `segundos` maior que zero, o navegador do gestor avança sozinho.
- `OuvinteCinematica.jsx`: montado em `src/App.jsx` ao lado de `OuvinteDesafios`. Descobre a mesa com `useMatch('/mesa/:id/*')`, usa `useCinematicaAoVivo` e mostra `CinematicaAoVivo`. Para saber se a pessoa é gestora, tenta ler a cinemática pelo `cinematicaId`: só o gestor consegue, e é ele quem recebe os controles.

## Limites conhecidos

- O avanço automático depende do navegador do gestor estar aberto.
- Sem vídeo e sem trilha musical: imagem (pode ser animada, até 3 MB), texto e som ambiente sintetizado.
- O jogador pode fechar a cena para si.

## Como ficou

- Tudo que a especificação lista, mais duas funções soltas em `useCinematicas.js` (`exibirQuadro` e `encerrarExibicao`) que a tela cheia usa para os botões do mestre.
- "Exibir para a mesa" encerra antes de exibir, para que quem fechou a cena a receba de novo.
- A tela cheia fica num nível próprio (`z-cinema`, 65): acima dos modais, abaixo dos avisos.
- Enquanto a cena está aberta, o resto da página fica inerte (`inert` no `#root`): o Tab não sai da cena e os atalhos do mapa e a busca (Ctrl+K) não disparam.
- O mestre não tem "Fechar para mim" nem Esc: o caminho dele é "Encerrar". Para ele, fechar pararia o avanço automático de todos.
- O texto que se digita fica escondido do leitor de tela; o texto completo é anunciado a cada troca de quadro.
- Uma leitura atrasada não repõe um estado mais velho (compara `atualizado_em`).
- Cores cruas (preto das faixas, branco do texto) são exceção justificada em comentário no código.

### Como foi conferido

- Lint sem erros, build ok, testes passando (10 em `cinematica.test.js`).
- Banco, em transação desfeita: jogador não lê `cinematicas`, lê o quadro no ar e não consegue trocar nem apagar; estranho e anônimo barrados; limite de 12 quadros.
- Navegador, com sessão falsa: criar cinemática grava os quadros; "Exibir" grava o primeiro quadro; como jogador a tela cheia abre com o texto e "Fechar para mim", e Esc fecha; como mestre aparecem os controles, "Próximo" grava o quadro seguinte e "Encerrar" grava o fim; o Tab fica dentro da cena; Ctrl+K não abre a busca com a cena aberta e volta a abrir depois.
- Não conferido: a troca de quadro chegando ao vivo a outra pessoa (depende do Realtime com login real), envio de imagem e o som.

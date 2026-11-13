# Fase 62 — Sobras: extensões no servidor, publicar do modal, Escudo e Baú, busca global

Quatro itens pequenos que tinham ficado de fora. Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas.

## 62.A — Instalar e remover extensão no servidor

Antes o navegador lia a lista de extensões da mesa, alterava e gravava inteira; com dois mestres ao mesmo tempo, uma instalação podia se perder.

- SQL `sql/fase62_extensoes_no_servidor.sql` (já rodado): RPCs `instalar_extensao(p_mesa_id, p_item)` e `remover_extensao(p_mesa_id, p_id)`. As duas travam a linha da mesa, exigem mestre ou co-mestre e devolvem a lista nova. `p_item` é o id do catálogo (texto) ou o pacote (objeto). Reinstalar o mesmo id substitui. Limites: 20 itens, 30 000 bytes por item. Mensagens de erro em português.
- `src/hooks/useExtensoesMesa.js`: o hook passa a devolver `{ extensoes, conteudo, instalar, remover, loading, erro }`. `instalar(item)` e `remover(id)` chamam as RPCs, atualizam `extensoes` com a lista devolvida e lançam `Error(mensagem)` se falhar. `salvar` sai. `instalarNaMesa(mesaId, pacote)` valida com `validarPacote` e chama `instalar_extensao` (sem ler a mesa antes).
- `src/components/mapa/ModalExtensoes.jsx`: props `onInstalar(item)` e `onRemover(id)` no lugar de `onSalvar`. Catálogo manda o id; arquivo importado manda o `pacote` validado. `src/pages/MapaPage.jsx` só troca as props passadas ao modal.
- Se `instalar` e `desinstalar` de `src/lib/extensoes.js` ficarem sem uso no aplicativo, apagar as duas e os testes delas.
- A RPC antiga `definir_extensoes` fica no banco, sem uso.

## 62.B — Publicar a extensão direto do modal

- `ModalExtensoes.jsx`, seção "Importadas": cada pacote ganha o botão "Publicar na Comunidade", que navega para `/comunidade` com `state: { publicar: { tipo: 'extensao', conteudo: pacote } }`. A frase "Baixe o .json e publique lá." e o link avulso saem.
- `src/pages/ComunidadePage.jsx`: ao abrir com esse `state`, o formulário de publicar já aparece com o tipo "Extensão", o pacote carregado (passando por `validarPacote`; se inválido, mostra os erros) e título e descrição preenchidos. Depois de ler, limpar o `state` da rota (`navigate` com `replace`) para não reabrir ao recarregar.

## 62.C — Layout interno do Escudo do mestre e do Baú

Os dois ficaram com o desenho antigo no redesign. É troca de aparência: nenhuma função muda, nenhuma seção some e a ordem das seções fica.

- Modelo a seguir: `src/components/mesa/PainelEnciclopedia.jsx` (como usa `CabecalhoSecao`, `EstadoVazio`, `Botao`, `Icone` e os campos).
- `src/components/mesa/PainelEscudo.jsx`: sair das classes soltas `CAIXA`/`TITULO` com cor crua. Cada seção vira um cartão com cores de token e título em `CabecalhoSecao`; lista vazia em `EstadoVazio`; botões e link em `Botao`. Barra de vida do grupo com `ui/BarraVida` se ela servir sem alteração (senão, manter a própria só com tokens `ok`/`warn`/`harm`). Grade: uma coluna no celular, duas a partir de `lg`, com Combate e Vida do grupo no topo.
- `src/components/mesa/BauGrupo.jsx`: cabeçalho em `CabecalhoSecao`, lista vazia em `EstadoVazio`, lixeira como botão de ícone do padrão do modelo, campos com as mesmas classes dos campos do modelo, erro com cor de token e `role="alert"`.
- Critério: nos dois arquivos não sobra cor crua do Tailwind (`purple-`, `slate-`, `sky-`, `emerald-`, `yellow-`, `red-`, `text-white`).
- Não mexer nos componentes embutidos (`PainelRelogios`, `RoladorGenerico`, `PainelOverlay`).

## 62.D — Busca global (Ctrl+K)

Uma janela de busca para pular para qualquer lugar. Nesta fase ela só navega; não procura dentro do conteúdo das mesas.

- `src/lib/paleta.js` (puro, com teste em `paleta.test.js`):
  - `montarItens({ recentes, mesas, personagens })` devolve `[{ chave, grupo, titulo, detalhe, rota }]`, nos grupos e nesta ordem: "Recentes", "Mesas", "Personagens", "Páginas". Sem `rota` repetida (fica a primeira).
    - Recentes: vêm de `lerRecentes()` e não trazem nome; resolver o título pelo nome da mesa e do personagem. Reaproveitar a função que o "Continuar" do painel já usa (ver `src/components/painel/`), sem duplicar.
    - Mesas: uma entrada por mesa (`/mesa/:id`, detalhe = papel) e, para mesa não arquivada, outra "Mapa — nome da mesa" (`/mesa/:id/mapa`).
    - Personagens: `/mesa/:mesa_id/ficha/:id`, detalhe = nome da mesa.
    - Páginas: "Painel" (`/dashboard`) e "Comunidade" (`/comunidade`).
  - `filtrarItens(itens, texto)`: usa `normalizar` de `formulaEngine.js`; todas as palavras digitadas precisam aparecer em título + detalhe; quem começa pelo texto vem antes; no máximo 30. Texto vazio devolve tudo na ordem dos grupos.
  - `abrirBusca()`: dispara o evento de janela `dp:abrir-busca`.
- `src/components/ui/PaletaComandos.jsx`: montado uma vez em `src/App.jsx`, ao lado de `OuvinteDadosMesa`. Só funciona com a pessoa logada.
  - Abre com Ctrl+K ou ⌘K (com `preventDefault`) e com o evento `dp:abrir-busca`. O miolo, que chama `useMesas` e `useMeusPersonagens`, só é montado com a janela aberta.
  - Usa `ui/Modal` com `semCabecalho`. Campo de busca com foco automático e `role="combobox"`; lista `role="listbox"` com `role="option"` e `aria-selected`; títulos pequenos por grupo.
  - Setas sobem e descem (dando a volta), Enter abre o item e fecha, clique também; o item ativo rola para ficar visível. Sem resultado: `EstadoVazio`. Rodapé com a dica "↑↓ escolher · Enter abrir · Esc fechar".
- `src/components/ui/BarraTopo.jsx`: botão de ícone "Buscar (Ctrl+K)" antes do link da Comunidade, chamando `abrirBusca()`. Se `Icone.jsx` não tiver lupa, acrescentar uma no padrão dos outros ícones.
- Limite conhecido: só aparecem os 12 personagens mais recentes (é o que `useMeusPersonagens` traz) e não há busca dentro de verbetes, fichas de outras pessoas ou itens.

## Como ficou

- **62.A** — o hook `useExtensoesMesa` devolve `instalar` e `remover`, que chamam as RPCs novas; `salvar` saiu. `instalarNaMesa` não lê mais a mesa antes. As funções `instalar` e `desinstalar` de `lib/extensoes.js` foram apagadas, porque quem monta a lista agora é o servidor. Uma leitura inicial atrasada não repõe a lista velha por cima da resposta de uma RPC.
- **62.B** — cada pacote importado tem o botão "Publicar na Comunidade". A `ComunidadePage` valida o que chega pela rota, abre o formulário preenchido e limpa o estado da rota; fechar o formulário zera o preenchimento.
- **62.C** — `PainelEscudo` e `BauGrupo` usam `CabecalhoSecao`, `Botao`, `BarraVida`, o botão de ícone e a classe `campo` do padrão, só com cores de token. No Escudo, os vazios ficaram em uma linha de texto: o `EstadoVazio` deixava os cartões com cerca de 220 px, e agora têm cerca de 90 px. No Baú a lista vazia usa `EstadoVazio`.
- **62.D** — `lib/paleta.js` (itens, filtro, `abrirBusca`) e `ui/PaletaComandos.jsx`, montado no `App.jsx`; botão de lupa na `BarraTopo`. O rótulo dos recentes (`rotuloDe`) foi para `lib/recentes.js` e é o mesmo do "Continuar" do painel. Grupos com `role="group"`; a ordem das setas é a ordem da tela.

### Limites conhecidos

- A busca só navega: mesas, mapas, os 12 personagens mais recentes e páginas. Não procura dentro de verbetes, itens ou fichas de outras pessoas.
- No Escudo, a coluna da esquerda costuma ficar mais curta que a da direita.
- Os componentes embutidos no Escudo (relógios, rolador, overlay) seguem com o desenho próprio.

### Como foi conferido

- Lint sem erros (108 avisos antigos), build ok, 1058 testes passando.
- Banco, em transação desfeita (13 de 13): jogador, estranho e anônimo barrados; mestre instala do catálogo, instala pacote, reinstalar substitui, remove; barrados o id reservado, o id inválido, o item acima de 30 000 bytes e o 21º item.
- Navegador, com sessão falsa e respostas simuladas:
  - Busca: Ctrl+K abre com foco no campo; `sessao` acha "Sessão das Sombras"; setas seguem a ordem da tela e dão a volta; Enter navega; Esc fecha; a lupa abre e recebe o foco de volta; no mapa, digitar `e` na busca não aciona a ferramenta Efeito; no celular a janela sobe do rodapé.
  - Extensões: "Instalar" e "Remover" chamam as RPCs certas; erro da RPC aparece no modal; "Publicar na Comunidade" abre o formulário preenchido; reabrir o formulário depois vem vazio; recarregar não reabre.
  - Escudo e Baú: capturas sem corte nem sobreposição.
- Revisão final de código feita em separado; o bloqueio que ela e o navegador acharam (formulário abrindo vazio por uma prop não repassada) foi corrigido e reconferido.
- Nada foi testado com login real nem com duas pessoas instalando ao mesmo tempo.

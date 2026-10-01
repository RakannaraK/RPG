# Fase 52 — Redesign "Dado & Pena vivo"

Pedido (2026-09-30): evolução visual/UX completa **sem perder nenhuma função**,
mantendo a identidade dark fantasy (fundo quase preto/violeta, acento do tema,
âmbar nos dados). Três camadas, nessa ordem de importância:

1. **Base funcional** — layout, tipografia, espaçamento, UX. Tem que ficar bonito
   com todas as animações desligadas.
2. **Identidade** — cores, bordas, cards, dados, estética de RPG.
3. **Ambientação** — fogo arcano, partículas, luz. Opcional e desligável.

---

## 1. Auditoria técnica (estado antes da fase)

### 1.1 Stack
| Item | O que é |
|---|---|
| Framework | React 19.2 + Vite 8, JavaScript (sem TypeScript) |
| Rotas | react-router-dom 7, `<BrowserRouter>` declarativo em `App.jsx` (10 rotas) |
| Estilo | Tailwind 3.4 + 3 CSS próprios em `src/theme/` (`tokens.css`, `motion.css`, `rpg.css`) |
| Estado | `useState` local + 2 contextos (`AuthContext`, `PreferenciasContext`) + ~50 hooks de dados |
| Backend | Supabase (Postgres + RLS, Realtime, Storage, Auth) |
| Auth | Supabase Auth: e-mail/senha, convidado anônimo (F47), captcha Turnstile pronto |
| Preferências | `profiles.preferencias` (JSONB), salvas otimistas pelo `PreferenciasContext` |
| Temas | `data-tema` no `<html>`; `tokens.css` troca só o acento; `purple-*`/`slate-*` do Tailwind **são** os tokens (F38) |
| Animação | Nenhuma biblioteca. CSS (`motion.css`), `PageTransition` (classe reiniciada por rota), `motion.js` com constantes |
| 3D | `three` + `cannon-es` em chunk separado (dados) |
| Testes | Vitest, 924 testes de lógica pura; lint 0 erros / 100 avisos; build ok |

### 1.2 Arquitetura da UI
- 10 páginas em `src/pages/`; cada página desenha o **próprio cabeçalho** (6 cabeçalhos diferentes).
- `MesaPage` (1.114 linhas) concentra abas, 5 modais escritos à mão e toda a gestão de membros.
- `FichaPage` (1.505 linhas) + 11 componentes em `components/ficha/layout/`.
- Componentes de base existentes: `Botao` (6 variantes, adotado em 44 arquivos), `Ilustra` (26 desenhos SVG),
  `Marca`/`Selo`, `CapaMesa`, `PageTransition`.
- Bundle principal: **1,5 MB** (391 KB gzip) — todas as páginas entram no primeiro carregamento.

### 1.3 Principais problemas de UX encontrados
1. **Modal sem padrão:** 23 modais em 18 arquivos, cada um com seu `fixed inset-0`; só 5 têm `role="dialog"`,
   nenhum prende o foco, quase nenhum fecha com Esc, nenhum devolve o foco, e nenhum anima a saída.
2. **Diálogos do navegador:** 16 `window.confirm`, 4 `window.alert` e 3 `window.prompt` (cinza, fora da identidade).
3. **Abas sem semântica:** 5 faixas de abas, nenhuma com `role="tablist"`; o indicador some e reaparece; na mesa
   as 9 abas transbordam numa coluna de 896 px.
4. **Sem feedback de ação:** não existe toast. "Salvo", "copiado" e erros aparecem cada um de um jeito, ou não aparecem.
5. **Carregamento:** 16 textos "Carregando..." soltos; esqueletos só no painel de mesas.
6. **Cabeçalho:** ícones pequenos sem texto (comunidade, guia "?", preferências, mapa, sair) e sem menu de usuário.
7. **Página da mesa:** a sessão (ação principal) tem o mesmo peso visual de agenda e histórico; a página fica estreita em telas grandes.
8. **Ficha:** muitas caixas dentro de caixas + textura competindo com o texto.
9. **Preferências:** um modal longo com tudo empilhado (nome, skin, dados, som, tema, fonte, sons de ação).

### 1.4 Componentes a reutilizar
`Botao`, `Ilustra`, `Marca`, `CapaMesa`, `Dots`, `BarraXp`, `barraVida.js`, `PageTransition`, `motion.js`,
os tokens de `tokens.css` e a camada `rpg.css` (velino, molduras, divisor).

### 1.5 Componentes a criar (só onde há reúso real)
| Componente | Reúso |
|---|---|
| `Modal` | 23 modais |
| `ConfirmarProvider` (`useConfirmar`) | 16 confirm + 3 prompt |
| `ToastProvider` (`useToast`) | alertas, salvar, copiar, erros |
| `Abas` (indicador que desliza) | mesa, ficha, sistema, login, preferências |
| `EstadoVazio`, `Esqueleto` | ~15 estados vazios, 16 carregamentos |
| `SeloPapel` | papel na mesa (3 cópias de `ROLE_INFO` hoje) |
| `BarraProgresso` | vida e XP |
| `BarraTopo` + `MenuUsuario` | cabeçalhos de Dashboard, Mesa, Comunidade |
| `EfeitosAmbiente`, `ChamaArcana` | camada de ambientação |

### 1.6 Inconsistências visuais
- 248 usos de `red-*`, 158 de `amber-*`, 41 `green-*`, 31 `emerald-*`, 30 `sky-*` crus (fora dos tokens `harm/ok/dice/temp`).
- `transition-all` em 27 lugares; durações 150/200/300/500/700 ms sem regra.
- z-index: `z-10/20/30/40/50/[60]/[65]/[70]` escolhidos caso a caso.
- Papel do membro com cores diferentes entre `MesaPage` e `MesaCard` (co-mestre laranja cru).
- Arquivos mortos: `App.css` (modelo do Vite, não importado), `assets/hero.png`, `react.svg`, `vite.svg`, pastas vazias `componentsauth/` e `componentsui/`.

### 1.7 Páginas que mais precisam de intervenção
1. Mesa (painel da campanha) · 2. Ficha · 3. Preferências · 4. Suas mesas · 5. Comunidade · 6. Bestiário.

### 1.8 Estratégia de animação
- **Sem biblioteca nova.** CSS + `transform`/`opacity`; JS só para medir o indicador de aba e para o canvas de partículas.
- Três classes de movimento, desligáveis em separado:
  - **funcional** (modal, abas, página, menus): fica ligado no modo "reduzido" como fade curto;
  - **feedback** (clique, salvar, erro, macro, notificação);
  - **ambiente** (partículas, fogo, aura): só no modo de efeitos "completos".
- Tokens de movimento: `--dur-rapida 140ms`, `--dur-normal 220ms`, `--dur-lenta 420ms`;
  `--ease-padrao`, `--ease-saida`, `--ease-mola`.
- `prefers-reduced-motion` **ou** a preferência do usuário viram `data-movimento="reduzido"` no `<html>`.

### 1.9 Estratégia de temas
- O tema continua mudando **só a paleta de acento** (o contraste do texto não muda), mais uma "energia" por tema:
  cor das partículas, tipo de partícula e tom da chama arcana (`--energia-*`).
- A troca de tema usa a **View Transitions API** do navegador (crossfade de ~500 ms da página inteira);
  onde não existe, troca na hora. O canvas de partículas interpola a cor sozinho.

### 1.10 Riscos de regressão
- Trocar o `fixed inset-0` dos modais: algum modal depende de fechar ao clicar fora (ou de **não** fechar).
- `window.confirm` é síncrono; o substituto é `await` — cada chamada precisa estar em função `async`.
- O overlay do OBS (`data-sem-arte`) não pode receber partículas nem fundo.
- A impressão A4 (F45) esconde tudo que é `.fixed`; o canvas e os toasts precisam sumir no papel.
- `backdrop-blur` prende `fixed` dentro dele → modais e toasts sempre em portal no `<body>`.
- Code splitting por rota muda a ordem de carregamento; a transição de página precisa de um fallback.

### 1.11 Dependências novas
**Nenhuma.** View Transitions, `<dialog>`-like focus trap, canvas 2D e CSS cobrem tudo.

---

## 2. Plano por etapas

| Etapa | Conteúdo |
|---|---|
| 52.1 | Tokens (movimento, camadas, sombras, brilho), preferências `animacoes`/`efeitos`/acessibilidade, troca de tema animada, limpeza de arquivos mortos, páginas carregadas sob demanda |
| 52.2 | Componentes base: `Modal`, `useConfirmar`, `useToast`, `Abas`, `EstadoVazio`, `Esqueleto`, `SeloPapel`, `BarraProgresso`; `Botao` com microinterações; migração dos 23 modais e dos diálogos do navegador |
| 52.3 | `BarraTopo` + menu do usuário + notificações redesenhadas |
| 52.4 | Suas mesas |
| 52.5 | Página da mesa como painel da campanha (hero, sessão ao vivo, abas, membros, trilha) |
| 52.6 | Ficha (cabeçalho, vida, macros) e bestiário (lista + detalhe) |
| 52.7 | Preferências por categorias |
| 52.8 | Ambientação: `EfeitosAmbiente`, `ChamaArcana`, aura da sessão, crítico |
| 52.9 | Comunidade, guia do mestre em passos, dados, chat |
| 52.10 | Varredura de responsividade, acessibilidade e desempenho (medida, não achismo) |

Regra de cada etapa: build + lint (0 erros) + testes + navegador sem erro no console, commit e push.

---

## 3. Resultado (2026-10-01)

| Etapa | Commit | O que saiu |
|---|---|---|
| 52.1 | c340996 | Tokens de movimento/profundidade/energia; fundo global em camadas; tema troca fundindo (View Transitions); preferências de animações, efeitos, tamanho do texto e alto contraste; páginas sob demanda (bundle inicial 1,5 MB → 321 KB) |
| 52.2 | 4b1bcb7 | `Modal`, `useConfirmar`, `useToast`, `Abas`, `EstadoVazio`, `Esqueleto`, `SeloPapel`, `Icone`; 21 modais migrados; diálogos do navegador trocados |
| 52.3–52.5 | 4aa02c0 | `BarraTopo` + `MenuUsuario` + notificações por dia; Suas mesas; mesa como painel da campanha (sessão como ação principal, aura ao vivo, abas grudadas); Trilha e efeitos |
| 52.6 | b2696c4 | Ficha (retrato, nível em medalhão, vida animada, macros em cartões, abas) e bestiário (filtros, prévia, SRD em janela) |
| 52.7 | daf1731 | Preferências em 5 categorias |
| 52.8 | f87499e | `EfeitosAmbiente` (partículas por tema, canvas) e `ChamaArcana` |
| 52.9 | 1682754 | Comunidade como feed; guia do mestre em passos com progresso real; rolador rápido com crítico/falha natural; chat agrupado |
| 52.10 | (este) | Varredura e correções |

### Varredura final (medida, não achismo)
9 telas (painel, comunidade, mesa: fichas/bestiário/dados/chat/resumo/membros, ficha) × 5 temas a 1440 px, e as 9 a 375 px:
- **0** rolagem lateral (corrigido: grades de uma coluna sem `grid-cols-1` esticavam até o conteúdo mais largo);
- **0** alvo de toque abaixo de 24 px (corrigido: rótulo de sussurro do chat);
- **0** texto abaixo de 12 px;
- **0** reprovação de contraste WCAG AA (corrigido: `text-sobre-acento` sobre acento 700/800 e `bg-hover text-sobre-acento` davam 1,2–3,6:1 nos temas claros);
- console sem erro; build de produção sob a CSP nova sem nenhuma violação;
- com "reduzir movimento": sem partículas, chama parada, nada pulsando.

### Ficou de fora (de propósito ou sem base no banco)
- Escudo e Baú continuam com o layout interno anterior (já usam os tokens e os modais novos). Enciclopédia e editor de Sistema foram refeitos na rodada seguinte (seção 4).
- Busca global / paleta de comandos (Ctrl+K): opcional; a arquitetura não impede.
- "Online/offline" fora da sessão, efeitos favoritos e "salvos" na comunidade: o banco não tem esses dados.
- Eventos do sistema dentro do chat (rolagens vão para o feed de Dados, como antes).
- Página do mapa: barra própria, compacta, mantida.

---

## 4. Rodada seguinte — Enciclopédia como wiki e Sistema em seções (2026-10-01)

**Enciclopédia (wiki da campanha)**
- Índice por categoria (NPCs, Locais, Facções…) com contagem em chips, busca em tudo e lista agrupada por tipo; no celular, índice → artigo → voltar.
- Artigo: caminho (Enciclopédia › NPCs), título grande, tipo, estado de revelação com ícone (Oculto / Parcial / Revelado), #etiquetas, resumo em destaque, texto com ligações, **caixa de informações** (imagem + campos do tipo) ao lado, **Relacionados** nos dois sentidos (o que este cita e quem cita este) e "Apenas o mestre" para as notas secretas.
- Editor em seções (tipo em chips, básico, detalhes do tipo, texto, notas do mestre, imagem e etiquetas) com **"Ligar a outro verbete…"**, que insere `[[Título]]` no cursor.
- Revelar/entregar em janela própria; "Quem sabe o quê" recolhível. Funções novas puras e testadas em `lib/enciclopedia.js`: `relacionados`, `indicePorTipo`, `contarPorTipo`, `inserirMencao`.

**Editor de Sistema em seções**
- Nove seções (Geral, Atributos, Ficha, Raças e classes, Descansos, Recursos, Poderes, Maestria e itens, Simulador), cada uma com título e explicação; lista lateral no computador e abas no celular.
- **Barra de alterações não salvas** que gruda embaixo, diz em quais seções há mudança e tem Salvar e Descartar; ponto amarelo na seção alterada; o navegador pergunta antes de fechar a aba com coisa não salva (`lib/editorSistema.js`, testado).
- O editor continua montado ao trocar de aba da mesa: as edições não se perdem.
- Tela inicial para criar o sistema: modelos em cartões, importar .json ou do zero.

**Bug antigo corrigido no caminho**
- Os três modelos de sistema falhavam ao criar (atributos sem regra de rolagem; o banco exige). Agora cada modelo tem a regra dele (4d6 tira o menor, bolinhas começam em 1, faixas começam em 0) e qualquer importação sem regra entra com "valor fixo 0".

**Medido:** Enciclopédia e Sistema (e as seções Atributos, Ficha, Descansos e Recursos) nos 5 temas e a 375 px: 0 rolagem lateral, 0 alvo < 24 px, 0 texto < 12 px, 0 reprovação de contraste.

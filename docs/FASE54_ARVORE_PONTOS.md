# Fase 54 — Árvore de habilidades com pontos, vários pré-requisitos e visual de constelação

Origem: análise do LICHRPG (2026-11-07). A "skill tree" é o que o público dele mais gosta: pontos para gastar, nós ligados em teia, visual de céu estrelado. A nossa (F33) tinha um pré-requisito por habilidade, nenhum orçamento e um desenho funcional de retângulos.

**Onde superamos:** os pontos disponíveis são uma **fórmula** do mestre (`nivel*2`, `nivel + mod(sabedoria)`…), o que o concorrente não faz; e a árvore continua derivada do sistema (o mestre monta uma vez, vale para todas as fichas).

## Decisões (fechadas)

1. **Vários pré-requisitos:** coluna nova `habilidades.requer_habilidades_ids UUID[]` + `requer_modo` (`'todos'` | `'qualquer'`). Os pré-requisitos efetivos = união de `requer_habilidades_ids` com o antigo `requer_habilidade_id` (sem repetir; ids que não existem mais são ignorados). Ao salvar, o editor grava a lista e espelha o 1º item em `requer_habilidade_id` (ou `null`).
2. **Custo:** `habilidades.custo_pontos INTEGER` (nulo/0 = grátis).
3. **Orçamento:** `config_layout.arvore = { formula_pontos: '', rotulo_pontos: 'Pontos de habilidade' }`. Fórmula vazia = sem orçamento (comportamento de hoje). Total = `piso(avaliarFormula(formula, contextoFormula))`; erro de fórmula = sem orçamento + aviso na árvore.
4. **Gasto** = soma de `custo_pontos` das habilidades da ficha com `origem` `'manual'` (ou sem origem). Raça e classe não gastam.
5. **Esquecer** uma habilidade aprendida devolve os pontos; só é permitido se nenhuma habilidade conhecida a tem como pré-requisito. Usa `removerHabilidade` de `useHabilidadesFicha`.
6. A barreira continua só na tela (como na F33): o dono pode adicionar habilidade pelo caminho manual de sempre. Não criar trava no servidor.
7. O SQL é `sql/fase54_arvore_pontos.sql` (já escrito, não alterar). O código tem que funcionar se as colunas novas ainda não existirem (`undefined` = vazio).

## Sub-fases

### 54.1 Motor — `src/lib/arvoreHabilidades.js` (+ testes)
- `prerequisitosDe(hab, idsExistentes)` → lista de ids (decisão 1).
- `montarArvore(habilidades, { conhecidasIds, contexto, saldoPontos = null })`:
  - camada = 0 sem pais válidos; senão 1 + maior camada entre os pais (caminho mais longo). Ciclo: a aresta que fecha o círculo é ignorada e entra em `avisos` (mesma mensagem de hoje). Mantém o limite de 100.
  - estado: `conhecida` se aprendida; senão pré-requisito (todos ou qualquer) → `bloqueada` com motivo `Precisa de “A” e “B”` / `Precisa de “A” ou “B”` (listando só os que faltam); depois nível mínimo (motivo atual); depois pontos: com `saldoPontos !== null` e custo > saldo → `bloqueada`, motivo `Custa N pontos (restam M)`; senão `disponivel`.
  - nó ganha `paisIds` e `custo`; `paiId` continua (= 1º pai válido) para não quebrar quem usa.
- `ligacoesArvore` devolve uma ligação por (pai, filho).
- `posicoesArvore`: dentro de cada camada, ordena pela média do x dos pais (empate: nome) — menos cruzamento.
- `pontosDaArvore({ formula, contexto, habilidades, habilidadesFicha })` → `{ total | null, gastos, saldo | null, erro | null }`.
- `dependentesConhecidos(habId, arvore)` → ids conhecidos que exigem `habId`.
- Os testes atuais de `arvoreHabilidades.test.js` e `fase33.acceptance.test.js` continuam passando sem mudar o que verificam. Novos testes: todos/qualquer, ciclo com dois pais, custo e saldo, `pontosDaArvore` (fórmula vazia, fórmula com erro, só origem manual gasta), ligações múltiplas, ordem por média.

### 54.2 Editor do mestre
- `RacasClassesEditor.jsx` (`HabilidadeVinculadaCard`): o select "Exige a habilidade" vira lista de pré-requisitos (selos removíveis + select "adicionar pré-requisito"); com 2 ou mais, rádio "Exige todas / Basta uma". O select **não oferece** a própria habilidade nem as que dependem dela (evita círculo — usar o motor). Campo numérico "Custo na árvore (pontos)". Gravar por `updateHabilidade` (`useHabilidades.js`).
- `LayoutEditor.jsx`: seção "Árvore de habilidades" com `FormulaInput` para `formula_pontos` (presets: "Sem orçamento" `''`, "1 por nível" `nivel`, "2 por nível" `nivel*2`) e campo de texto do rótulo.
- `sistemaDefaults.js`: `arvore` no `CONFIG_LAYOUT_DEFAULT` e no `mergeConfigLayout`.
- Exportar/importar sistema: ache o serializador do sistema (export/import com referências por NOME) e faça `requer_habilidades_ids`, `requer_modo` e `custo_pontos` viajarem do mesmo jeito que `requer_habilidade_id` viaja hoje (pré-requisito por nome). Atualize o teste dele.

### 54.3 Ficha — `FichaPage.jsx`, `AbasCentrais.jsx`, `ArvoreHabilidades.jsx`
- `FichaPage` calcula `pontosDaArvore` com o `contextoFormula` e `config.arvore`, passa `pontos` (com `rotulo`) e `saldoPontos` para a árvore, e passa `onRemoverHabilidade`.
- A aba "Árvore" aparece se alguma habilidade tem pré-requisito (lista ou antigo) OU (há `formula_pontos` e alguma habilidade com custo > 0).
- **Visual de constelação** (SVG, cores só por variável CSS para valer nos 6 temas):
  - fundo: gradiente radial do `--accent-800` (baixa opacidade) para transparente sobre `--bg`; ~60 estrelas (círculos pequenos, posições fixas geradas por semente, opacidade 0,2–0,7). Cintilar só se movimento não estiver reduzido (`[data-movimento="reduzido"]` e `prefers-reduced-motion` desligam).
  - nó = hexágono (raio ~26). `conhecida`: preenchido no acento com brilho (filtro de desfoque). `disponivel`: contorno `--accent-400`, preenchimento fraco, anel que pulsa (mesma regra de movimento). `bloqueada`: contorno `--border`, opacidade 0,55.
  - nome abaixo do nó em até 2 linhas; selo com o custo no canto do nó quando custo > 0.
  - ligação: curva; as duas pontas conhecidas = acento com brilho; pai conhecido e filho disponível = tracejada no acento; resto = `--border`.
  - cabeçalho: rótulo + "saldo de total" grande (só com orçamento) e o resumo de contagens; aviso de fórmula com erro.
  - clicar numa disponível aprende (como hoje); clicar numa conhecida mostra o detalhe com o botão "Esquecer (devolve N pontos)" quando permitido (decisão 5). Tudo só para o dono.
- `src/lib/fase54.acceptance.test.js`: sistema "Caminhos" — Início (0) → Estilo da Tartaruga (2) e Estilo da Cobra (2) → Armadura (exige as duas, custo 3) e Contra-ataque (basta uma, custo 1); fórmula `nivel*2` no nível 3 = 6 pontos; percorre aprender, saldo, bloqueio por pontos e esquecer.

### 54.4 Fechamento
Seção **"Como ficou"** no fim deste documento.

## Regras do projeto
As mesmas da `FASE53_COMBATE_EM_AREA.md` (tokens de cor, `text-sobre-acento`, fonte ≥ 12 px, toque ≥ 24 px, componentes `ui/`, sem dependência nova, interface em português).

## Fora do escopo
Posição livre dos nós (arrastar), várias árvores por ficha, trava no servidor.

## Como ficou

- **Motor** (`src/lib/arvoreHabilidades.js`): `prerequisitosDe`, `montarArvore` com vários pais (modo todos/qualquer), camada pelo caminho mais longo, custo e `saldoPontos`, `pontosDaArvore`, `dependentesConhecidos`, ligações por (pai, filho) e posições ordenadas pela média do x dos pais. Ciclo: remove as arestas que formam o círculo (todas as do ciclo, como antes — os testes da F33 seguem iguais) e avisa; as outras arestas do nó ficam.
- **Editor**: selos removíveis + "adicionar pré-requisito" (não oferece a própria habilidade nem as que dependem dela), rádio "Exige todas / Basta uma" com 2+, campo "Custo na árvore". `LayoutEditor` ganhou a seção "Árvore de habilidades" (fórmula + rótulo); `arvore` entrou no default e no merge.
- **Ficha**: constelação em SVG (estrelas, hexágonos, ligações com brilho/tracejado), saldo "X de Y", botão "Esquecer (devolve N pontos)" só para o dono, habilidade aprendida à mão e sem dependente conhecido. Animações em `motion.css` (`.arv-estrela`, `.arv-pulso`), desligadas com movimento reduzido.
- **Compatibilidade com o banco antigo**: sem as colunas novas, tudo vale `[]` / `'todos'` / sem custo. O editor só grava `requer_habilidades_ids`, `requer_modo` e `custo_pontos` quando o banco já devolve a coluna ou há valor a gravar — salvar uma habilidade sem usar os recursos novos continua funcionando antes do SQL.
- **Export/import de sistema**: nenhum código novo. O serializador leva a linha inteira e troca todo uuid (inclusive dentro de listas) pelo novo, então a lista de pré-requisitos já viaja; teste acrescentado em `systemSerializer.test.js`. O importador atômico depende das colunas existirem (rodar `sql/fase54_arvore_pontos.sql`).
- **Testes**: 7 novos em `arvoreHabilidades.test.js`, 2 em `fase54.acceptance.test.js`, 1 em `systemSerializer.test.js`.
- **Pendente**: rodar o SQL da F54 no banco.

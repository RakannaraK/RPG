# Fase 39 — Macros de rolagem na ficha

> Primeira fase da análise de concorrência de 2026-09 (`ANALISE_CONCORRENCIA_2026-09.md`).
> Cinco concorrentes têm: HubRPG, Road To Valhalla, Quest Portal, Let's Role, Tableplop.

## O que é
O jogador salva as rolagens que usa sempre ("Bola de Fogo = 8d6+nivel") e rola com um clique.
A notação aceita tudo que o motor já entende — dados, fórmulas (F17) e o atalho de nome solto —,
então a macro **acompanha o personagem**: sobe de nível, a rolagem sobe junto.

## Como ficou
- **Banco:** `fichas.macros jsonb` (`sql/fase39_macros.sql`, rodado). Sem RLS nova: vale a da ficha.
- **`lib/macros.js`** (puro, 5 testes): valida (nome até 40, rolagem até 200 caracteres, a
  rolagem resolvida tem de ser válida), resolve com o contexto da ficha, adiciona/edita/move/remove.
  Sem limite de quantidade.
- **`components/ficha/BarraMacros.jsx`** logo acima dos atributos: botões na variante `dado`,
  cada um mostrando a rolagem já resolvida; o total aparece ao lado por 5 s e a rolagem vai
  para o feed e para a bandeja de dados como qualquer outra.
- A macro é salva **com a fórmula** (`8d6+nivel`), não com o número — conferido no banco.
- Salvar é otimista: a primeira versão fazia `refetch()` da ficha, que remontava a página e tirava
  do modo de edição a cada macro adicionada. Agora a lista local muda na hora e volta atrás se o
  banco recusar.
- Macros viajam na ficha exportada (F30) e nas publicações da comunidade (F36).

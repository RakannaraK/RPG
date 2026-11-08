# Fase 55 — Painel inicial: saudação, "continuar de onde parou" e seus personagens

Origem: análise do LICHRPG (2026-11-07). O painel dele abre com "Olá, Tony", contagens, "Voltar para <última campanha>" e uma fileira de personagens com arte. O nosso abria direto em "Suas mesas" e não listava personagens.

## Decisões (fechadas)

1. **Recentes ficam no navegador** (`localStorage`, chave `dp-recentes`), sem coluna nova. Registro feito num componente no `App.jsx` que observa a rota — nenhuma página precisa mudar.
2. Rotas que contam (confira os padrões no `App.jsx`): `/mesa/:id` (mesa), `/mesa/:id/ficha/:fichaId` (ficha), `/mesa/:id/sessao/:sessaoId` (sessão), `/mesa/:id/mapa` (mapa). Guarda `{ tipo, mesaId, fichaId?, sessaoId?, rota, em }`, sem repetir a mesma rota, no máximo 10, mais recente primeiro. Toda leitura/escrita em `try/catch` (navegador privado).
3. **Personagens do usuário em todas as mesas:** hook novo `useMeusPersonagens()` — `fichas` com `dono_id = eu` e `tipo_ficha = 'personagem'`, colunas `id, nome_personagem, imagem_url, nivel, raca, classe, mesa_id, updated_at` + `mesa:mesa_id(id, nome, arquivada, capa)`, ordem `updated_at` desc, limite 12. Fora as de mesa arquivada.
4. Nada de "usuário do dia" nem saudação entre usuários.

## O que fazer

### 55.1 `src/lib/recentes.js` + teste
`registrarVisita(lista, visita)` (puro), `tipoDaRota(pathname)` (puro, devolve a visita ou `null`), `lerRecentes()`, `gravarRecentes(lista)`. Teste cobrindo os 4 tipos, rota que não conta, sem repetição, limite 10.

### 55.2 Registro — `App.jsx`
Componente pequeno com `useLocation` que chama `tipoDaRota` e grava. Não muda nada visível.

### 55.3 `DashboardPage.jsx`
Ordem nova das seções (o resto do painel fica como está):
1. **Saudação** (cartão no topo): "Olá, {nome}" — use o mesmo nome que o `BarraTopo` mostra —, a data por extenso em português, selos "{n} personagens" e "{n} mesas", e o botão **"Continuar: {rótulo}"** para o recente mais novo cuja mesa ainda está nas suas mesas. Rótulos: "Ficha de {nome}" / "Sessão em {mesa}" / "Mapa de {mesa}" / "{mesa}". Nome da mesa vem de `useMesas`; nome da ficha da lista do `useMeusPersonagens` (se não achar, "Ficha").
2. **Seus personagens**: fileira com rolagem lateral e encaixe (`snap`), cartões de ~11 rem: retrato (`imagem_url`, `object-cover`; sem imagem, a capa da mesa via `CapaMesa` com a inicial do nome), nome, "Nv N · classe" quando houver, nome da mesa em texto menor. Clicar abre a ficha. Carregando = esqueleto; nenhum personagem = some a seção (sem estado vazio).
3. "Primeiros passos do mestre", "Suas mesas" e "Arquivadas" como hoje.
- No celular (375 px) não pode haver rolagem lateral da página; só a fileira rola.

### 55.4 Fechamento
Seção **"Como ficou"** no fim deste documento.

## Regras do projeto
As mesmas da `FASE53_COMBATE_EM_AREA.md`.

## Como ficou
- `src/lib/recentes.js` (+ teste, 3 casos): `tipoDaRota`, `registrarVisita`, `lerRecentes`, `gravarRecentes` (chave `dp-recentes`, try/catch).
- `App.jsx`: `RegistraRecentes` dentro de `AppRoutes`, grava a cada mudança de rota que conta.
- `useMeusPersonagens` (fichas do usuário, não arquivadas, limite 12) e componentes `components/painel/Saudacao.jsx` e `MeusPersonagens.jsx`.
- `DashboardPage`: saudação, fileira de personagens, depois o resto como era. O título "Suas mesas" virou `h2` (o `h1` agora é "Olá, {nome}"). O selo de mesas e o "Continuar" consideram só mesas ativas.
- Nome: `perfil.username` ou parte do e-mail (mesma fonte do `MenuUsuario`, que é o que a barra topo exibe).

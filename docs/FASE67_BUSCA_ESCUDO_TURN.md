# Fase 67 — Busca no conteúdo, Escudo no padrão novo e TURN da chamada

Três partes independentes, pedidas pelo dono em 2026-11-19. Regras gerais: as do `NOTAS.md` e as de texto de `docs/FASE66_MULTI_IDIOMA.md`: todo texto de interface entra em `t()`, e a regra 18 vale. As decisões abaixo estão fechadas.

Executores em paralelo NÃO editam os dicionários (`src/i18n/en/*`, `src/i18n/es/*`, `fontes.json`). O teste "tudo traduzido" de `src/i18n/cobertura.test.js` vai falhar só com os textos novos, e isso é esperado: a tradução é feita numa etapa final.

## Parte 1 — Busca do Ctrl+K dentro das mesas

### Banco (já rodado)

`sql/fase67_busca_no_conteudo.sql` cria `buscar_conteudo(p_texto TEXT)`.
- A função é SECURITY INVOKER: passa pelas regras de leitura das telas.
- Devolve linhas `{ tipo, id, mesa_id, mesa_nome, titulo, detalhe, ficha_id }`, com `tipo` igual a `ficha`, `item`, `bau` ou `verbete`. São no máximo 10 de cada tipo.
- `detalhe` varia por tipo:
  - ficha: `personagem` ou `criatura`;
  - item: o nome da ficha;
  - verbete: o resumo, quando visível;
  - baú: nulo.
- `titulo` de verbete pode vir nulo, quando o título não foi revelado.
- Texto com menos de 2 ou mais de 60 caracteres não devolve nada.

### Tela

- `src/components/ui/PaletaComandos.jsx`: com 2 ou mais caracteres digitados, chamar `supabase.rpc('buscar_conteudo', { p_texto })`.
  - Esperar 250 ms depois da última tecla antes de chamar.
  - Ignorar uma resposta que chegue depois de uma busca mais nova (contador de pedidos).
  - Os resultados entram DEPOIS dos grupos locais, em três grupos novos: "Fichas", "Itens" (inclui os do baú) e "Verbetes".
  - Enquanto busca, mostrar uma linha "Buscando…". Erro da busca: seguir só com os resultados locais, sem aviso.
- `src/lib/paleta.js`: uma função pura `itensDaBusca(linhas)` converte as linhas no formato de item da paleta. Teste em `src/lib/paleta.test.js` (criar, se não existir).
  - `chave`: `b:<tipo>:<id>`.
  - `titulo`: o título; para verbete sem título, "Verbete sem título".
  - `detalhe`: "Criatura · <mesa>" ou "Ficha · <mesa>", "<ficha> · <mesa>", "Baú do grupo · <mesa>" ou "<mesa>".
  - `rota`, por tipo:
    - ficha: `/mesa/<mesa>/ficha/<id>`;
    - item: `/mesa/<mesa>/ficha/<ficha_id>`;
    - baú: `/mesa/<mesa>?aba=Fichas`;
    - verbete: `/mesa/<mesa>?aba=Enciclopédia&verbete=<id>`.
  - Não deduplicar estes itens pela rota: dois itens da mesma ficha são resultados diferentes.
  - O limite de 30 resultados vale só para os grupos locais.
- `src/pages/MesaPage.jsx`:
  - Ler `?verbete=<id>` e passar ao `PainelEnciclopedia` (prop `verbeteInicial`), que abre esse verbete ao carregar. A seleção já é o estado `aberto`.
  - Corrigir o defeito encontrado: `?aba=` hoje só aceita as abas de `TABS`. Para gestor, aceitar também as de `TABS_GESTOR` (Escudo, Cinemáticas).

## Parte 2 — Escudo do mestre no padrão do redesign

- Regras em `docs/FASE52_REDESIGN.md`. Usar tokens de cor (`bg-raised`, `bg-void`, `border-border`, `text-ink`, `text-ink-dim`, `text-harm`, `accent-*`, `dice-*`) e os componentes de `src/components/ui/` (Botao, Confirmar, EstadoVazio, CabecalhoSecao, Icone).
  - Cor crua (`slate-*`, `purple-*`, `amber-*`, `red-*`, `text-white`) só fica se tiver justificativa em comentário.
- `src/components/mesa/PainelRelogios.jsx` (12 cores cruas) e `src/components/mesa/PainelOverlay.jsx` (14 cores cruas): refazer o visual no padrão. O comportamento fica igual: as mesmas props, as mesmas gravações, os mesmos atalhos.
  - Cartão no mesmo molde da `CAIXA` de `PainelEscudo.jsx`. Botões de texto pelo `Botao`. Lista vazia pelo `EstadoVazio` ou por uma linha de texto, quando o cartão for pequeno (como foi feito no Escudo e no Baú na F62).
  - O segmento do relógio preenchido usa a cor de destaque do tema.
- `src/components/dados/RoladorGenerico.jsx` já usa o padrão. No Escudo, só conferir o encaixe (espaçamentos e cabeçalho iguais aos dos outros cartões).
- Os dois componentes também aparecem fora do Escudo: conferir com grep e garantir que continuam certos nesses lugares.
- Acessibilidade: botão só com ícone leva `aria-label`; o estado do relógio é anunciado ("3 de 6"); o foco fica visível.

## Parte 3 — TURN para a chamada (Cloudflare Realtime TURN)

Decisão: Cloudflare Realtime TURN.
- Preço: 1.000 GB por mês grátis, depois US$ 0,05/GB (developers.cloudflare.com/realtime/turn/faq/).
- Credencial: temporária, gerada por API com chave que fica só no servidor (developers.cloudflare.com/realtime/turn/generate-credentials/).

### Edge Function `supabase/functions/turn-credenciais/index.js`

- JavaScript puro, sem TypeScript, com `/* global Deno */`. O dono cola esse arquivo no editor de Edge Functions do painel do Supabase.
- `Deno.serve`, com CORS: responde ao `OPTIONS` e manda os cabeçalhos `authorization, x-client-info, apikey, content-type` em todas as respostas.
- Segredos: `CF_TURN_KEY_ID` e `CF_TURN_TOKEN`. Sem algum deles, responder 501 `{ erro: 'turn_nao_configurado' }`.
- Corpo `{ mesaId }`, que precisa ter formato de uuid; senão, 400.
- Permissão: criar um cliente com `npm:@supabase/supabase-js@2`, usando `SUPABASE_URL`, `SUPABASE_ANON_KEY` e o cabeçalho `Authorization` de quem chamou. Chamar `rpc('posso_entrar_na_chamada', { p_topico: 'chamada:' + mesaId })`, a mesma função que protege o canal da chamada (F65). Se não for `true`, responder 403.
- Cloudflare:
  - Pedido: `POST https://rtc.live.cloudflare.com/v1/turn/keys/<CF_TURN_KEY_ID>/credentials/generate-ice-servers`, com `Authorization: Bearer <CF_TURN_TOKEN>` e corpo `{ "ttl": 43200 }` (12 horas, para uma sessão longa).
  - Falha: responder 502.
  - Sucesso: devolver `{ iceServers }` sem as URLs na porta 53, porque a documentação avisa que elas dão timeout em navegador.

### Navegador

- `src/lib/chamada.js`: `normalizarIce(json)`, puro e com teste. A resposta da função é tratada como dado não confiável.
  - Aceita no máximo 6 servidores.
  - `urls`: texto ou lista de textos começando com `stun:`, `turn:` ou `turns:`, cada um com até 300 caracteres.
  - `username` e `credential` opcionais, texto de até 500 caracteres.
  - Resultado vazio ou inválido devolve `null`.
- `src/hooks/useChamada.js`:
  - Em `entrar()`, começar a buscar a lista ANTES de pedir o microfone (as duas coisas correm em paralelo): `supabase.functions.invoke('turn-credenciais', { body: { mesaId } })`, com tempo máximo de 4 s.
  - Guardar a lista no estado da chamada (`r.current`), e `criarPar` usar essa lista. Se a busca falhar, se esgotar o tempo ou se a função não existir, usar a lista de hoje (`servidoresIce(VITE_ICE_SERVERS)`, que por padrão é só o STUN), sem mostrar erro.
  - Aproveitar e corrigir: o nome padrão `'Jogador'` mandado na presença vira `t('Jogador')` (regra 17).

### O que o dono faz (o código já funciona sem isso: a chamada segue só com STUN)

1. Criar conta grátis em dash.cloudflare.com, abrir "Realtime" e depois "TURN Server", e criar uma chave. Copiar o "Turn Token ID" e o "API Token", que aparece uma vez só.
2. No painel do Supabase, em Edge Functions, escolher "Deploy a new function", depois "Via Editor", com o nome `turn-credenciais`. Colar o conteúdo de `supabase/functions/turn-credenciais/index.js` e publicar.
3. Em Edge Functions, depois Secrets, criar `CF_TURN_KEY_ID` e `CF_TURN_TOKEN` com os dois valores.
4. Testar uma chamada pelo 4G.

## Fora desta fase

- A regra antiga "membros veem itens" (em `itens_ficha`) deixa qualquer membro ler os itens de fichas privadas pela API. A busca não expõe esses itens, porque junta com `fichas`. A política é corrigida à parte, com o ok do dono.
- Índice para a busca: só se ela ficar lenta.

## Como ficou

- Busca:
  - `buscar_conteudo` está no banco.
  - `itensDaBusca` em `src/lib/paleta.js`, com testes.
  - A paleta busca depois de 250 ms parada e ignora resposta velha.
  - `?verbete=<id>` abre o verbete na Enciclopédia.
  - `?aba=Escudo` e `?aba=Cinemáticas` passaram a funcionar para o gestor.
- Escudo:
  - Relógios e Overlay estão no padrão do redesign, sem cor crua.
  - O segmento cheio do relógio usa a cor de destaque do tema.
  - O estado é anunciado como "3 de 6", e os botões de ícone têm rótulo.
  - O Rolador e o `PainelEscudo` não precisaram mudar.
- TURN:
  - `supabase/functions/turn-credenciais/index.js` está escrito, mas o dono ainda precisa publicá-lo.
  - `normalizarIce` em `src/lib/chamada.js`, com testes.
  - `useChamada` busca a lista junto com o pedido do microfone, com limite de 4 s. Qualquer falha cai no STUN, sem aviso.

### Como foi conferido

- Lint sem erros, build ok, todos os testes passando (1124).
- Banco, em transação desfeita, com as contas de teste:
  - o jogador acha a ficha pública, o item dela, o item do baú e o verbete revelado (só o título);
  - o jogador não acha a criatura privada, o item dela, o verbete não revelado nem um trecho não revelado do corpo;
  - o mestre acha tudo;
  - o estranho não acha nada;
  - texto de 1 caractere não devolve nada;
  - anônimo não executa a função.
- Navegador, com sessão falsa:
  - Busca: os grupos novos aparecem depois dos locais, em português e em inglês; "Buscando…" aparece durante a espera; o clique leva à ficha, e o verbete abre pelo link; com 1 caractere a busca não chama o banco.
  - Escudo: `?aba=Escudo` abre a aba; os cartões seguem o mesmo molde.
  - Chamada: com a função respondendo, a conexão usa a lista do TURN; com 404, usa só o STUN e entra sem erro.
- Não conferido: a função publicada de verdade, chamando a Cloudflare, e a chamada pelo 4G. Os dois dependem do dono.

### Achado fora da fase (decisão do dono)

Em 12 tabelas filhas da ficha, a regra de leitura "membros veem …" não olha `privada`. Pela API, qualquer membro da mesa lê o conteúdo de fichas privadas e de criaturas privadas do mestre. As tabelas são:
- `itens_ficha`;
- `valores_atributos`;
- `valores_combate`;
- `pericias_ficha`;
- `habilidades_ficha`;
- `linhas_ficha`;
- `estados_ficha`;
- `condicoes_manuais_ficha`;
- `trilhas_ficha`;
- `imagens_ficha`;
- `descansos_log`;
- `xp_log`.

A tela não mostra esses dados, e a busca também não. A correção é trocar a condição por `ficha_id IN (SELECT id FROM fichas)`, que segue a regra da ficha. Só que pode esconder do jogador algo que hoje ele vê, como a vida de uma criatura privada no mapa ou no combate.

# Fase 66 — Multi-idioma (português, inglês e espanhol)

O site inteiro passa a ter inglês e espanhol, além do português. Estava registrado como "não fazer"; foi reaberto a pedido do dono em 2026-11-13, com a escolha "site inteiro agora".

Regras gerais: as do `NOTAS.md`. As decisões abaixo estão fechadas. A partir desta fase a regra "interface em português" vira "texto de interface escrito em português DENTRO de `t()`".

## Como funciona

O texto em português é a própria chave. `t('Salvar')` devolve "Salvar" em português, "Save" em inglês e "Guardar" em espanhol. Sem tradução cadastrada, devolve o português: nada quebra enquanto a tradução não chega.

`src/i18n/index.js`:

- `IDIOMAS = [{ id: 'pt', nome: 'Português', locale: 'pt-BR' }, { id: 'en', nome: 'English', locale: 'en-US' }, { id: 'es', nome: 'Español', locale: 'es-ES' }]`.
- `t(texto, vars)`: procura `texto` no dicionário do idioma atual; troca `{nome}` pelos valores de `vars`.
- `tn(n, um, varios, vars)`: escolhe singular ou plural e chama `t` com `{ n, ...vars }`. Exemplo: `tn(n, '{n} cena', '{n} cenas')`.
- `tx(contexto, texto, vars)`: para palavra igual com sentidos diferentes. Procura `texto|contexto` no dicionário; sem ela, cai em `texto`; sem nenhuma, no português. No dicionário a chave é escrita `'Entrar|mesa'`.
- `idiomaAtual()`, `locale()` (para datas e números).
- `iniciarIdioma()`: lê a escolha gravada em `localStorage` (`dp-idioma`); sem escolha, usa o idioma do navegador se for `en` ou `es`, senão `pt`. Carrega o dicionário sob demanda (`import()` dinâmico) e ajusta `<html lang>`. Tudo com `try/catch`: sem `localStorage`, fica em português.
- `trocarIdioma(id)`: grava a escolha e recarrega a página. É de propósito: `t()` é chamado também fora de componentes (constantes no topo de módulo, libs), e recarregar garante que tudo saia no idioma novo.

`src/main.jsx`: `await iniciarIdioma()` e só depois `import('./App.jsx')`, para o dicionário já estar pronto quando os módulos forem avaliados. O `main.jsx` não importa mais nada do aplicativo de forma estática.

Dicionários: `src/i18n/en.js` e `src/i18n/es.js` juntam os arquivos por área, `src/i18n/en/<area>.js` e `src/i18n/es/<area>.js`, cada um com `export default { 'texto em português': 'tradução', … }`.

Áreas (cada texto pertence à primeira área em que aparece, nesta ordem): `ui` (`src/components/ui`, `auth`, `ajuda`, `arte`, `marca`, `notificacoes`, `painel`, `preferencias`, `comunidade`, `cinematica`, `chamada`, `ErrorBoundary.jsx`, `src/App.jsx`), `pages` (`src/pages`), `ficha`, `sistema`, `mesa`, `mapa`, `sessao`, `jogos` (`dados`, `minigames`, `bestiario`), `lib` (`src/lib`, `src/hooks`, `src/context`, `src/audio`).

`scripts/i18n-extrair.mjs` (Node puro): varre `src/` atrás de `t('…')`, `t("…")`, `` t(`…`) `` sem interpolação e dos dois textos de `tn(…)`, e grava `src/i18n/fontes.json` no formato `{ "<area>": ["texto", …] }`, sem repetição. Com `--faltando`, imprime por idioma e área quantos textos ainda não têm tradução. A função de extração é exportada para o teste usar.

`src/i18n/cobertura.test.js`:

1. Nenhuma chamada `t(` ou `tn(` em `src/` com primeiro argumento que não seja texto literal.
2. Em toda tradução existente, o conjunto de `{variáveis}` é igual ao do texto em português.
3. Com a constante `EXIGIR_COMPLETO = true`, todo texto extraído tem tradução não vazia em `en` e `es`. Ela começa em `false` e é ligada no fim da fase.

Seletor de idioma: em `PreferenciasModal` (para quem está logado) e no rodapé da `AuthPage` (para quem ainda não entrou).

## Regras para embrulhar texto (valem para todos os executores)

1. Importar `t` (e `tn` se precisar) de `src/i18n` pelo caminho relativo.
2. Embrulhar todo texto em português que a pessoa lê: texto de JSX; atributos e props de texto (`placeholder`, `title`, `aria-label`, `alt`, `label`, `titulo`, `subtitulo`, `data-dica`, `rodape` e parecidos); opções de `select`; mensagens de aviso, erro e confirmação (`toast`, `setErro`, `throw new Error`, `useConfirmar`); tabelas constantes com campo exibido (`nome`, `rotulo`, `descricao`).
3. JSX: `<p>Texto</p>` vira `<p>{t('Texto')}</p>`.
4. Texto com valor no meio: `` `Olá, ${nome}` `` vira `t('Olá, {nome}', { nome })`. No JSX, `Vida: {a} de {b}` vira `{t('Vida: {a} de {b}', { a, b })}`. Quando há um elemento no meio da frase (`<b>`, link), traduzir os pedaços separados.
5. Plural: `tn(n, '{n} item', '{n} itens')`. Não montar plural juntando "s".
6. O argumento de `t()` é SEMPRE texto literal. Nunca `t(variavel)`. Para tabela constante, embrulhar na definição: `{ id: 'ficha', nome: t('Ficha') }`.
7. NÃO embrulhar: classes de CSS, ids, chaves, rotas, nomes de evento, valores gravados ou comparados com o banco (`'mestre'`, `'jogador'`, `'ficha'`, ids de vocabulário), palavras da gramática de fórmulas (`piso`, `teto`, `nivel`, `atributo`…), `console.*`, comentários, texto de teste, o nome "Dado & Pena", e qualquer coisa que venha do banco ou tenha sido escrita por uma pessoa.
8. NÃO mudar a redação do português (o texto é a chave, e há testes que conferem as frases). NÃO alterar arquivos `*.test.js`.
9. Datas e números: trocar `'pt-BR'` fixo em `toLocale…` e `Intl.…` por `locale()`.
10. Não mexer em lógica, estrutura ou estilo: a mudança é só embrulhar texto.
11. Ao terminar um lote: `npx eslint` nos arquivos alterados sem erros nem aviso novo, e `npx vitest run` nos testes da área passando.
12. Antes de embrulhar um arquivo, renomear toda variável local chamada `t` (`.map(t => …)`, `const t = setInterval(…)`, parâmetro `t`): ela esconde a função `t` e a tela quebra com "t is not a function" sem o lint avisar. Importar sempre com os nomes `t`, `tn` e `tx`, sem apelido.
13. Lista que é id e rótulo ao mesmo tempo (por exemplo abas comparadas com `tab === 'Dados'`): manter o id em português e acrescentar o rótulo traduzido, `{ id: 'Dados', rotulo: t('Dados') }`, mostrando `rotulo` e comparando `id`. É a única mudança de estrutura permitida.
14. Palavra igual com sentidos diferentes: `tx('contexto', 'Texto', vars)`. Procura a tradução de `Texto|contexto` e, se não houver, a de `Texto`. Usar só quando a mesma palavra em português precisa de traduções diferentes. Contextos combinados: `conta` ("Entrar" na conta), `mesa` ("Entrar" na mesa), `combate` ("Entrar" no combate), `chamada` ("Entrar" e "Sair" da chamada).
15. Texto com `{variável}` sempre leva o segundo argumento com os valores. Nunca escrever `${…}` dentro de aspas simples ou duplas. Se o texto mostra chaves de verdade (por exemplo uma ajuda de fórmula com `{x}`), passar `{}` como segundo argumento para o teste não acusar.
16. Não rodar `node scripts/i18n-extrair.mjs` sem opção (ele regrava `fontes.json` e vários executores trabalham ao mesmo tempo). Para conferir o próprio lote, usar `npx vitest run src/i18n`, que aponta arquivo e linha de cada chamada malformada.
17. Texto que o próprio site monta e grava no banco para outras pessoas lerem (rótulo de rolagem, evento do feed da sessão, notificação, mensagem automática do chat) TAMBÉM é embrulhado: fica gravado no idioma de quem fez a ação. Numa mesa em inglês o feed sai em inglês. Continua sem embrulhar o que a pessoa digitou e o que já vem pronto do banco.
18. Se depois do embrulho aparecer o erro de lint `react-hooks/preserve-manual-memoization` ("This dependency may be mutated later"), a causa é `t('…', { nome: objeto.propriedade })` recebendo propriedade de um objeto que vem de estado ou de `useMemo`: o compilador do React acha que `t` pode alterar esse objeto. Copiar o valor para uma constante de texto antes (`const nome = String(objeto?.propriedade ?? '')`) e passar a constante. Nunca usar `eslint-disable`.

## Ordem para quem embrulha um lote

Cada executor recebe o nome de um lote (lista de arquivos). O trabalho dele:

1. Ler este documento inteiro e as regras do `NOTAS.md`.
2. Para cada arquivo do lote, na ordem: procurar variável local chamada `t` e renomear (regra 12); embrulhar os textos seguindo as regras 1 a 16; passar para o próximo. Arquivo sem texto visível fica como está.
3. Alterar SOMENTE os arquivos do próprio lote. Não tocar em `src/i18n/`, em `scripts/`, em `*.test.js`, nem em arquivo de outro lote (outros executores trabalham ao mesmo tempo).
4. Arquivo grande: localizar os textos com busca (aspas com letras acentuadas, `placeholder=`, `title=`, `aria-label=`, `>` seguido de letra) e ler por trechos. Depois de embrulhar, passar os olhos no arquivo de novo para pegar o que a busca não mostrou (texto de JSX sem acento, por exemplo).
5. Ao terminar: `npx eslint <arquivos do lote>` sem erros nem aviso novo; `npx vitest run src/i18n` passando (aponta chamada malformada com arquivo e linha); e os testes que cobrem os arquivos do lote passando. Não rodar `npm run build` nem o extrator sem opção.
6. Não fazer commit.
7. Resposta em até 8 linhas: arquivos alterados (quantidade), arquivos pulados e por quê, quantos textos embrulhou (aproximado), uso de `tx` (onde e com que contexto), qualquer caso duvidoso que deixou sem embrulhar (arquivo e linha) e o resultado do lint e dos testes.

## Ordem para quem traduz uma área

1. Ler este documento inteiro.
2. Para a área recebida, rodar `node scripts/i18n-extrair.mjs --lista en <area>` e `--lista es <area>`: cada um imprime o JSON dos textos que faltam.
3. Acrescentar as traduções em `src/i18n/en/<area>.js` e `src/i18n/es/<area>.js`, sem apagar nem mudar o que já existe ali. Chave com contexto é escrita como veio (`'Entrar|mesa'`) e traduzida pelo sentido do contexto.
4. Alterar SOMENTE esses dois arquivos.
5. Ao terminar: os dois `--lista` imprimem `[]`; `npx vitest run src/i18n` passando; `npx eslint` nos dois arquivos sem erros.
6. Resposta em até 6 linhas: quantos textos traduziu por idioma, termos em que ficou em dúvida (original → escolha), e o resultado das conferências.

## Regras para traduzir

- Entrada: a lista da área em `src/i18n/fontes.json`. Saída: `src/i18n/en/<area>.js` e `src/i18n/es/<area>.js`.
- Manter `{variáveis}`, emojis, pontuação final, espaços nas pontas e quebras de linha exatamente como no original. Manter o tamanho parecido: é texto de botão e rótulo.
- Tom: direto e informal. Inglês em "sentence case". Espanhol com "tú".
- Glossário (português → inglês / espanhol):
  - Mesa → Table / Mesa · Ficha → Sheet (Character sheet) / Hoja (Hoja de personaje) · Token → Token / Token
  - Mestre → GM / Máster · Co-mestre → Co-GM / Co-máster · Jogador → Player / Jugador · Espectador → Spectator / Espectador · Convidado → Guest / Invitado
  - Sessão → Session / Sesión · Combate → Combat / Combate · Encontro → Encounter / Encuentro · Turno → Turn / Turno · Rodada → Round / Ronda · Iniciativa → Initiative / Iniciativa
  - Rolar, Rolagem → Roll / Tirar, Tirada · Dado, Dados → Die, Dice / Dado, Dados
  - Atributo → Attribute / Atributo · Perícia → Skill / Pericia · Habilidade → Ability / Habilidad · Poder → Power / Poder · Magia → Spell / Hechizo · Maestria → Mastery / Maestría
  - Raça → Race / Raza · Classe → Class / Clase · Nível → Level / Nivel · Vida → Health / Vida · Vida temporária → Temporary health / Vida temporal · Dano → Damage / Daño · Cura → Healing / Curación · Descanso → Rest / Descanso
  - Bestiário → Bestiary / Bestiario · Enciclopédia → Encyclopedia / Enciclopedia · Verbete → Entry / Entrada · Baú → Party stash / Cofre del grupo · Escudo do mestre → GM screen / Pantalla del máster
  - Mapa → Map / Mapa · Cena → Scene / Escena · Névoa de guerra → Fog of war / Niebla de guerra · Parede → Wall / Pared · Porta → Door / Puerta · Linha de visão → Line of sight / Línea de visión
  - Cinemática → Cutscene / Cinemática · Chamada → Call / Llamada · Extensão → Extension / Extensión · Comunidade → Community / Comunidad · Painel → Dashboard / Panel · Convite → Invite / Invitación · Trilha (sonora) → Soundtrack / Banda sonora · Relógio → Clock / Reloj
  - "Dado & Pena" não se traduz.
- Palavras da gramática de fórmula (`piso`, `teto`, `nivel`, `mod(...)`) ficam em português: o interpretador lê essas palavras.

## Fora desta fase

- Conteúdo embutido grande: o bestiário SRD (`src/lib/srd5eDados.js`) e as tabelas de nomes do gerador de NPC ficam em português.
- Mensagens de erro que vêm do banco (as funções SQL respondem em português).
- O que as pessoas escrevem (fichas, sistemas, verbetes, publicações) não é traduzido.
- A escolha de idioma vale por navegador (`localStorage`), não fica gravada na conta.

## Como ficou

- 3456 textos de interface, todos traduzidos para inglês e espanhol, em `src/i18n/{en,es}/<area>.js`. O teste `src/i18n/cobertura.test.js` exige tradução completa (`EXIGIR_COMPLETO = true`): texto novo sem tradução quebra o CI.
- O extrator (`npm run i18n`) também acusa:
  - argumento que não é texto literal;
  - `${}` entre aspas;
  - `{var}` sem valores;
  - variável que não é nome simples (`{lista.length}`);
  - variável local que esconde `t`;
  - `t.x` sobrando de uma variável renomeada pela metade.
- Ficam em português de propósito, porque o valor é casado como identificador:
  - `AMEACAS` (`PainelBestiario.jsx`);
  - `FAIXAS_CRONOMETRO` (`minigames/cronometro.js`);
  - os nomes de cena e de efeito de `extensoes/catalogo.js` (o nome gera o id);
  - as chaves `dano` e `ataque` das propriedades de item;
  - as frases do gerador de NPC.
- O campo de defesa é reconhecido em português, inglês e espanhol (`ehCampoDefesa` em `defesaEngine.js`): antes, só "CA", "armadura" e "defesa".
- Texto que o site grava para os outros (feed, rótulo de rolagem, valores padrão de um sistema novo) fica no idioma de quem gravou.

### Como foi conferido

- Lint sem erros, build ok, todos os testes passando.
- Revisão do Opus em duas partes. A do embrulho achou dois defeitos que só apareciam fora do português: a dica de propriedade de arma traduzida, e a CA reconhecida só pelo nome em português. A da qualidade revisou o glossário e uma amostra das traduções.
- Navegador, com sessão falsa, em inglês e em espanhol: entrada, painel, mesa e abas, ficha, mapa, sessão ao vivo e painel de combate, comunidade e todas as abas de preferências, sem texto de interface em português. A conferência achou `{passos.length}` cru no painel e o lema sem tradução, já corrigidos.
- Não conferido: as telas com dados reais (login de verdade).

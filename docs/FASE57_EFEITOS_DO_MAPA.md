# Fases 57–60 — Efeitos do mapa: atmosfera, luz, efeitos de ação e extensões

Pedido do dono (2026-11-11): assets, tokens animados, sistema de efeitos visuais, extensões que o mestre baixa e põe na mesa, neblina, iluminação, efeitos de habilidade, fogo queimando com barulho ("arena de fogo", "inferno").

## Brainstorm e o que foi decidido

| Ideia | Decisão |
|---|---|
| Clima e ambiente na cena (fogo, brasas, cinzas, neblina, chuva, neve, areia, vaga-lumes, bolhas, runas, relâmpago) | **F57** |
| Efeito preso a um ponto do mapa (fogueira, poço de lava, nuvem de veneno) | **F57** |
| Som ambiente sintetizado que acompanha o efeito (fogo crepitando, chuva, vento, grilos, água, zumbido infernal/arcano, trovão) | **F57** |
| Escuridão da cena + luzes (fixas e carregadas por token: tocha, lanterna, magia), com tremulação | **F58** |
| Aura colorida no token (o concorrente tem) | **F58** |
| Efeitos de ação: projétil, explosão, raio, cura, corte, onda — soltos pelo mestre, pelo combate e por habilidade | **F59** |
| Extensões: pacotes de cenas prontas e efeitos (Inferno, Tempestade, Cripta…) que o mestre instala; importar/baixar `.json` | **F60** |
| Tokens e retratos animados (GIF, WebP animado, APNG) | **F60** |
| Mapa animado | Vem de graça com a F60 até 3 MB (GIF/WebP). Vídeo (webm/mp4) fica para depois: pesa no 1 GB do Supabase |
| Paredes e linha de visão (luz que não atravessa parede) | **Não agora.** É outro produto (editor de paredes + cálculo de visão). A luz daqui é de ambiente. Revê o "não fazer iluminação dinâmica" de 2026-09 só na parte visual |
| Sprites prontos de magia (estilo JB2A) | **Não.** Arquivos pesados e licença não comercial; o procedural cobre |
| Biblioteca de ícones para token (game-icons.net, CC BY 3.0) | Depois — exige página de créditos e quebra a regra de zero arquivo de imagem |
| Publicar extensões na Comunidade | Depois — o arquivo `.json` já viaja; falta só o tipo novo na vitrine (F36) |
| Loop de som enviado pelo mestre (mp3) | Depois — a F35 já aceita som curto; laço longo pesa no Storage |
| Efeito sincronizado quadro a quadro entre jogadores | Não — cada navegador sorteia as partículas; só o que existe (e onde) é igual para todos |

## Regras gerais (valem para as quatro fases)

1. **Zero arquivo de imagem ou de áudio no repositório** (F37): partículas em canvas, luz em SVG, som em Web Audio.
2. **Nenhuma dependência nova.**
3. **Efeito é enfeite.** Nada aqui muda regra, visão ou dano. A luz não esconde token de ninguém.
4. **Vocabulário** em `src/lib/efeitosVocabulario.js` (já escrito — não alterar): ids, limites, `corValida`, `limitar`, `textoCurto`.
5. **Dado não confiável** (banco, arquivo importado, broadcast) sempre passa por um `normalizar*` antes de ser usado ou desenhado. Tipo/forma/som fora da lista é descartado; número é limitado; cor inválida vira a padrão.
6. **Preferências de cada pessoa** (`usePreferencias()` → `{ preferencias, reduzido }`): `densidade` = 1 com `particulasLigadas(efeitos, reduzido)`; 0,5 com `efeitos === 'sutis'` e sem movimento reduzido; 0 nos outros casos. Com densidade 0 não há partícula nem animação de efeito de ação (a luz continua, parada). Som usa as preferências de "Sons de ação" (`som_acao_ativo`, `som_acao_volume`).
7. Interface em português; componentes `ui/` (Botao, Modal, Icone…); cores só por token (`bg-void`, `border-border`, `text-ink`, `text-ink-dim`, `accent-*`, `harm/ok/warn/temp`); texto sobre botão de acento = `text-sobre-acento`; fonte ≥ 12 px; alvo de toque ≥ 24 px; raios `rounded-lg`/`xl`/`2xl`/`full`; âmbar/vermelho de dado só para dado e aviso.
8. O SQL é `sql/fase57_efeitos_do_mapa.sql` (**já rodado**): as colunas existem.

## Dados

**`mapas.atmosfera`** (JSONB):
```js
{
  efeitos: [{ id, tipo, intensidade /* 0.1–1 */, cor /* '#rrggbb' | null = cor do tipo */,
              x, y /* px do mapa */, raio /* unidades da grade (ex.: metros) */ }],
              // sem x/y/raio = cena inteira. Máx. LIMITES.efeitos.
  luz: { escuridao /* 0–0.95 */, cor /* '#rrggbb', padrão '#05070C' */,
         fontes: [{ id, x, y, raio /* unidades da grade */, cor, tremula /* bool */ }] },   // máx. LIMITES.fontes
  sons: [/* ids de SONS_AMBIENTE tocados além dos que os efeitos já trazem; máx. LIMITES.sons */],
  som: true   // false = cena muda para todos
}
```
**`tokens_mapa.luz`** = `{ raio, cor, tremula }` ou `null`. **`tokens_mapa.aura`** = `{ raio, cor }` ou `null`. Raios em unidades da grade.

Unidade da grade → px: `raio / grade.unidade * grade.tamanho` (com `normalizarGrade` de `mapaEngine.js`).

**Efeito de ação** (um "preset"): `{ id, nome, forma /* FORMAS_VFX */, cores: [c1, c2], som /* SONS_VFX | null */ }`.

**Evento de efeito de ação** (broadcast `vfx` no canal `vfx-${mesaId}`):
```js
{ efeito /* preset inteiro */ | efeitoId /* id resolvido por quem recebe */,
  de: Alvo | null, para: Alvo[] /* máx. LIMITES.alvosVfx */, raio /* unidades da grade */ | null }
// Alvo = { x, y } | { comb: idCombatente, ficha: idFicha | null } | { ficha: idFicha }
```
Quem recebe resolve cada Alvo para o centro do token (por `combatente_id`; se não achar, por `ficha_id`); alvo sem token é descartado.

**Extensão** (pacote):
```js
{ formato: 'dado-e-pena/extensao', versao: 1, id, nome, descricao, autor,
  cenas: [{ id, nome, atmosfera: { efeitos: [{ tipo, intensidade, cor }], luz: { escuridao, cor }, sons: [] } }],
  efeitos: [/* presets de efeito de ação */] }
```
Cena de pacote nunca traz posição (só efeitos de cena inteira) nem fontes de luz.
**`mesas.extensoes`** = lista com ids do catálogo (texto) e/ou pacotes importados inteiros (objeto). Gravada pela RPC `definir_extensoes(p_mesa_id, p_extensoes)`.

---

## F57 — Atmosfera (executor A)

Arquivos: `src/lib/atmosfera.js` (+ `.test.js`), `src/audio/somAmbiente.js` (+ `.test.js`), `src/components/mapa/CamadaAtmosfera.jsx`, `src/components/mapa/PainelAtmosfera.jsx`.

**`src/lib/atmosfera.js` (puro)**
- `ATMOSFERA_VAZIA`; `normalizarAtmosfera(raw)` → forma completa acima (regra geral 5; inclui `luz.fontes`).
- Operações (devolvem atmosfera nova, já normalizada): `adicionarEfeito(atm, { tipo, x, y, raio })`, `atualizarEfeito(atm, id, patch)`, `removerEfeito(atm, id)`, `adicionarFonte(atm, { x, y, raio, cor, tremula })`, `atualizarFonte(atm, id, patch)`, `removerFonte(atm, id)`, `definirLuz(atm, { escuridao, cor })`.
- `aplicarCena(atm, cena)`: troca os efeitos de cena inteira, a escuridão/cor e os `sons` pelos da cena; **mantém** efeitos com posição e fontes de luz. `limparCena(atm)`: tira o que `aplicarCena` põe.
- `colocarNoMapa(atm, pedido, ponto)`: `pedido` = `{ oQue: 'efeito', tipo }` (cria efeito local, raio padrão de 2 quadrados) | `{ oQue: 'luz' }` (cria fonte, raio de 4 quadrados, `#FFC27A`, trêmula) | `{ oQue: 'mover', id }` (muda x/y do efeito ou da fonte com esse id). Tipo `soCena` não vira local.
- `volumesDaAtmosfera(atm)` → `{ [idSom]: 0–1 }`: para cada som, a maior intensidade entre os efeitos que o usam; sons de `atm.sons` entram com 0,6; `{}` se `som === false`.
- Motor de partículas, com sorteio injetável (`rnd = Math.random`) para teste: `quantasParticulas(tipo, intensidade, area, densidade)`, `nascer(tipo, regiao, rnd)`, `mover(p, tipo, dt, regiao)` (false = renasce). `regiao` = `{ x, y, w, h }` (cena inteira, em px da tela) ou `{ cx, cy, r }` (local, em px do mapa). Reaproveitar `nascer/mover/brilho` de `src/lib/ambiente.js` para brasas, neve e runas quando servir.
- Teto: 700 partículas somadas (350 com `navigator.hardwareConcurrency <= 4` ou densidade 0,5).

**Aparência de cada tipo**
- `fogo`: sobe; soma de luz (`lighter`); nasce amarelo, vira a cor do efeito e morre vermelho-escuro; 6–18 px; vida 0,6–1,2 s. Cena inteira: nasce numa faixa de 12% na base da tela. Local: nasce no círculo (mais denso no centro) e sobe até ~1 raio.
- `brasas`, `neve`, `runas`: como no fundo do site (`ambiente.js`).
- `cinzas`: flocos cinzentos caindo devagar com deriva lateral, sem soma de luz.
- `neblina`: 10–18 manchas grandes (gradiente radial, alfa 0,05–0,12 × intensidade) derivando devagar; local = confinadas ao círculo.
- `chuva`: riscos inclinados rápidos (700–1100 px/s), alfa 0,35.
- `areia`: grãos pequenos e rápidos na horizontal + véu leve da cor do efeito.
- `vagalumes`: pontos que piscam (seno) e vagam; soma de luz.
- `bolhas`: círculos só com contorno, subindo e oscilando.
- `relampago`: sem partícula. A cada 4–14 s (mais frequente com intensidade alta) um clarão branco-azulado na tela inteira (alfa até 0,35, dois pulsos em 200 ms) e, 300–1500 ms depois, o trovão. Cada navegador sorteia o seu.

**`src/audio/somAmbiente.js`** — `criarSomAmbiente()` → `{ atualizar(volumes), trovao(volume), parar() }`. Usa `getAudioContext()` de `src/lib/diceSounds.js`. Cria o laço na primeira vez que o volume passa de 0; muda volume com rampa de 0,4 s; para e desconecta o laço que chega a 0. Contexto suspenso (navegador exige gesto): tenta `resume()` no primeiro `pointerdown`. Trovão = `tocarPresetAcao('trovao', …)` de `src/audio/actionSynth.js`.
Receitas: `fogo` = ruído marrom em passa-baixa ~900 Hz + estalos (rajadas de ruído de 8–25 ms em passa-banda 1,5–4 kHz, a cada 40–200 ms); `chuva` = ruído branco entre 1 e 8 kHz; `vento` = ruído em passa-banda cujo centro passeia entre 300 e 900 Hz (LFO lento) com ganho ondulando; `noite` = senoide ~4,2 kHz em trinados curtos e baixos; `agua` = ruído em passa-baixa 400 Hz + bolhas (senoide de 80 ms subindo de 300 a 900 Hz); `infernal` = duas serras em 55 e 58,3 Hz em passa-baixa 220 Hz; `arcano` = senoides em 220 e 331 Hz com trêmolo lento. Tudo baixo: é fundo, não pode cobrir a voz da mesa.

**`CamadaAtmosfera({ atmosfera, vista, nevoa, verTudo, densidade, somVolume })`** — HTML (vai na `sobreposicao` do `MapaVisor`): `<canvas>` absoluto cobrindo o visor, `pointer-events: none`, `aria-hidden`. Efeitos de cena inteira são simulados em px da tela; os locais em px do mapa e desenhados com a transformação da `vista`. Copiar o cuidado de `EfeitosAmbiente.jsx`: 30 quadros/s, pausa com a aba oculta, corta pela metade e depois desliga se o quadro passar de 60 ms repetidamente, `devicePixelRatio` até 2. Sem efeito ou com `densidade` 0 o laço não roda. Jogador (`!verTudo`) não vê efeito local cujo centro está sob a névoa de guerra (`pontoRevelado(nevoa, p)`). O componente também cuida do som: cria o `somAmbiente`, chama `atualizar(volumes × somVolume)` quando algo muda e `parar()` ao desmontar (`somVolume` 0 = mudo).

**`PainelAtmosfera({ atmosfera, onMudar, cenas, grade, colocando, onColocar, onAbrirExtensoes })`** — painel do mestre, na ordem: **Cenas prontas** (`cenas` = `[{ id, nome, pacote, atmosfera }]`, agrupadas por pacote; clicar aplica; botão "Limpar cena"); **Efeitos** (lista: nome, "cena inteira" ou "no mapa", intensidade em `range`, cor, raio se local, mover, remover; "Adicionar": escolhe o tipo → "Na cena inteira" ou "Colocar no mapa" → `onColocar({ oQue: 'efeito', tipo })`); **Luz** (escuridão em `range`, cor, "Colocar luz" → `onColocar({ oQue: 'luz' })`, lista de fontes com raio, cor, trêmula, mover, remover); **Som** (liga/desliga para todos; sons extras); botão **Extensões** (`onAbrirExtensoes`). `colocando` = pedido em andamento (mostra "Clique no mapa…" e "Cancelar" → `onColocar(null)`). Raios mostrados na unidade da grade (`grade.unidade_nome`).

Testes: normalização (lixo, tipo desconhecido, excesso, cor inválida), cada operação, `aplicarCena` mantendo locais e fontes, `colocarNoMapa`, `volumesDaAtmosfera`, teto de partículas, partícula que morre renasce. `somAmbiente.test.js`: com `AudioContext` falso (ver `src/lib/diceSounds.test.js`), volume > 0 cria o laço e volume 0 o para.

## F58 — Luz e aura (executor B)

Arquivos: `src/lib/luzMapa.js` (+ `.test.js`), `src/components/mapa/CamadaLuz.jsx`, `src/components/mapa/CamadaTokens.jsx` (aura + opções no `MenuToken`), fim de `src/theme/motion.css` (tremulação).

- `normalizarLuzToken(raw)`, `normalizarAura(raw)` (regra geral 5; raio 0,5–60).
- `LUZES_TOKEN` = presets do menu: Tocha (6, `#FFB25E`, trêmula), Lanterna (9, `#FFE9B8`), Magia (6, `#7FA6FF`), Brasa (3, `#FF5468`, trêmula).
- `fontesDeLuz({ atmosfera, tokens, grade })` → `[{ id, x, y, raioPx, cor, tremula }]`: fontes fixas + tokens com `luz` (no centro do token) + efeitos **locais** cujo tipo tem `luz: true` (raio = 1,5 × o do efeito, cor do efeito, trêmula).
- **`CamadaLuz({ atmosfera, fontes, largura, altura, translucida, reduzido })`** — `<g pointer-events="none">` para dentro do SVG do mapa: retângulo da cor `luz.cor` com opacidade `escuridao` (× 0,6 se `translucida`, para o mestre enxergar), recortado por uma máscara em que cada fonte é um círculo de gradiente radial (centro totalmente claro, borda suave); por cima, um brilho da cor de cada fonte (gradiente radial, opacidade ~0,18, `mix-blend-mode: screen`). Ids de `<mask>`/gradiente com `useId()`. **A máscara é estática**; a tremulação anima só o brilho (classe CSS com `transform-box: fill-box`), e some com `reduzido`, `[data-movimento="reduzido"]` e `prefers-reduced-motion`. Sem escuridão (≤ 0,02) não desenha nada.
- **Aura** em `CamadaTokens`: círculo sob o token, raio = raio do token + `aura.raio` convertido, gradiente radial da cor para transparente e contorno fino.
- **`MenuToken`**: para quem é gestor ou pode mover o token, linha "Luz" (Sem luz + os 4 presets) e linha "Aura" (sem + 6 cores; − / + no raio, de 1 em 1 quadrado). Grava com o `onAtualizar(id, { luz })` / `{ aura }` que o menu já recebe.

Testes: normalizações, conversão de raio, `fontesDeLuz` juntando as três origens e ignorando efeito de cena inteira.

## F59 — Efeitos de ação (executor C)

Arquivos: `src/lib/vfx.js` (+ `.test.js`), `src/hooks/useVfxMapa.js`, `src/components/mapa/CamadaVfx.jsx`, `src/components/mapa/BarraVfx.jsx`.

- `normalizarEfeitoVfx(raw)` → preset válido ou `null`. `DURACAO_MS` por forma.
- `resolverVfx(evento, { tokens, efeitos, grade })` → `{ efeito, de, para: [pontos], raioPx }` ou `null`. `efeitos` = presets instalados (para `efeitoId`). Sem `de` numa forma que precisa de origem (`projetil`, `raio`): a origem é 3 quadrados acima de cada alvo. Sem `para` válido → `null`.
- `useVfxMapa(mesaId)` → `{ eventos, disparar(evento) }`. **Tópico fixo** `vfx-${mesaId}` (sem sufixo de `useId`, porque páginas diferentes precisam se ouvir) — por isso só pode ser montado **uma vez por página**. `disparar` mostra aqui e envia aos outros. `eventos` = `[{ id, evento, em }]`, cada um sai sozinho depois de 3 s; no máximo 8 ao mesmo tempo (o excedente é ignorado — protege contra enxurrada).
- `enviarVfx(mesaId, evento)` (função solta, para página que não mostra o mapa): `supabase.channel('vfx-'+mesaId).send({ type: 'broadcast', event: 'vfx', payload })` sem assinar (o supabase-js manda por HTTP) e `removeChannel` depois.
- **`CamadaVfx({ ativos, vista, densidade, somAtivo, somVolume })`** — `ativos` = `[{ id, efeito, de, para, raioPx, inicio }]` já resolvidos. Canvas como o da atmosfera; o laço só roda enquanto houver efeito vivo. Quando um efeito aparece, toca `tocarPresetAcao(efeito.som, { ativo: somAtivo, volume: somVolume })` uma vez. Com `densidade` 0 não desenha (o som toca).
- Desenho por forma (cor 1 = principal, cor 2 = rastro/segunda): `projetil` — esfera brilhante da origem ao alvo em 350–500 ms com rastro, e ao chegar um anel + 14 faíscas (350 ms); vários alvos saem com 60 ms de diferença. `explosao` — clarão, anel que cresce até `raioPx` (ou 1,2 quadrado) e 30 faíscas, 600 ms. `raio` — linha quebrada tremida da origem ao alvo, refeita a cada quadro, núcleo branco, 3 lampejos em 280 ms. `cura` — anel que sobe e 16 partículas subindo, 900 ms. `corte` — arco diagonal que varre o alvo em 180 ms com rastro, 300 ms. `onda` — anel que se abre da origem (ou do alvo) até `raioPx` (ou 2 quadrados), 500 ms.
- **`BarraVfx({ efeitos, escolhido, onEscolher })`** — barra flutuante como `BarraNevoa`/`BarraDesenho` (ver `Desenhos.jsx`/`Nevoa.jsx`): um botão por efeito, com um ponto das duas cores; texto de ajuda "Clique no mapa para soltar · arraste para lançar de um ponto a outro".

Testes: normalização, `resolverVfx` (por combatente, por ficha, ponto direto, sem token, origem faltando, teto de alvos, `efeitoId`).

## F60 — Extensões e imagens animadas (executor D)

Arquivos: `src/lib/extensoes.js` (+ `.test.js`), `src/lib/extensoes/catalogo.js`, `src/hooks/useExtensoesMesa.js`, `src/components/mapa/ModalExtensoes.jsx`, `src/lib/imageUtils.js` (+ `.test.js`) e os pontos de envio de imagem que fixam `.jpg`.

- `validarPacote(json)` → `{ ok, pacote, erros }` (regra geral 5 com o vocabulário; recusa `formato`/`versao` errados, `id` fora de `ID_VALIDO`, JSON maior que `LIMITES.bytesPacote`; item inválido é descartado e vira aviso em `erros`; pacote sem nenhuma cena nem efeito válido = `ok: false`).
- `PACOTE_ESSENCIAL` (sempre ativo, não desinstala) e `CATALOGO` em `catalogo.js`.
- `conteudoInstalado(extensoes)` → `{ pacotes, cenas, efeitos }` (essencial + catálogo instalado + importados válidos; cena ganha `pacote` = nome do pacote; id repetido: fica o primeiro).
- `instalar(extensoes, idOuPacote)`, `desinstalar(extensoes, id)`, `exportarPacote(pacote)` (texto JSON).
- `useExtensoesMesa(mesaId)` → `{ extensoes, conteudo, salvar(novaLista), loading, erro }` (lê `mesas.extensoes`; grava por `supabase.rpc('definir_extensoes', { p_mesa_id, p_extensoes })`).
- **`ModalExtensoes({ aberto, onFechar, extensoes, onSalvar })`** — catálogo em cartões (nome, descrição, "N cenas · M efeitos", Instalar/Remover, "Baixar .json"), seção "Importadas" e "Importar arquivo" (`<input type="file" accept="application/json,.json">`; mostra os erros da validação). Texto de ajuda: uma extensão é um arquivo `.json` com cenas e efeitos; "Baixar" serve de modelo para criar a sua.

**Conteúdo** (números afinados pelo executor; ids em minúsculas):
- **Essencial** — cenas: Noite (escuridão 0,55 azul-escura), Chuva (chuva 0,5; escuridão 0,2), Neblina (0,5), Neve (0,5). Efeitos: Fogo (projétil laranja/amarelo, som `projetil`), Gelo (projétil azul-claro/branco, `arcano`), Raio (raio azul-claro/branco, `trovao`), Cura (cura verde/branco, `cura`), Veneno (projétil verde/roxo, `disparo`), Sombra (onda roxo-escuro, `arcano`), Sagrado (explosão dourado/branco, `sino`), Corte (corte branco/vermelho, `lamina`), Impacto (onda cinza/branco, `impacto`), Explosão (explosão laranja/vermelho, `impacto`).
- **Inferno** — Arena de fogo (fogo 0,6, brasas 0,7, escuridão 0,35 `#2A0505`, som fogo); Portões do inferno (fogo 0,8, brasas 0,9, cinzas 0,6, escuridão 0,5 `#1A0000`, sons infernal). Efeitos: Chama infernal (projétil), Coluna de fogo (explosão), Onda de calor (onda).
- **Tempestade** — Tempestade (chuva 0,9, relâmpago 0,6, escuridão 0,45 `#0A1020`, sons vento); Garoa (chuva 0,3, neblina 0,2). Efeitos: Relâmpago em cadeia (raio), Rajada (onda).
- **Cripta** — Corredores (neblina 0,4, escuridão 0,8 preta); Catacumba úmida (neblina 0,6, escuridão 0,7, sons agua). Efeitos: Toque sombrio (onda), Drenar vida (projétil roxo/vermelho).
- **Floresta encantada** — Clareira à noite (vaga-lumes 0,6, neblina 0,25, escuridão 0,5 `#06140C`); Bosque das fadas (vaga-lumes 0,9, runas 0,3). Efeitos: Espinhos (projétil), Bênção da floresta (cura).
- **Nevasca** — Nevasca (neve 0,9, neblina 0,4); Noite gelada (neve 0,4, escuridão 0,5 `#06101E`). Efeitos: Lança de gelo (projétil), Sopro gélido (onda).
- **Deserto** — Tempestade de areia (areia 0,9); Vento do deserto (areia 0,3). Efeitos: Rajada de areia (onda).
- **Profundezas** — Submerso (bolhas 0,6, neblina 0,3 azul, escuridão 0,4 `#021A2E`). Efeitos: Jato d'água (projétil), Bolha (explosão).
- **Torre arcana** — Sala de rituais (runas 0,7, escuridão 0,5 `#0A0A2A`). Efeitos: Míssil arcano (projétil), Círculo de proteção (onda), Explosão arcana (explosão).

**Imagens animadas** (`imageUtils.js`)
- `ehAnimada(bytes, mime)`: GIF = sempre; WebP = tem o bloco `ANIM` nos primeiros bytes; PNG = tem `acTL` antes do `IDAT`.
- `redimensionarImagem`: se a imagem é animada, devolve o arquivo **sem recomprimir** (recomprimir congela no primeiro quadro); acima de 3 MB lança `Imagem animada grande demais (máximo 3 MB).`. O resto fica como está.
- `extensaoDe(file)` → `gif` | `webp` | `png` | `jpg`; trocar o `.jpg` fixo do caminho nos pontos de envio (`useTokensMapa.enviarImagem`, `useMapas.criar`, `useImagens`, e os demais que chamam `redimensionarImagem`) e conferir que o `contentType` enviado é o do arquivo. Conferir em `sql/storage_fichas_imagens.sql` se o bucket limita tipos; se GIF/WebP não passarem, **não mexer no SQL — relatar**.

Testes: `validarPacote` (bom, formato errado, id inválido, grande demais, item ruim descartado, vazio), `conteudoInstalado`, instalar/desinstalar, todo pacote do catálogo passa na própria validação; `ehAnimada` com cabeçalhos montados à mão.

## Integração (executor E, depois dos quatro)

Detalhada na ordem do executor. Resumo: painel "Atmosfera" e ferramenta "Efeito" na `MapaPage`; `CamadaLuz` entre os tokens e a névoa de guerra; `CamadaAtmosfera` e `CamadaVfx` na sobreposição; "Efeitos da cena" e "Som da cena" no menu de camadas (por navegador); seletor "Efeito visual" nas ações de combate; campo "Efeito visual no mapa" na habilidade; teste de aceitação.

## Fora do escopo
Paredes e linha de visão; vídeo como mapa; sprites de terceiros; publicar extensão na Comunidade; arrastar luz/efeito com o mouse (reposiciona com "mover" + clique); volume do som por distância.

---

## Como ficou

**Arquivos por fase**
- F57: `src/lib/atmosfera.js`, `src/audio/somAmbiente.js`, `src/components/mapa/CamadaAtmosfera.jsx`, `PainelAtmosfera.jsx`.
- F58: `src/lib/luzMapa.js`, `src/components/mapa/CamadaLuz.jsx`, `CamadaTokens.jsx` (aura e menu), `src/theme/motion.css`.
- F59: `src/lib/vfx.js`, `src/hooks/useVfxMapa.js`, `src/components/mapa/CamadaVfx.jsx`, `BarraVfx.jsx`.
- F60: `src/lib/extensoes.js`, `src/lib/extensoes/catalogo.js`, `src/hooks/useExtensoesMesa.js`, `src/components/mapa/ModalExtensoes.jsx`, `src/lib/imageUtils.js`.
- Integração: `src/pages/MapaPage.jsx` (painel Atmosfera, ferramenta Efeito, camadas, preferências), `src/components/mapa/PainelMesa.jsx` (interruptores "Efeitos da cena"/"Som da cena", repasse ao combate), `Desenhos.jsx` (item Efeito), `src/components/sessao/AcoesCombate.jsx`, `CombatePanel.jsx`, `src/pages/SessaoPage.jsx` (efeito visual nas ações), `src/components/sistema/RacasClassesEditor.jsx` + `src/hooks/useHabilidades.js` (campo na habilidade), `src/pages/FichaPage.jsx` (dispara ao usar/ativar), `src/lib/fase57.acceptance.test.js`.

**Diferente da spec**
- `colocarNoMapa` ganhou o 4º parâmetro `unidade`; `CamadaAtmosfera` ganhou a prop `grade`; `luzMapa.raioParaPx` é extra.
- `resolverVfx` devolve `para` como `[{ x, y, de }]`.
- `enviarVfx` não pode ser usado na página que monta `useVfxMapa` (derruba o canal do hook): o mapa usa `vfx.disparar`; a sessão e a ficha usam `enviarVfx`.
- Imagem animada passa sem recompressão até 3 MB (inclusive como mapa); PNG/WebP estáticos agora sobem com a extensão certa. "Baixar .json" usa `baixarJson` de `src/lib/baixarArquivo.js`.
- `AcoesCombate` ganhou também a prop `atacante` (combatente da vez) para montar o `de` do efeito.
- Atmosfera: gravação com atraso de 400 ms (uma pendente; descarrega ao trocar de cena e ao sair). O evento da ferramenta Efeito leva o preset inteiro (`efeito`); o de combate e de habilidade leva `efeitoId`.

**Limites conhecidos**
- Efeito de ação sem token alvo (ou sob a névoa, para jogador) não aparece; cada navegador sorteia as partículas.
- Posição dos alvos é lida quando o evento chega ou os tokens mudam durante os 3 s do efeito.
- Efeito de habilidade usado numa ficha sem token na cena aberta não aparece. Habilidade guarda só o id; id de pacote que a mesa não instalou não resolve (nada é desenhado).
- Sem paredes/linha de visão; luz é de ambiente. Vídeo como mapa fica para depois.

### Ajustes da revisão final (vistos no navegador)
- Fogo: a partícula virou mancha macia (gradiente radial somado), no lugar da bolinha de borda dura; e o fogo ganhou um piso de partículas para a fogueira local não ficar rala.
- Neblina: opacidade por mancha subiu de 0,05–0,12 para 0,12–0,30 (a da spec quase não aparecia).
- `enviarVfx` usa `canal.httpSend('vfx', evento)`: o `send()` sem assinar funciona, mas o supabase-js avisa que vai descontinuar.
- `BarraVfx` mostra duas linhas e rola o resto (com várias extensões ela cobria o mapa).
- No celular, "Colocar no mapa"/"Colocar luz"/"Mover" tiram o painel da frente e mostram no mapa o aviso com "Cancelar".
- Concordância em "1 cena · 1 efeito" no modal de extensões.

### Como foi conferido
- 1049 testes, lint sem erro, build.
- Banco: colunas, tetos e a RPC `definir_extensoes` testados em transação desfeita com as três contas (jogador lê a atmosfera, não a muda, põe luz só no próprio token, não instala extensão; mestre faz tudo; estranho e anônimo barrados).
- Navegador: a `MapaPage` real, com sessão e respostas do Supabase simuladas — aplicar cena, colocar fogueira e luz, escuridão na visão do jogador, luz e aura pelo menu do token, ferramenta de efeito (clique e arraste), instalar extensão, celular.
- **Não conferido com contas reais ao mesmo tempo:** o efeito de ação chegando ao navegador de outra pessoa, o efeito saindo do combate e da habilidade na ficha, e o som (o Chrome sem janela não toca áudio).

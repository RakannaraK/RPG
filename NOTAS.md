# NOTAS — Dado & Pena

Leia este arquivo antes de qualquer outro. Atualize ao fim de cada etapa. Limite: ~150 linhas (condensar, não acumular).
Última atualização: 2026-11-13.

## Estado

- Site de fichas de RPG + mesa virtual. React + Vite, JavaScript puro (sem TypeScript), Tailwind v3, Supabase (Postgres, RLS, Realtime, Storage), three + cannon-es (dados 3D), Vitest.
- Publicado: GitHub `RakannaraK/RPG`, deploy no Render a partir do `main`. Último commit de fase no ar: `dc1eecb` (F62), enviado em 2026-11-13.
- Números da última conferência: 1058 testes passando, lint 0 erros (108 avisos antigos), build ok.
- Todos os SQLs de `sql/` até `fase62_extensoes_no_servidor.sql` já foram rodados no Supabase.
- Fases recentes (spec de cada uma em `docs/`, com seção "Como ficou"):
  - F52 redesign completo (componentes em `src/components/ui/`).
  - F53 combate em área · F54 árvore de habilidades com pontos · F55 painel "Continuar" · F56 tema padrão "Tinta e Brasa".
  - F57 atmosfera do mapa (11 efeitos + som ambiente) · F58 luz e aura · F59 efeitos de ação (projétil, explosão…) · F60 extensões da mesa e imagens animadas. Tudo em `docs/FASE57_EFEITOS_DO_MAPA.md`.
  - F61 acabamento dos efeitos: editor de habilidade lista efeitos das extensões instaladas, alças para arrastar efeito e luz no mapa, extensão publicável na Comunidade. Em `docs/FASE61_ACABAMENTO_DOS_EFEITOS.md`.
  - F62 sobras: extensão instalada/removida por RPC no servidor, publicar extensão direto do modal, Escudo e Baú no padrão do redesign, busca global (Ctrl+K). Em `docs/FASE62_SOBRAS.md`.
- Não há fase planejada em aberto: tudo que estava nos roteiros (spec original, paridade com o LICH, concorrência 2026-09, redesign, efeitos do mapa) foi feito. O que resta está em Pendências.

## Decisões (não reabrir sem pedido do usuário)

- Sem TypeScript, sem biblioteca de UI, sem dependência nova para o que poucas linhas resolvem.
- Zero arquivo de imagem ou áudio no repositório (F37): tudo procedural (canvas, SVG, Web Audio).
- Interface em português. Cores só por token (`bg-void`, `border-border`, `text-ink`, `text-ink-dim`, `accent-*`, `harm/ok/warn/temp`). Botão de acento usa `text-sobre-acento`, nunca `text-white`.
- Fonte mínima 12 px; alvo de toque ≥ 24 px; raios `rounded-lg/xl/2xl/full`. Âmbar/cor do dado só para dado e aviso.
- Escrita sensível vai por RPC `SECURITY DEFINER` com checagem explícita de `auth.uid() IS NULL`; `anon` sem EXECUTE.
- Dado não confiável (JSON do banco, arquivo importado, payload de broadcast) sempre passa por `normalizar*` / `validarPacote`.
- SQL versionado em `sql/`, só aditivo. Apagar dado (DROP, DELETE, TRUNCATE) só com ok do usuário. SQL mostrado inteiro no chat.
- Canal Realtime leva sufixo `useId()`; exceção proposital: tópico fixo `vfx-${mesaId}` (páginas diferentes precisam se ouvir).
- Fórmulas: gramática é contrato, parser próprio, nunca `eval`. Ordem dos bônus (F18): base → somas → percentuais aditivos → multiplicar → definir.
- Máximos de pool e slots são derivados da fórmula, nunca gravados. Nível total = soma das classes.
- Ids de `src/lib/efeitosVocabulario.js` entram em JSON gravado: só acrescentar, nunca renomear ou remover.
- Luz do mapa não bloqueia visão (sem paredes nem linha de visão). Máscara estática; só o brilho treme.
- Preferência de movimento reduzido e de partículas é respeitada em todo efeito (`usePreferencias`, `particulasLigadas`).
- Commit e push só quando o usuário pedir.

## Mapa do código (só o central)

- `src/App.jsx` — rotas (páginas carregadas sob demanda).
- `src/pages/` — `DashboardPage`, `MesaPage`, `FichaPage`, `SessaoPage` (sessão ao vivo e combate), `MapaPage` (mesa virtual), `ComunidadePage`, `ConvitePage`, `OverlayPage`, `AuthPage`.
- `src/lib/supabase.js` — cliente. `src/context/` — `AuthContext`, `PreferenciasContext`.
- `src/theme/tokens.css` — temas e tokens de cor. `src/lib/personalizacao.js` — lista de temas. `src/theme/motion.css` — animações.
- `src/components/ui/` — `Botao`, `Modal`, `Icone`, `Abas`, `Toast`, `Confirmar`, `EstadoVazio`… (usar estes, não recriar).
- Motores puros (cada um com `.test.js` ao lado):
  - `modifierEngine.js` — bônus e valores finais da ficha. `formulaEngine.js` — fórmulas. `diceNotation.js` / `rollModifiers.js` — notação e bônus de rolagem.
  - `restEngine.js` descansos · `poolEngine.js` recursos · `progressaoEngine.js` XP e nível · `alvosCombate.js` combate em área.
  - `atmosfera.js` efeitos de cena · `luzMapa.js` luz e aura · `vfx.js` efeitos de ação · `extensoes.js` + `extensoes/catalogo.js` pacotes · `imageUtils.js` upload (animada passa sem recompressão até 3 MB).
- Hooks centrais: `useSessaoFichas` (painel ao vivo), `useEncontro` (combate), `useRolagem`, `useMapas`, `useTokensMapa`, `useVfxMapa` (+ `enviarVfx` para página sem mapa), `useExtensoesMesa`.
- Mapa: `components/mapa/MapaVisor.jsx` (um SVG; `camadas(ctx)` dentro, `sobreposicao(ctx)` por cima), `CapturaMapa` (gestos), `CamadaTokens`, `Nevoa`, `CamadaLuz`, `CamadaAtmosfera`, `CamadaVfx`, `CamadaArea`, `AlcasAtmosfera` (arrastar efeito e luz), `PainelAtmosfera`, `ModalExtensoes`, `BarraVfx`.
- Comunidade: `lib/comunidade.js` (`TIPOS_PUBLICACAO`, `validarPublicacao`), `pages/ComunidadePage.jsx`; extensão vai para a mesa por `instalarNaMesa` (em `hooks/useExtensoesMesa.js`). Instalar e remover extensão é sempre pelas RPCs `instalar_extensao` / `remover_extensao` (travam a linha da mesa); `definir_extensoes` ficou no banco sem uso.
- Busca global: `lib/paleta.js` (itens, filtro, `abrirBusca`) e `components/ui/PaletaComandos.jsx`, montado uma vez no `App.jsx`. Rótulo dos recentes: `rotuloDe` em `lib/recentes.js`.
- Combate: `components/sessao/CombatePanel.jsx`, `AcoesCombate.jsx`, `ModalAplicarResultado.jsx`.
- Editor de sistema: `components/sistema/` (`RacasClassesEditor.jsx` tem o formulário de efeitos e o "Efeito visual no mapa").
- Som: `src/lib/diceSounds.js` (`getAudioContext` compartilhado), `src/audio/actionSynth.js` (13 presets), `src/audio/somAmbiente.js` (7 laços).

## Ferramentas e atalhos

- `npm run dev` · `npm run build` · `npm run lint` · `npm test` (Vitest). CI em `.github/workflows/ci.yml`: lint → build → test.
- SQL direto no Supabase: `psql` com `SUPABASE_DB_URL` de `.env.local`. Nunca imprimir o valor; nunca prefixar com `VITE_`.
- Teste de permissão sem sujar o banco: transação desfeita com `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', …)`.
- Teste de tela sem login real: Chrome headless na porta 9222 + Playwright; sessão falsa no localStorage (`sb-<ref>-auth-token`) e `page.route('**/rest/v1/**')` devolvendo os dados; escritas ficam em `page.__escritas`.
- Capturas de tela só dentro de `../.playwright-mcp/`.
- Contas de teste: `../contas-de-teste.local.md` (fora do repositório; nunca commitar nem colar senha no chat).
- Spec original: `../PROJETO_RPG_FICHA.md`. Concorrência: `docs/ANALISE_CONCORRENCIA_2026-09.md`, `docs/ROADMAP_PARIDADE_LICH.md`. Segurança: `docs/SEGURANCA_AUDITORIA_2026-09.md`.
- Pesquisa já feita: LICH RPG (lichrpg.com.br) cobra R$ 11,90 por jogador; as lacunas que ele expunha (alvo em área, barras afetadas, NPC com responsável, árvore com pontos) viraram F53–F54. Fonte: reel do @lichrpg + site, 2026-11-07.

## Pendências (em ordem)

1. Usuário: testar F57–F60 com contas reais em dois navegadores — atmosfera e som chegando ao jogador, ferramenta Efeito (tecla E), "Efeito visual" no combate, "Efeito visual no mapa" na habilidade.
2. Usuário: teste clicado do combate em área (F53) com login real.
3. Usuário: ligar "Allow anonymous sign-ins" no Supabase (convidado da F47).
4. Painéis do Render/Supabase: CSP, e-mail e captcha (sobras da auditoria de 2026-09).
5. Usuário: testar a F61 com login real — escolher efeito de extensão numa habilidade (Sistema → habilidade → "Efeito visual no mapa"), arrastar alça no mapa, publicar e levar uma extensão pela Comunidade. E a F62: Ctrl+K, aba Escudo, Baú, instalar/remover extensão e "Publicar na Comunidade" no modal.
6. Ideias ainda não pedidas (só fazer com ok): busca global procurar dentro do conteúdo das mesas (verbetes, itens, fichas); refazer os componentes embutidos no Escudo (relógios, rolador, overlay).
7. Registrado como NÃO fazer (só reabrir se o usuário pedir): paredes e linha de visão, voz/vídeo, IA, mesa paga/marketplace, cutscenes, multi-idioma.

## Armadilhas

- Supabase pausa por inatividade: `psql` responde "tenant/user not found" e o DNS some. Solução: "Restore project" no painel.
- Remover linha com Edit cujo trecho começa em `\n` pode grudar duas linhas (quebrou o `App.jsx`). Rodar o build depois de tirar qualquer página de teste temporária.
- `INSERT … RETURNING` não funciona como subconsulta: usar CTE (`WITH x AS (INSERT … RETURNING id) SELECT … FROM x`).
- Função com `RETURNS TABLE(mesa_id, …)` + `ON CONFLICT (mesa_id, …)` dá "column reference is ambiguous".
- Política de `mesas` consultando `membros_mesa` (ou o contrário) entra em recursão: usar as funções `minhas_mesas()` / `sou_gestor()`.
- `canal.send()` sem assinar o canal funciona, mas com aviso de descontinuação: usar `canal.httpSend()`.
- O balde de imagens é `fichas-imagens`. Existe nome parecido (`ficha-imagens`); não apagar nada por semelhança.
- Chrome headless não toca áudio: som só se confere à mão.
- `gh run watch` pode ficar preso depois de o CI terminar; conferir com `gh run view`.
- Agente que morre por limite de uso não grava nada: retomar pelo id com SendMessage, não recriar.
- Rótulo de filtro da Comunidade era `nome + "s"` e gerou "Extensãos": tipo com plural irregular leva plural explícito.
- Tela alterada depois da verificação no navegador precisa ser reconferida (a F61 mudou o formulário de publicar após a revisão).
- Ao apagar função de uma lib, procurar o uso também nos testes de aceitação (`src/lib/fase*.acceptance.test.js`): a F62 quebrou o da F57.
- Prop criada num componente e não repassada por quem o monta passa em lint e testes; só a tela mostra (formulário de publicar da F62).
- `EstadoVazio` é alto (arte + respiro): dentro de cartão pequeno, usar uma linha de texto.
- Efeito de partícula com borda dura parece confete: fogo e neblina usam gradiente radial macio (`CamadaAtmosfera`).

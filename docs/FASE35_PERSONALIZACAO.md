# Fase 35 — Personalização

> 10ª fase do roadmap de paridade com o LICHRPG. Mexe em preferências do usuário (F11), tema (tokens CSS), habilidades do sistema e barras da ficha.

## O que entra
1. **Som de crítico enviado pelo usuário:** um arquivo curto (≤ 15 s, ≤ 1,5 MB) que toca no lugar do som padrão quando sai um crítico. Fica na preferência do usuário (cada um ouve o seu).
2. **Temas e fontes:** paletas prontas (violeta, esmeralda, carmim, âmbar, gelo) e opções de fonte (padrão, serifada, monoespaçada, "leitura fácil" com mais espaço). Escolha do usuário, aplicada no site todo.
3. **Mídia em habilidade:** imagem ou som próprio numa habilidade do sistema — aparece na ficha e toca ao usar.
4. **Barra com escudo:** a barra de vida da ficha e dos cards mostra a vida temporária como um pedaço a mais (mesmo motor do overlay, F34).
5. **Barra de progressão:** projetos, relógios e reservas aparecem como barra, com o quanto falta.

## Banco (`sql/fase35_personalizacao.sql`)
- `habilidades.midia_url TEXT` (imagem ou áudio curto da habilidade).
- Nada mais: tema, fonte e som de crítico vivem em `profiles.preferencias` (JSONB que já existe), e o arquivo vai para o bucket que já existe (`ficha-imagens`, pasta do próprio usuário).

## Sub-fases
- **35.1** — SQL + `lib/personalizacao.js` puro (temas, fontes, limites e validação do áudio) com testes.
- **35.2** — temas e fontes aplicados no site e escolhidos nas preferências.
- **35.3** — som de crítico: enviar, ouvir, remover; toca no feed quando o crítico aparece.
- **35.4** — mídia em habilidade + barra com escudo na ficha/cards + barras de progressão.
- **35.5** — aceitação + docs.

## Restrições
1. Sem o SQL: só a mídia em habilidade fica de fora; o resto funciona. 2. Arquivo grande ou longo é recusado com o motivo (o teto é de tamanho, como decidido no roadmap). 3. Tema e fonte são de quem escolhe — não mudam o que os outros veem. 4. Nenhuma mudança de tema pode deixar texto ilegível: as paletas mexem no acento, não no contraste do texto.

## Como ficou (implementado — 35.1 … 35.5)
- **Arquivos:** `lib/personalizacao.js` (temas, fontes, validação do áudio) + testes e `fase35.acceptance.test.js`, `audio/somProprio.js`, `components/preferencias/Aparencia.jsx`, blocos novos em `theme/tokens.css`; `sql/fase35_personalizacao.sql` (rodado).
- **Temas e fontes:** nas Preferências. O tema vale no site TODO — as telas antigas usavam roxo fixo, então o tema remapeia essas classes para o acento escolhido (só cor, nada de layout). "Leitura fácil" aumenta espaçamento e entrelinha.
- **Som de crítico próprio:** envio com limite de 15 s e 1,5 MB (o navegador mede a duração antes de enviar), com ouvir e remover; toca no lugar do som padrão quando o crítico aparece no feed, no volume dos sons de ação.
- **Mídia em habilidade:** link de imagem ou som no editor do sistema; na ficha, imagem vira miniatura e som ganha botão 🔊, tocando também ao usar a habilidade.
- **Barra com escudo:** a barra de vida da ficha mostra a vida temporária como pedaço azul (mesmo motor do overlay e do escudo do mestre).
- **Barras de progressão:** projetos e relógios da campanha já eram barra; a conta agora é a mesma função pura (`faixasDaBarra`).
- **Limites conhecidos:** o arquivo de som fica no bucket de imagens (pasta do próprio usuário) — sem bucket novo; só um som de crítico por pessoa; o tema não muda as cores semânticas (dano, cura, dados) de propósito.

## Teste de aceitação
Trocar o tema muda o acento do site na hora e continua assim depois de recarregar; a fonte "leitura fácil" aumenta o espaçamento. Enviar um áudio de 3 s e rolar um crítico toca aquele áudio; um arquivo de 30 s é recusado com o motivo. Habilidade com imagem mostra a miniatura na ficha; com áudio, toca ao usar. A barra de vida com 4 de vida temporária mostra o pedaço azul; projetos e relógios aparecem como barra.

# Fase 30 — Ficha privada, acesso por membro, pastas, exportar/importar

> 5ª fase do roadmap de paridade com o LICHRPG. Usa F16 (papéis, `sou_gestor`, `pode_escrever_mesa`), o export/import de SISTEMA (mesmo espírito: arquivo JSON portátil) e F29 (`useMembrosMesa`).

## Objetivo
- **Ficha privada:** o dono esconde a ficha dos outros jogadores. Mestre e co-mestre sempre veem (é a mesa deles).
- **Acesso por membro:** o dono libera pessoas específicas para **ver** (ficha privada) ou **editar** (tudo que o dono edita, menos apagar a ficha e mexer no compartilhamento). Ex.: o mestre deixa um jogador controlar o companheiro NPC.
- **Pastas:** organizar as fichas da mesa ("Heróis", "Vilões", "Aliados"). Sem limite de pastas; pasta nasce ao mover a primeira ficha para ela.
- **Exportar / importar / duplicar ficha:** arquivo `.json` com a ficha inteira (atributos, perícias, classes, habilidades, poderes, itens, maestrias, pools, trilhas, estados, combate, projetos, imagens…). Importar em QUALQUER mesa: as referências ao sistema viajam **por nome** e são casadas com o sistema da mesa de destino; o que não existir lá é listado antes de confirmar.

## Banco (`sql/fase30_fichas_pastas_permissoes.sql` — rodado)
- `fichas`: `privada BOOLEAN`, `leitores UUID[]`, `editores UUID[]`, `pasta TEXT (1–60)`. Padrões mantêm tudo como era.
- Leitura de ficha: membro, e se privada só dono/gestor/leitores/editores. As tabelas filhas herdam (filtram por `ficha_id IN (SELECT id FROM fichas)`).
- `pode_editar_ficha(ficha)`: editor liberado, ainda com escrita na mesa. Uma política `_editor` a mais em cada tabela filha, em combatentes e tokens.
- Gatilho `proteger_permissoes_ficha`: só dono ou gestor mudam dono, mesa, privada, leitores, editores.
- RLS 26/26 no banco real (transação desfeita); suítes anteriores (tokens 18, minigames 20, F29 38) seguem verdes.

## Formato do arquivo
`{ formato: 'rpg-ficha', tipo: 'ficha', versao: 1, sistema: { nome }, ficha: {…, raca, classe}, atributos: [{ atributo: 'Força', valor }], pericias: [{ pericia: 'Furtividade', … }], … }` — nomes no lugar de ids; itens com índice próprio para as maestrias apontarem. Históricos (log de XP, descansos, pontos) não viajam.

## Sub-fases
- **30.1** — SQL + RLS + `podeEditarFicha` em ficha, sessão, combate e mapa; upload de imagem na pasta de quem envia.
- **30.2** — "Acesso e pasta" na ficha (privada, ver/editar por membro, pasta) + lista da mesa agrupada por pasta, 🔒 e mover de pasta.
- **30.3** — `lib/fichaPortatil.js` puro (exportar, planejar importação com avisos) + testes; carregar/gravar; botões Exportar e Duplicar na ficha, Importar na mesa (com prévia).
- **30.4** — aceitação + docs.

## Restrições
1. Nada muda para quem não mexer (ficha pública, sem pasta). 2. Sem limite de pastas, leitores, editores. 3. Importar nunca sobrescreve: sempre cria ficha nova do importador. 4. Falha no meio da importação apaga a ficha criada (nada pela metade).

## Teste de aceitação
Ficha privada some para outro jogador (inclusive itens/atributos) e segue visível ao mestre; leitor vê e não edita; editor edita vida e itens mas não muda privacidade nem toma a ficha; editor rebaixado a espectador perde a edição. Exportar e importar numa mesa com o mesmo sistema reproduz a ficha; numa mesa com sistema diferente, o que não casa por nome é avisado e o resto entra.

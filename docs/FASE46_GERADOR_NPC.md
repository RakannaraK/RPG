# Fase 46 — Gerador de NPC (sem IA)

> Da análise de concorrência de 2026-09: Quest Portal, Braseiro e MasterApp têm. Aqui sem IA
> (decisão registrada): tabelas escritas à mão, sorteio local, zero custo e zero espera.

## Como ficou
- **`lib/geradorNpc.js`** (puro, 4 testes):
  - **nome** em dois estilos: *brasileiro* (Joana Cavalcanti, Severino Rocha) e *fantasia*
    (sílabas + sobrenome: Belanynn Ventoalto);
  - **ofício** (24 ofícios, com a forma feminina e a masculina);
  - **aparência** (20 opções), **personalidade** (16), **jeito de falar** (12), **o que quer**
    (14), **segredo** (12) e **gancho** (12).
  - O sorteio usa semente, com o mesmo gerador dos minigames (F28): a mesma semente dá o mesmo
    NPC, e é isso que torna os testes possíveis.
  - As frases são neutras de gênero de propósito; só o nome e o ofício mudam com o gênero
    sorteado.
- **Na Enciclopédia (F41) → "Gerar NPC"** (só quem gere a mesa):
  - cada linha tem um d20 para sortear **só ela** de novo;
  - "Outro NPC" sorteia tudo de novo, e dá para trocar o estilo do nome;
  - **Salvar na enciclopédia**: vira um verbete NPC **oculto**, com aparência, personalidade
    (mais o jeito de falar) e "o que quer" nos campos do tipo, e a etiqueta `gerado`;
  - **o segredo e o gancho vão para as notas do mestre**, que nunca são reveladas;
  - **Ajustar antes**: abre o formulário da enciclopédia já preenchido.
- Conferido no navegador como mestre:
  - só a linha sorteada mudou;
  - o NPC salvo apareceu "Oculto" na lista, com segredo e gancho em "Só você vê";
  - "Ajustar antes" preencheu nome, tipo, campos, notas e etiqueta;
  - no celular (375 px), o rótulo passa para cima do texto.
- Um detalhe achado no teste: "Fazendeiro que *a curiosidade sempre vence o bom senso*" não
  encaixava no resumo ("<ofício> que …"). A frase virou "deixa a curiosidade vencer o bom senso",
  e um comentário na tabela avisa que toda personalidade precisa completar essa frase.

## Limites conhecidos
- As tabelas são fixas no código. Tabelas próprias por mesa ou sistema dariam uma tela de
  edição a mais; hoje as tabelas aleatórias do sistema continuam no Escudo do mestre.

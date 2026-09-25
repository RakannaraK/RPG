# Análise de concorrência — setembro de 2026

Segunda rodada de concorrência, depois da paridade com o LICHRPG (F26–F36).
Objetivo: achar **o que sites parecidos têm e o Dado & Pena não tem**, e separar
o que vale a pena trazer do que não vale.

## Método

- Busca na web em português e inglês (fichas de sistema próprio, mesa virtual,
  gerenciador de campanha, VTT indie), incluindo **sites pequenos**.
- Leitura da página de cada concorrente, registrando só o que está **escrito lá**
  (funcionalidade, preço, limite). Nada de "provavelmente tem".
- Cada lacuna foi **conferida no nosso código** antes de entrar na lista — na
  análise do Lich aprendemos que é fácil listar como falta algo que já existe.
- Sinal de demanda = quantos concorrentes independentes oferecem a mesma coisa.

## Quem foi analisado

| Site | País | Tipo | Preço / limite do grátis |
|---|---|---|---|
| [HubRPG](https://hubrpg.com/) | BR | fichas de sistema próprio + grid | grátis (sem limites publicados) |
| [Sessão Virtual](https://sessaovirtual.com.br/) | BR | mesa virtual | grátis; só 4 sistemas (D&D 5e, Vampiro 3ª, OSE, TWD) |
| [Mestre RPG](https://mestrerpg.com/) | BR | caderno do mestre | grátis: 1 campanha, 50 páginas, 100 MB |
| [Códice](https://www.codice.app/) | BR | gerenciador de campanha | grátis: 1 mesa; R$ 14,90/mês ilimitado |
| [MesaQuest](https://mesaquest.com.br/) | BR | encontrar mesa (LFG) | mesas pagas por jogador |
| [Road To Valhalla](https://rpg.bigbridge.com.br/) | BR | mesa virtual | grátis: 1 mesa, 3 mapas, 5 jogadores, 100 MB; R$ 9,90 e 14,90 |
| [MasterApp](https://masterapprpg.com/) | BR | app do mestre | planos com limite de monstros (1 / 10 / ilimitado) |
| [RRPG Firecast](http://www.rrpg.com.br/) | BR | programa Windows | — |
| [Samwise](https://apps.apple.com/br/app/samwise-rpg-assistant/id1663948907) | — | app iOS/Mac, sistema próprio | R$ 24,90/mês na edição completa |
| [Let's Role](https://lets-role.com/) | FR | fichas + mesa + criador de sistema | grátis + "Play Pass" |
| [Character Sheet Online](https://charactersheetonline.com/) | — | criador de ficha arrastar-e-soltar | — |
| [Quest Portal](https://www.questportal.com/character-sheets) | EUA | fichas + IA | grátis + premium |
| [Tableplop](https://new.tableplop.com/) | — | mesa virtual | grátis, sem anúncio, sem limite de cena |
| [Alchemy RPG](https://alchemyrpg.com/) | EUA | mesa narrativa | grátis ilimitado + marketplace |
| [Kanka](https://kanka.io/) | DE | wiki de campanha | grátis ilimitado; premium US$ 4–21/mês |
| Braseiro, Owlbear Rodeo, PlanarAlly, FreeVTT | — | vistos por alto | — |

## O que eles têm e nós NÃO temos

Conferido no nosso `src/` em 2026-09-24 (busca por palavra inteira, sem ruído
de `valores`/`request`).

| Lacuna | Quem tem | Sinal |
|---|---|---|
| **Enciclopédia da campanha**: NPCs, locais, facções, divindades, lore como fichas de mundo; `@menção` vira link; tags; busca global; relações | Mestre RPG, Códice, Kanka, World Anvil, HubRPG | **5** |
| **Macros de rolagem na ficha**: o jogador salva "Bola de Fogo = 8d6+mod(int)" e rola num clique | HubRPG, Road To Valhalla, Quest Portal, Let's Role, Tableplop | **5** |
| **Trilha sonora sincronizada** para a mesa inteira + **mesa de efeitos sonoros** | Let's Role, Alchemy, Firecast, MasterApp ("O Bardo"), Character Sheet Online | **5** |
| **Revelação granular**: mostrar campo a campo, a jogador específico, e ver "quem sabe o quê"; **handouts** entregues a quem o mestre escolher | Códice, HubRPG, Road To Valhalla, Let's Role | **4** |
| **Agenda da mesa no mundo real**: próxima sessão, recorrência semanal/quinzenal, contagem regressiva, confirmação | MesaQuest, QG do Mestre, Códice (sessões) | **3** |
| **Ficha impressa** (A4, com QR code que abre a versão online) e **exportar a campanha** inteira | Character Sheet Online, Mestre RPG (PDF/Markdown), Kanka ("sem prisão") | **3** |
| **Gerador de NPC** (nome, aparência, personalidade, gancho) | Quest Portal, Braseiro, MasterApp | **3** |
| **Jogador entra sem criar conta**, só pelo link | Sessão Virtual, Character Sheet Online, Help RPG | **3** |
| **App instalável / mobile** | Let's Role (Android), Samwise (iOS/Mac), Tableplop | **3** |
| **Ferramentas de segurança**: X-Card, linhas e véus, combinados da mesa | Let's Role, Alchemy | **2** |
| **Iluminação dinâmica**, paredes, visão por token, dia/noite | Road To Valhalla, Let's Role, PlanarAlly, Firecast | 4 |
| **Voz e vídeo** embutidos | Alchemy, Firecast | 2 |
| **Assistente de IA** | Quest Portal, Braseiro, MasterApp (anunciado) | 3 |
| **Encontrar mesa** (LFG), perfis e avaliação de mestre, **mesa paga** | MesaQuest, Samwise | 2 |
| **Mapa-mundi com pinos** ligados à enciclopédia | Mestre RPG | 1 |
| **Baú do grupo** / transferir item entre personagens, lojas de NPC | Road To Valhalla | 1 |
| **Bestiário pronto** (300 inimigos) | MasterApp | 1 |
| **Cutscenes**, fundos animados | Road To Valhalla, Alchemy | 2 |
| Vários idiomas | Let's Role, Alchemy | 2 |

## O que nós temos e eles não

Vale registrar, porque define onde **não** precisamos correr atrás:

- **Motor de regras sem código.** Quase todos são presos a sistemas prontos
  (Sessão Virtual: 4 sistemas; Mestre RPG e MasterApp: templates) ou oferecem
  ficha livre sem motor (HubRPG, Códice, Character Sheet Online). O Let's Role
  cria sistema, mas exige **JavaScript**. Aqui: fórmulas, modificadores com ordem
  de operações, raças/classes/multiclasse, XP, modos de resolução — sem código.
- **Sem limite de quantidade.** Road To Valhalla: 1 mesa, 3 mapas, 5 jogadores no
  grátis. Mestre RPG: 1 campanha e 50 páginas. Códice: 1 mesa. Kanka e MasterApp
  cobram por volume. Aqui só arquivo tem teto de tamanho.
- Sessão ao vivo com presença e histórico, overlay para OBS, minigames,
  transformações, árvore de habilidades, dados 3D na tela de todos, relógios,
  tabelas aleatórias, comunidade com vitrine pública.

## Vale a pena?

Critérios: quantos concorrentes têm (demanda), se casa com a proposta (sistema
próprio + jogo ao vivo + campanha), custo, e se cabe na hospedagem grátis
(Supabase 1 GB, Render grátis).

### Sim — proposta de fases

| Fase | Conteúdo | Sinal | Tamanho | Por quê |
|---|---|---|---|---|
| **F39** | **Macros de rolagem na ficha** | 5 | pequena | O motor de fórmulas (F17) já faz a conta; macro é só uma notação com nome, salva na ficha. Ganho em toda sessão, para todo jogador. |
| **F40** | **Agenda da mesa**: próxima sessão, recorrência, "vou / não vou / talvez", contagem regressiva no painel, aviso no sininho | 3 | pequena/média | Marcar data é a maior dor de grupo de RPG. O calendário que temos é o do **mundo do jogo**, não o da vida real. |
| **F41** | **Enciclopédia da campanha**: NPCs, locais, facções, divindades, itens, lore; `@menção` vira link; tags; busca global; relações entre verbetes | 5 | grande | É o que os gerenciadores de campanha vendem como produto principal, e não temos nada disso. As notas de hoje são texto solto. |
| **F42** | **Revelação granular + handouts**: revelar campo a campo para jogadores escolhidos; "quem sabe o quê"; handout entregue a quem o mestre marcar | 4 | média | Depende da F41. É o diferencial do Códice, e o problema é real: mestre não quer mostrar o segredo do NPC junto com o nome. |
| **F43** | **Trilha sonora e ambiente**: tocador sincronizado por link do YouTube + mesa de efeitos sonoros | 5 | média | Link de YouTube não gasta armazenamento. Os efeitos saem do motor de som sintetizado que já existe (F11/FV.4). |
| **F44** | **Ferramentas de segurança**: X-Card anônimo na sessão, linhas e véus, combinados da mesa | 2 | pequena | Poucos têm, mas o custo é quase zero e é prática consolidada na comunidade. Nenhum concorrente brasileiro tem. |
| **F45** | **Ficha para imprimir** (A4 com QR code) + **exportar a mesa inteira** | 3 | pequena | CSS de impressão resolve a ficha. Exportar a mesa completa tira o medo de ficar preso. |
| **F46** | **Gerador de NPC sem IA** | 3 | pequena | Tabelas de nome (brasileiros e de fantasia), aparência, personalidade e gancho, reaproveitando as tabelas aleatórias. Salva direto na enciclopédia. |
| **F47** | **Jogador convidado sem conta** + **app instalável (PWA)** | 3 + 3 | média | Tira a maior fricção de entrada. O Supabase tem login anônimo; precisa de revisão de segurança das políticas antes (ver `seguranca-funcoes-null-auth`). O PWA é um manifest + ícone. |

### Talvez depois

- **Mapa-mundi com pinos** ligados à enciclopédia — natural depois da F41.
- **Baú do grupo** e transferir item entre personagens.
- **Bestiário SRD 5e pronto** — a licença (CC-BY 4.0) permite, com atribuição; precisa de tradução e só serve a quem joga D&D.
- **"Mesas abertas"** na comunidade: uma vitrine leve de mesas procurando jogador, **sem pagamento**.

### Não recomendo (registrado para não voltar à discussão)

| Coisa | Por quê |
|---|---|
| Iluminação dinâmica, paredes, visão por token | Muito grande e útil só para combate tático em grade; a névoa de guerra cobre o uso comum. |
| Voz e vídeo | Exige servidor de mídia; a hospedagem grátis não aguenta e todo grupo já usa Discord. |
| Assistente de IA | Custa por uso e exige chave de API paga. Só se o dono decidir bancar. |
| Mesa paga, marketplace, loja | Pagamento está fora do escopo por decisão do dono. |
| Cutscenes e fundos animados | Nicho, e pesado para o armazenamento grátis. |
| Vários idiomas | O público é brasileiro. |

## Fontes

- https://hubrpg.com/
- https://sessaovirtual.com.br/
- https://mestrerpg.com/
- https://www.codice.app/
- https://mesaquest.com.br/
- https://rpg.bigbridge.com.br/
- https://masterapprpg.com/
- http://www.rrpg.com.br/
- https://apps.apple.com/br/app/samwise-rpg-assistant/id1663948907
- https://lets-role.com/
- https://charactersheetonline.com/
- https://www.questportal.com/character-sheets
- https://new.tableplop.com/
- https://alchemyrpg.com/
- https://kanka.io/
- https://www.helprpg.com.br/2017/09/cadastrar-fichas-de-rpg-online.html
- https://github.com/madeiragab/braseiro
- https://alternativeto.net/software/roll20/?license=free

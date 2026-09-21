# Roadmap — paridade com o LICHRPG (F26–F36)

Objetivo: ter tudo o que o lichrpg.com.br oferece, **sem as limitações dele**,
sem perder nada do que já existe (retrocompatibilidade total, como em F1–F25).

## Decisões do usuário (2026-09-16)

1. **Ordem:** mapa e dados 3D primeiro, depois minigames, depois o resto.
2. **Limites:** nenhum limite de QUANTIDADE (personagens, mesas, combatentes,
   barras, ultimates, tokens, cenas…). Só arquivos têm teto de TAMANHO, para
   não estourar o armazenamento grátis do Supabase (1 GB):
   imagens comprimidas no navegador; áudio curto (≤ 15 s).

## Limites do LICHRPG que NÃO copiamos

| Lich | Aqui |
|---|---|
| 60 personagens / 30 campanhas | ilimitado |
| 12 combatentes, 6 ativos | ilimitado |
| 5–8 barras, 2 ultimates | ilimitado |
| 3 métodos de rolagem fixos | motor F23 (soma, sucessos, roll-under, faixas…) |
| cadastro exige chave paga | cadastro livre |

## Fases

| Fase | Conteúdo | Tamanho |
|---|---|---|
| **F26** ✅ | **Mesa virtual (mapa):** cenas, grade, tokens ao vivo, névoa de guerra, desenho, régua, ping, camadas, painel de mesa | muito grande |
| **F27** ✅ | **Dados 3D na mesa:** dados com física rolando na tela de TODOS, skins, som, integrado ao feed | média |
| **F28** ✅ | **Minigames de teste:** Roda Rúnica, cronômetro, memória; configuráveis como forma de teste; resultado no feed; ranking | média |
| **F29** ✅ | **Chat da mesa** (sussurro, `/r`), **notas** privadas/compartilhadas, **calendário do mundo** | pequena |
| **F30** ✅ | **Exportar/importar/duplicar ficha**, **pastas**, **ficha privada + acesso por membro** | pequena/média |
| **F31** ✅ | **Bestiário:** criaturas com ficha completa, arte, som, ameaça, invocar no combate e no mapa, boss | grande |
| **F32** ✅ | **Combate avançado:** recarga em turnos, ultimates, dano/cura contínuos, reserva e troca, contra-ataque rolado, habilidade vs habilidade | média |
| **F33** ✅ | **Transformações** (forma alternativa) + **árvore de habilidades visual** | grande |
| **F34** ✅ | **Escudo do mestre** + **overlay para OBS** (link secreto) | pequena/média |
| **F35** ✅ | **Personalização:** som de crítico enviado, temas/fontes, mídia em habilidade, barra com escudo, barra de progressão | média |
| F36 | Comunidade: galeria de artes, compartilhar fichas/criaturas/sistemas, moderação, página pública com demo sem conta | grande |

Cada fase ganha sua spec em `docs/FASExx_*.md` antes de ser implementada,
e é feita em sub-fases com build + testes verdes a cada uma.

Fora do plano até o usuário pedir: doações/planos pagos (o Lich tem PIX e
tags de doador).

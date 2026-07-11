-- ============================================================================
-- Fase 22.6 — Defesa ativa: fluxo assíncrono no combate
-- ============================================================================
-- A defesa ativa NÃO cria tabela nova: usa os canais já existentes do encontro/
-- combatentes (F14). O pedido de defesa e a resposta do defensor viajam numa
-- coluna JSONB do próprio combatente-alvo, propagada pelo Realtime de
-- `combatentes` (já publicado desde a F14).
--
-- Forma de combatentes.defesa_pendente:
--   {
--     "ataque": 71,                     -- acerto do atacante (o mestre digita)
--     "dano": 20,                       -- dano final (F18/crítico) a aplicar
--     "atacante_combatente_id": "<id>", -- p/ a condição do contra-ataque
--     "atacante_nome": "Goblin",
--     "solicitado_em": "2026-07-11T...",
--     "resposta": null | {
--       "opcao_id": "desviar" | "nao_reagir",
--       "opcao_nome": "Desviar",
--       "contra_ataque": false,
--       "defesa_total": 78,             -- null se "não reagir"
--       "respondido_em": "2026-07-11T..."
--     }
--   }
--
-- Quem escreve o quê (respeita a RLS já existente de `combatentes`):
--   • Mestre  → cria o pedido (defesa_pendente) e RESOLVE (aplica HP/condição/limpa).
--   • Defensor (dono do alvo) → grava só a `resposta` no PRÓPRIO combatente
--     (mesma permissão de definir a própria iniciativa na F14.2).
--   • Alvo sem dono (inimigo) → o mestre responde e resolve (é o "mestre p/ inimigos").
-- Nenhuma política nova é necessária.
-- ============================================================================

ALTER TABLE combatentes ADD COLUMN IF NOT EXISTS defesa_pendente JSONB;

-- `combatentes` já está na publicação supabase_realtime (F14). Reforço idempotente:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'combatentes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE combatentes;
  END IF;
END $$;

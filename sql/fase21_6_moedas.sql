-- ============================================================================
-- Fase 21.6 — Moedas / carteira
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- As denominações (nome, sigla, valor) vivem em config_layout.moedas — sem SQL.
-- Aqui só a carteira na ficha.
-- Retrocompatível: sistema sem moedas → painel nem aparece; carteira vazia.
-- ============================================================================

-- carteira: { "<denom_id>": quantidade }  ex: { "po": 14930, "pc": 0 }
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS carteira JSONB DEFAULT '{}'::jsonb;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- SELECT id, nome_personagem, carteira FROM fichas LIMIT 10;

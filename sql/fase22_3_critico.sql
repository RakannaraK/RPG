-- ============================================================================
-- Fase 22.3 — Crítico configurável (override por categoria)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- A config do sistema vive em config_layout.critico — sem SQL. Aqui só o
-- override de multiplicador por categoria de arma.
-- Retrocompatível: sem crítico configurado, nada muda.
-- ============================================================================

-- { "multiplicador": 3 }  — machados críticos ×3, sobrescreve o padrão do sistema.
ALTER TABLE categorias_item ADD COLUMN IF NOT EXISTS critico_config JSONB;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- SELECT nome, critico_config FROM categorias_item WHERE critico_config IS NOT NULL;

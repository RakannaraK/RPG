-- ============================================================================
-- Fase 12 — colunas que ficaram sem rodar (achadas na conferência de 2026-09-16)
-- ----------------------------------------------------------------------------
-- Idempotente. Só ACRESCENTA colunas; nada existente muda.
--   12.4 — vida temporária pontual (botão na ficha, descanso, dano na sessão)
--   12.2 — escopo de acerto/dano por categoria de arma. Sem ela, CRIAR QUALQUER
--          EFEITO falha: addModificador sempre envia a coluna.
-- ============================================================================

ALTER TABLE fichas ADD COLUMN IF NOT EXISTS vida_temp_atual INTEGER DEFAULT 0;
ALTER TABLE modificadores ADD COLUMN IF NOT EXISTS escopo_categoria TEXT;

-- Faz a API do Supabase enxergar as colunas novas na hora.
NOTIFY pgrst, 'reload schema';

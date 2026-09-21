-- ============================================================================
-- Fase 35 — Personalização: mídia na habilidade
-- ----------------------------------------------------------------------------
-- Idempotente. Uma coluna nova, nada apagado. Tema, fonte e som de crítico
-- ficam em profiles.preferencias (JSONB que já existe) e o arquivo vai para o
-- bucket `ficha-imagens`, na pasta do próprio usuário (política já existente).
-- ============================================================================

ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS midia_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_midia_tamanho') THEN
    ALTER TABLE habilidades ADD CONSTRAINT habilidades_midia_tamanho
      CHECK (midia_url IS NULL OR char_length(midia_url) <= 500);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT count(*) FROM habilidades WHERE midia_url IS NOT NULL;

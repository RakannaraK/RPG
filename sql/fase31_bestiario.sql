-- ============================================================================
-- Fase 31 — Bestiário: a criatura é uma FICHA marcada como criatura
-- ----------------------------------------------------------------------------
-- Idempotente. Só ACRESCENTA colunas com padrão que mantém tudo como está
-- (toda ficha existente continua 'personagem'). Nenhuma política muda: criatura
-- é ficha e já segue as regras da Fase 30.
-- ============================================================================

ALTER TABLE fichas ADD COLUMN IF NOT EXISTS tipo_ficha TEXT NOT NULL DEFAULT 'personagem';
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS ameaca     TEXT;   -- livre: "Fácil", "ND 5", "Mortal"…
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS especie    TEXT;   -- livre: "Fera", "Morto-vivo"…
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS som_preset TEXT;   -- som ao invocar
-- Cópia em jogo ("ficha própria" do boss) aponta para a criatura do bestiário
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS origem_id  UUID REFERENCES fichas(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichas_tipo_ficha_valido') THEN
    ALTER TABLE fichas ADD CONSTRAINT fichas_tipo_ficha_valido CHECK (tipo_ficha IN ('personagem', 'criatura'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichas_rotulos_tamanho') THEN
    ALTER TABLE fichas ADD CONSTRAINT fichas_rotulos_tamanho CHECK (
      (ameaca IS NULL OR char_length(ameaca) <= 40)
      AND (especie IS NULL OR char_length(especie) <= 60)
      AND (som_preset IS NULL OR char_length(som_preset) <= 40)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fichas_bestiario ON fichas (mesa_id, tipo_ficha);

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT tipo_ficha, count(*) FROM fichas GROUP BY 1;

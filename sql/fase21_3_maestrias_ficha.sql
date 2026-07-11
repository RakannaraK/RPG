-- ============================================================================
-- Fase 21.3 — Maestria da ficha (XP por categoria ou por item)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- `nivel` é CACHE derivado do xp + curva (masteryEngine) — recalculado a cada
-- ganho, nunca editado direto. Exatamente um de (categoria_id, item_id) conforme
-- o escopo do sistema (config_layout.maestria.escopo).
-- Retrocompatível: sistema sem maestria = nenhuma linha, nada aparece.
-- ============================================================================

CREATE TABLE IF NOT EXISTS maestrias_ficha (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id     UUID REFERENCES fichas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias_item(id) ON DELETE CASCADE,
  item_id      UUID REFERENCES itens_ficha(id) ON DELETE CASCADE,
  xp           INTEGER NOT NULL DEFAULT 0,
  nivel        INTEGER NOT NULL DEFAULT 0,   -- cache derivado da curva
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ficha_id, categoria_id),
  UNIQUE (ficha_id, item_id)
);

CREATE INDEX IF NOT EXISTS maestrias_ficha_ficha_idx ON maestrias_ficha (ficha_id);

ALTER TABLE maestrias_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON maestrias_ficha TO authenticated;

-- Dono da ficha: CRUD
DROP POLICY IF EXISTS "maestrias_dono" ON maestrias_ficha;
CREATE POLICY "maestrias_dono"
  ON maestrias_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: só leitura (piggyback na RLS de `fichas`)
DROP POLICY IF EXISTS "maestrias_membros" ON maestrias_ficha;
CREATE POLICY "maestrias_membros"
  ON maestrias_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── Realtime (opcional): painel de sessão refletindo o XP ao vivo ──────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'maestrias_ficha'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE maestrias_ficha;
  END IF;
END
$$;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- (a) a tabela existe e está vazia:
--     SELECT COUNT(*) FROM maestrias_ficha;
--
-- (b) maestrias de uma ficha:
--     SELECT categoria_id, item_id, xp, nivel FROM maestrias_ficha WHERE ficha_id = '<ficha_id>';

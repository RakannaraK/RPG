-- ============================================================================
-- Fase 20.3 — Slots (MODO OPCIONAL por sistema)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
--
-- Slot = pool indexado por círculo. O TOTAL por círculo é DERIVADO da grade
-- (config_layout.slots.grades, digitada pelo mestre) × níveis das classes da
-- ficha. `usados` é o ÚNICO estado armazenado — o total nunca é duplicado aqui.
--
-- A configuração (ativo, rótulo, círculo máximo, preparação, CD, grades e
-- recuperação) vive no JSONB `sistemas.config_layout` — sem SQL.
-- Retrocompatível: sistema com slots desativados não mostra painel nenhum.
-- ============================================================================

CREATE TABLE IF NOT EXISTS slots_ficha (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  circulo  INTEGER NOT NULL CHECK (circulo >= 1),
  usados   INTEGER NOT NULL DEFAULT 0 CHECK (usados >= 0),
  UNIQUE (ficha_id, circulo)
);

ALTER TABLE slots_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON slots_ficha TO authenticated;

-- Dono da ficha: CRUD
DROP POLICY IF EXISTS "slots_ficha_dono" ON slots_ficha;
CREATE POLICY "slots_ficha_dono"
  ON slots_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: só leitura (piggyback na RLS de `fichas`)
DROP POLICY IF EXISTS "slots_ficha_membros" ON slots_ficha;
CREATE POLICY "slots_ficha_membros"
  ON slots_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── Realtime: o painel de sessão reflete os gastos ao vivo ─────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'slots_ficha'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE slots_ficha;
  END IF;
END
$$;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- (a) a tabela existe e está vazia:
--     SELECT COUNT(*) FROM slots_ficha;
--
-- (b) slots_ficha está no Realtime:
--     SELECT tablename FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename = 'slots_ficha';
--
-- (c) depois de configurar a grade e gastar, ver o estado de uma ficha:
--     SELECT circulo, usados FROM slots_ficha WHERE ficha_id = '<ficha_id>' ORDER BY circulo;

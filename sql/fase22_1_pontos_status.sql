-- ============================================================================
-- Fase 22.1 — Distribuição de pontos de status
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- A config do sistema vive em config_layout.pontos_status — sem SQL. Aqui:
-- override por raça, o pool da ficha e o log íntegro de ganhos/gastos.
-- Retrocompatível: sistema sem pontos = fluxo de atributos normal (F3).
-- ============================================================================

-- ─── 1) Override por raça (opcional) ────────────────────────────────────────
-- { "inicial":"16", "ganho_por_nivel":"1d6 + 10" } — sobrescreve o padrão.
ALTER TABLE racas ADD COLUMN IF NOT EXISTS pontos_config JSONB;

-- ─── 2) Pool de pontos da ficha ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pontos_status_ficha (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id    UUID REFERENCES fichas(id) ON DELETE CASCADE,
  disponiveis INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ficha_id)
);

ALTER TABLE pontos_status_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON pontos_status_ficha TO authenticated;

DROP POLICY IF EXISTS "pontos_dono" ON pontos_status_ficha;
CREATE POLICY "pontos_dono" ON pontos_status_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
DROP POLICY IF EXISTS "pontos_membros" ON pontos_status_ficha;
CREATE POLICY "pontos_membros" ON pontos_status_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── 3) Histórico íntegro (ganhos + / gastos −) ─────────────────────────────
CREATE TABLE IF NOT EXISTS pontos_status_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id   UUID REFERENCES fichas(id) ON DELETE CASCADE,
  tipo       TEXT CHECK (tipo IN ('ganho_inicial','ganho_nivel','gasto','ajuste')) NOT NULL,
  quantidade INTEGER NOT NULL,          -- + ganho / − gasto
  detalhe    JSONB,                     -- {"rolagem":"1d6+10","resultado":14,"nivel":7} ou {"atributo_id","de","para"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pontos_status_log_ficha_idx ON pontos_status_log (ficha_id, created_at);

ALTER TABLE pontos_status_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON pontos_status_log TO authenticated;

DROP POLICY IF EXISTS "pontos_log_dono" ON pontos_status_log;
CREATE POLICY "pontos_log_dono" ON pontos_status_log FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
DROP POLICY IF EXISTS "pontos_log_membros" ON pontos_status_log;
CREATE POLICY "pontos_log_membros" ON pontos_status_log FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- SELECT COUNT(*) FROM pontos_status_ficha;
-- SELECT tipo, quantidade, detalhe FROM pontos_status_log WHERE ficha_id = '<id>' ORDER BY created_at;

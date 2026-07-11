-- ============================================================================
-- Fase 21.4 — Propriedades de item desbloqueáveis por maestria
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Propriedade = regra que "liga" na arma ao atingir um nível de maestria.
-- categoria_id NULL = propriedade geral (qualquer categoria).
-- modificador_config (opcional) = efeito mecânico ao usar o item (estrutura de
-- modificador, F12) — aplicado só quando a propriedade está desbloqueada.
-- Retrocompatível: sem propriedades cadastradas, nada muda.
-- ============================================================================

CREATE TABLE IF NOT EXISTS propriedades_item (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id         UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  categoria_id       UUID REFERENCES categorias_item(id) ON DELETE CASCADE,  -- NULL = geral
  nome               TEXT NOT NULL,          -- "Crítico", "Dupla", "Disparo"
  sigla              TEXT,                   -- "Crt", "Dp", "Ds"
  descricao          TEXT NOT NULL,          -- a regra que o mestre escreve
  maestria_minima    INTEGER NOT NULL DEFAULT 0,
  modificador_config JSONB,                  -- efeito mecânico opcional (F12)
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS propriedades_item_sistema_idx ON propriedades_item (sistema_id);

ALTER TABLE propriedades_item ENABLE ROW LEVEL SECURITY;
GRANT ALL ON propriedades_item TO authenticated;

-- Leitura: quem enxerga o sistema (piggyback na RLS de `sistemas`)
DROP POLICY IF EXISTS "props_select" ON propriedades_item;
CREATE POLICY "props_select"
  ON propriedades_item FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));

-- Escrita: mestre E co-mestre — helper da Fase 19.6.
DROP POLICY IF EXISTS "props_mestre" ON propriedades_item;
CREATE POLICY "props_mestre"
  ON propriedades_item FOR ALL
  USING (sou_gestor_do_sistema(sistema_id));

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- (a) tabela existe e está vazia:
--     SELECT COUNT(*) FROM propriedades_item;
--
-- (b) propriedades de um sistema:
--     SELECT nome, sigla, maestria_minima, categoria_id FROM propriedades_item
--     WHERE sistema_id = '<sistema_id>' ORDER BY maestria_minima, nome;

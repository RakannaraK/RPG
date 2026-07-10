-- ============================================================================
-- Fase 20.4 — Poderes na ficha (conhecido / preparado)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
--
-- `preparado` só importa em sistemas com preparação ligada
-- (config_layout.slots.preparacao). Nos demais, todo poder conhecido está pronto.
-- `origem` espelha o fluxo da F10.4: 'manual' | 'classe' | 'raca'.
-- Retrocompatível: sem poderes cadastrados, o painel nem aparece.
-- ============================================================================

CREATE TABLE IF NOT EXISTS poderes_ficha (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id   UUID REFERENCES fichas(id)   ON DELETE CASCADE,
  poder_id   UUID REFERENCES poderes(id)  ON DELETE CASCADE,
  conhecido  BOOLEAN DEFAULT TRUE,
  preparado  BOOLEAN DEFAULT TRUE,
  origem     TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ficha_id, poder_id)
);

CREATE INDEX IF NOT EXISTS poderes_ficha_ficha_idx ON poderes_ficha (ficha_id);

ALTER TABLE poderes_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON poderes_ficha TO authenticated;

-- Dono da ficha: CRUD (é ele quem aprende e prepara)
DROP POLICY IF EXISTS "poderes_ficha_dono" ON poderes_ficha;
CREATE POLICY "poderes_ficha_dono"
  ON poderes_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: só leitura (piggyback na RLS de `fichas`)
DROP POLICY IF EXISTS "poderes_ficha_membros" ON poderes_ficha;
CREATE POLICY "poderes_ficha_membros"
  ON poderes_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- (a) a tabela existe e está vazia:
--     SELECT COUNT(*) FROM poderes_ficha;
--
-- (b) poderes de uma ficha, com o nome do catálogo:
--     SELECT p.nome, p.circulo, pf.conhecido, pf.preparado, pf.origem
--     FROM poderes_ficha pf
--     JOIN poderes p ON p.id = pf.poder_id
--     WHERE pf.ficha_id = '<ficha_id>'
--     ORDER BY p.circulo NULLS FIRST, p.nome;

-- ============================================================================
-- Fase 21.1 — Config de maestria + categorias de item
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- A config de maestria (ativo, escopo, curva, bônus, ganhos) vive no JSONB
-- config_layout.maestria — sem SQL. Aqui só a tabela de categorias e a coluna
-- categoria_id nos itens da ficha.
-- Retrocompatível: sistema sem categorias / sem maestria = idêntico a antes.
-- ============================================================================

-- ─── 1) Categorias de arma/item (definição no sistema) ──────────────────────
CREATE TABLE IF NOT EXISTS categorias_item (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,            -- "Machados", "Espadas Longas", "Arcos"
  descricao  TEXT,
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS categorias_item_sistema_idx ON categorias_item (sistema_id);

ALTER TABLE categorias_item ENABLE ROW LEVEL SECURITY;
GRANT ALL ON categorias_item TO authenticated;

-- Leitura: quem enxerga o sistema (piggyback na RLS de `sistemas`)
DROP POLICY IF EXISTS "categorias_select" ON categorias_item;
CREATE POLICY "categorias_select"
  ON categorias_item FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));

-- Escrita: mestre E co-mestre — reaproveita o helper da Fase 19.6.
DROP POLICY IF EXISTS "categorias_mestre" ON categorias_item;
CREATE POLICY "categorias_mestre"
  ON categorias_item FOR ALL
  USING (sou_gestor_do_sistema(sistema_id));

-- ─── 2) Itens da ficha apontam para a categoria (maestria por categoria) ────
ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS categoria_id UUID
  REFERENCES categorias_item(id) ON DELETE SET NULL;

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
-- (a) tabela existe e está vazia:
--     SELECT COUNT(*) FROM categorias_item;
--
-- (b) a coluna foi criada e está NULL em tudo que já existia:
--     SELECT COUNT(*) AS total, COUNT(categoria_id) AS com_categoria FROM itens_ficha;
--
-- (c) categorias de um sistema:
--     SELECT nome, descricao FROM categorias_item WHERE sistema_id = '<sistema_id>' ORDER BY ordem, nome;

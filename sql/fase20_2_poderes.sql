-- ============================================================================
-- Fase 20.2 — Catálogo de poderes (CRUD do mestre)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Genérico: "Magia", "Técnica", "Oração" — a categoria é um rótulo livre.
-- Nenhuma lista de poderes vem embutida; o mestre digita os dele.
-- Retrocompatível: sistema sem poderes → nenhum painel aparece.
--
-- Só a tabela do CATÁLOGO. `poderes_ficha` (conhecido/preparado) vem na 20.4,
-- e `slots_ficha` na 20.3.
-- ============================================================================

CREATE TABLE IF NOT EXISTS poderes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id     UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  categoria      TEXT,                 -- rótulo livre: "Magia", "Técnica", "Oração"
  circulo        INTEGER,              -- NULL = poder sem círculo

  -- custo: lista de débitos ao usar. `quantidade` é texto e aceita fórmula (F17).
  -- [{ "tipo":"pool", "pool_id":"…", "quantidade":"3" },
  --  { "tipo":"pool", "pool_id":"…", "quantidade":"piso(nivel / 2)" },
  --  { "tipo":"slot", "circulo_minimo":1 }]
  custo          JSONB,

  acao           TEXT,                 -- "1 ação", "ação bônus", "1 hora"
  alcance        TEXT,
  duracao        TEXT,

  efeito_notacao TEXT,                 -- rolável, com fórmulas: "1d8 + mod(carisma)"
  efeito_tipo    TEXT,                 -- 'dano' | 'cura' | NULL (só texto)

  -- escala ao usar um círculo acima do mínimo. A faixa é escolhida pelo círculo
  -- usado (mecanismo de faixas da F19) e seu valor é a TAXA por círculo acima:
  -- { "faixas": [ { "de":2, "ate":null, "valor_extra_por_circulo":"1d8" } ] }
  -- 3º círculo num poder de 1º → 2 círculos acima → +2d8.
  escala_circulo JSONB,

  cd_formula     TEXT,                 -- CD deste poder (ou herda a do sistema)
  tags           TEXT[],
  classe_id      UUID REFERENCES classes(id) ON DELETE SET NULL,
  nivel_minimo   INTEGER,              -- requisito (F19)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- O catálogo do Krad tem dezenas de magias: índices para o filtro do editor.
CREATE INDEX IF NOT EXISTS poderes_sistema_idx ON poderes (sistema_id);
CREATE INDEX IF NOT EXISTS poderes_classe_idx  ON poderes (classe_id);

ALTER TABLE poderes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON poderes TO authenticated;

-- Leitura: quem enxerga o sistema (piggyback na RLS de `sistemas`)
DROP POLICY IF EXISTS "poderes_select" ON poderes;
CREATE POLICY "poderes_select"
  ON poderes FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));

-- Escrita: mestre E co-mestre — reaproveita o helper criado na Fase 19.6.
DROP POLICY IF EXISTS "poderes_mestre" ON poderes;
CREATE POLICY "poderes_mestre"
  ON poderes FOR ALL
  USING (sou_gestor_do_sistema(sistema_id));

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- (a) tabela existe e está vazia:
--     SELECT COUNT(*) FROM poderes;
--
-- (b) depois de cadastrar, ver o catálogo:
--     SELECT nome, categoria, circulo, custo, efeito_notacao, nivel_minimo
--     FROM poderes ORDER BY circulo NULLS FIRST, nome;

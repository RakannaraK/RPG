-- ============================================================================
-- Fase 33 — Transformações (forma = ficha) e árvore de habilidades
-- ----------------------------------------------------------------------------
-- Idempotente. Acrescenta colunas e AMPLIA o CHECK de fichas.tipo_ficha para
-- aceitar 'forma' (troca a regra, não apaga dado). Nenhuma política muda: a
-- forma é uma ficha e já segue as regras da F30.
-- ============================================================================

-- ─── 1) tipo_ficha aceita 'forma' ───────────────────────────────────────────
ALTER TABLE fichas DROP CONSTRAINT IF EXISTS fichas_tipo_ficha_valido;
ALTER TABLE fichas ADD CONSTRAINT fichas_tipo_ficha_valido
  CHECK (tipo_ficha IN ('personagem', 'criatura', 'forma'));

-- ─── 2) Formas ──────────────────────────────────────────────────────────────
-- A forma pertence a uma ficha (cai junto se a dona for apagada).
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS forma_de_id    UUID REFERENCES fichas(id) ON DELETE CASCADE;
-- Qual forma está ativa agora (NULL = na forma original).
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS forma_ativa_id UUID REFERENCES fichas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS fichas_formas ON fichas (forma_de_id) WHERE forma_de_id IS NOT NULL;

-- ─── 3) Árvore de habilidades: uma habilidade pode exigir outra ─────────────
ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS requer_habilidade_id UUID REFERENCES habilidades(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT tipo_ficha, count(*) FROM fichas GROUP BY 1;
--   SELECT count(*) FROM habilidades WHERE requer_habilidade_id IS NOT NULL;

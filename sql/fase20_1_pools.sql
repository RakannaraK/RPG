-- ============================================================================
-- Fase 20.1 — Pools genéricos (definição, ficha, recuperação)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Nada aqui é específico de D&D: o mestre nomeia o pool e escreve a fórmula.
-- O MÁXIMO nunca é armazenado — é derivado da fórmula. `atual` é o único estado.
-- Retrocompatível: sistema sem pools → nenhum painel aparece, nada muda.
-- ============================================================================

-- ─── 1) Definição dos pools (no sistema) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS pools (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id     UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,                                  -- "Thariuns", "Pontos de Foco"
  tipo           TEXT CHECK (tipo IN ('pontos','dados')) DEFAULT 'pontos',
  dado           TEXT,                                           -- só p/ tipo 'dados': "d12"
  maximo_formula TEXT NOT NULL,                                  -- fórmula F17/19: "2 * nivel"
  visivel_ficha  BOOLEAN DEFAULT TRUE,
  -- recuperação por descanso (F15), indexada pelo id do tipo de descanso:
  -- { "<id_descanso>": { "modo": "total"|"parcial"|"fixo"|"nada", "valor": ... } }
  recuperacao    JSONB,
  ordem          INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
GRANT ALL ON pools TO authenticated;

-- Leitura: quem enxerga o sistema (piggyback na RLS de `sistemas`)
DROP POLICY IF EXISTS "pools_select" ON pools;
CREATE POLICY "pools_select"
  ON pools FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));

-- Escrita: mestre E co-mestre — reaproveita o helper criado na Fase 19.6.
DROP POLICY IF EXISTS "pools_mestre" ON pools;
CREATE POLICY "pools_mestre"
  ON pools FOR ALL
  USING (sou_gestor_do_sistema(sistema_id));

-- ─── 2) Estado dos pools na ficha ───────────────────────────────────────────
-- `atual` = pontos atuais (tipo 'pontos') OU dados restantes (tipo 'dados').
-- Linha ausente = pool cheio (o app trata; não escreve nada só para exibir).
CREATE TABLE IF NOT EXISTS pools_ficha (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  pool_id  UUID REFERENCES pools(id)  ON DELETE CASCADE,
  atual    INTEGER NOT NULL DEFAULT 0 CHECK (atual >= 0),
  UNIQUE (ficha_id, pool_id)
);

ALTER TABLE pools_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON pools_ficha TO authenticated;

-- Dono da ficha: CRUD
DROP POLICY IF EXISTS "pools_ficha_dono" ON pools_ficha;
CREATE POLICY "pools_ficha_dono"
  ON pools_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: só leitura (piggyback na RLS de `fichas`)
DROP POLICY IF EXISTS "pools_ficha_membros" ON pools_ficha;
CREATE POLICY "pools_ficha_membros"
  ON pools_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── 3) Realtime: o painel de sessão reflete gastos ao vivo ─────────────────
-- Se já estiver na publicação, o ADD dá erro — por isso o bloco condicional.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pools_ficha'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pools_ficha;
  END IF;
END
$$;

-- ─── 4) Conferência (não altera nada) ───────────────────────────────────────
-- (a) as tabelas existem e estão vazias:
--     SELECT COUNT(*) FROM pools;
--     SELECT COUNT(*) FROM pools_ficha;
--
-- (b) o helper de gestor (criado na 19.6) existe — co-mestre deve dar true:
--     SELECT sou_gestor_do_sistema('<sistema_id>');
--
-- (c) pools_ficha está no Realtime:
--     SELECT tablename FROM pg_publication_tables
--     WHERE pubname = 'supabase_realtime' AND tablename = 'pools_ficha';

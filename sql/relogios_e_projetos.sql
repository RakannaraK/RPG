-- ============================================================================
-- Relógios de campanha (mesa) + Projetos de downtime (ficha)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
--
-- Duas features pensadas para cadência MENSAL de sessões:
--   1. relogios_mesa   — progresso compartilhado da campanha que o mestre
--      avança ("Investigação do Inquisidor 6/8"). Dá continuidade entre
--      sessões, que é onde a memória se perde.
--   2. projetos_ficha  — o que cada personagem faz nas 4 semanas ENTRE as
--      sessões (treinar, pesquisar, forjar, cultivar contatos).
--
-- O app funciona SEM rodar isto: os hooks silenciam o erro e os painéis
-- simplesmente não aparecem (mesmo padrão do useSessoes). Depois de rodar,
-- as duas features acendem sozinhas.
-- ============================================================================

-- ─── 1) Relógios de campanha (nível de MESA) ────────────────────────────────
CREATE TABLE IF NOT EXISTS relogios_mesa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     UUID REFERENCES mesas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  segmentos   INTEGER NOT NULL DEFAULT 6 CHECK (segmentos > 0),
  preenchido  INTEGER NOT NULL DEFAULT 0 CHECK (preenchido >= 0),
  concluido   BOOLEAN NOT NULL DEFAULT FALSE,
  ordem       INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE relogios_mesa ENABLE ROW LEVEL SECURITY;
GRANT ALL ON relogios_mesa TO authenticated;

-- Leitura: qualquer membro da mesa. Escrita: só gestor (mestre/co-mestre).
DROP POLICY IF EXISTS "relogios_select_membro" ON relogios_mesa;
CREATE POLICY "relogios_select_membro" ON relogios_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS "relogios_gestor" ON relogios_mesa;
CREATE POLICY "relogios_gestor" ON relogios_mesa FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- ─── 2) Projetos de downtime (nível de FICHA) ───────────────────────────────
CREATE TABLE IF NOT EXISTS projetos_ficha (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id    UUID REFERENCES fichas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  meta        INTEGER NOT NULL DEFAULT 4 CHECK (meta > 0),
  progresso   INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0),
  concluido   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projetos_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON projetos_ficha TO authenticated;

-- Dono da ficha: CRUD (é ele quem toca o próprio projeto).
DROP POLICY IF EXISTS "projetos_dono" ON projetos_ficha;
CREATE POLICY "projetos_dono" ON projetos_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: leitura (piggyback na RLS de `fichas`, padrão do projeto).
DROP POLICY IF EXISTS "projetos_membros" ON projetos_ficha;
CREATE POLICY "projetos_membros" ON projetos_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- Gestor da mesa: também pode mexer (o mestre arbitra downtime).
DROP POLICY IF EXISTS "projetos_gestor" ON projetos_ficha;
CREATE POLICY "projetos_gestor" ON projetos_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE sou_gestor(fichas.mesa_id)))
  WITH CHECK (ficha_id IN (SELECT id FROM fichas WHERE sou_gestor(fichas.mesa_id)));

-- ─── 3) Realtime (opcional — relógio avançando ao vivo na sessão) ───────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'relogios_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE relogios_mesa;
  END IF;
END $$;

-- ─── 4) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT COUNT(*) FROM relogios_mesa;
--   SELECT COUNT(*) FROM projetos_ficha;
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('relogios_mesa','projetos_ficha') ORDER BY tablename, cmd;

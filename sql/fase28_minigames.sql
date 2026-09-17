-- ============================================================================
-- Fase 28 — Minigames: resultados (ranking) e desafios
-- ----------------------------------------------------------------------------
-- Idempotente. Cobre a fase inteira. Só ACRESCENTA tabelas; nada existente muda.
-- Sem isto: jogar avulso funciona e vai ao feed; ranking e desafios avisam.
-- ============================================================================

-- ─── 0) Pré-requisito: funções das Fases 16 ─────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL
     OR to_regprocedure('minhas_mesas()') IS NULL
     OR to_regprocedure('pode_escrever_mesa(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor(uuid) / minhas_mesas() / pode_escrever_mesa(uuid) (Fase 16).';
  END IF;
END $$;

-- ─── 1) Desafios (o mestre põe vários jogadores na mesma partida) ──────────
CREATE TABLE IF NOT EXISTS desafios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id       UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  criado_por    UUID NOT NULL DEFAULT auth.uid(),
  tipo          TEXT NOT NULL CHECK (tipo IN ('roda', 'cronometro', 'memoria')),
  dificuldade   TEXT NOT NULL DEFAULT 'normal',
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,   -- parâmetros efetivos (personalizada inclusive)
  semente       BIGINT NOT NULL,                      -- mesma partida para todos
  participantes UUID[] NOT NULL DEFAULT '{}',
  meta          INTEGER CHECK (meta IS NULL OR meta >= 0),
  motivo        TEXT,
  status        TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'encerrado')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  encerrado_em  TIMESTAMPTZ
);

ALTER TABLE desafios ENABLE ROW LEVEL SECURITY;
GRANT ALL ON desafios TO authenticated;

DROP POLICY IF EXISTS "desafios_select_membro" ON desafios;
CREATE POLICY "desafios_select_membro" ON desafios FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS "desafios_gestor" ON desafios;
CREATE POLICY "desafios_gestor" ON desafios FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- ─── 2) Resultados (ranking, estatísticas, respostas de desafio) ───────────
CREATE TABLE IF NOT EXISTS minigames_resultados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL DEFAULT auth.uid(),
  ficha_id    UUID REFERENCES fichas(id) ON DELETE SET NULL,
  desafio_id  UUID REFERENCES desafios(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  dificuldade TEXT NOT NULL,
  pontos      INTEGER NOT NULL CHECK (pontos >= 0),
  detalhes    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Uma tentativa por participante em cada desafio
CREATE UNIQUE INDEX IF NOT EXISTS minigames_um_por_desafio
  ON minigames_resultados (desafio_id, usuario_id) WHERE desafio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS minigames_ranking
  ON minigames_resultados (mesa_id, tipo, dificuldade, pontos DESC);

ALTER TABLE minigames_resultados ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON minigames_resultados TO authenticated;

DROP POLICY IF EXISTS "minigames_select_membro" ON minigames_resultados;
CREATE POLICY "minigames_select_membro" ON minigames_resultados FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

-- Grava o PRÓPRIO resultado se pode escrever na mesa (espectador/arquivada não).
-- Em desafio: só participante, desafio aberto, mesmo jogo e dificuldade.
DROP POLICY IF EXISTS "minigames_insert_proprio" ON minigames_resultados;
CREATE POLICY "minigames_insert_proprio" ON minigames_resultados FOR INSERT
  WITH CHECK (
    usuario_id = auth.uid()
    AND pode_escrever_mesa(mesa_id)
    AND (
      desafio_id IS NULL
      OR EXISTS (
        SELECT 1 FROM desafios d
        WHERE d.id = minigames_resultados.desafio_id
          AND d.mesa_id = minigames_resultados.mesa_id
          AND d.status = 'aberto'
          AND auth.uid() = ANY (d.participantes)
          AND d.tipo = minigames_resultados.tipo
          AND d.dificuldade = minigames_resultados.dificuldade
      )
    )
  );

-- Apagar: a própria partida AVULSA, ou o gestor (moderação do ranking).
-- Resposta de desafio o jogador não apaga: senão apagaria e jogaria de novo.
DROP POLICY IF EXISTS "minigames_delete" ON minigames_resultados;
CREATE POLICY "minigames_delete" ON minigames_resultados FOR DELETE
  USING ((usuario_id = auth.uid() AND desafio_id IS NULL) OR sou_gestor(mesa_id));

-- ─── 3) Realtime ────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['desafios', 'minigames_resultados'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- ─── 4) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('desafios','minigames_resultados') ORDER BY tablename, cmd;

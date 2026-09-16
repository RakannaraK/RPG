-- ============================================================================
-- Fase 26 — Mesa virtual (mapa): cenas, tokens e desenhos
-- ----------------------------------------------------------------------------
-- SQL Editor do Supabase, uma vez. Idempotente (pode rodar de novo sem estrago).
-- Cobre a FASE INTEIRA (26.1–26.6): as sub-fases seguintes não pedem SQL novo.
--
-- O app funciona SEM rodar isto: a página do mapa mostra um aviso e o resto
-- segue igual. Depois de rodar, o mapa acende sozinho.
-- ============================================================================

-- ─── 0) Pré-requisito: funções da Fase 16 ───────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL OR to_regprocedure('minhas_mesas()') IS NULL THEN
    RAISE EXCEPTION 'Faltam as funções sou_gestor(uuid) / minhas_mesas() (Fases 16 e auditoria RLS). Rode-as antes deste script.';
  END IF;
END $$;

-- ─── 1) Cenas (mapas) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mapas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id            UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  nome               TEXT NOT NULL DEFAULT 'Cena',
  imagem_url         TEXT,
  imagem_path        TEXT,              -- caminho no Storage, para apagar o arquivo
  largura            INTEGER,
  altura             INTEGER,
  grade              JSONB NOT NULL DEFAULT '{}'::jsonb,
  nevoa              JSONB NOT NULL DEFAULT '{"ativa": false, "ops": []}'::jsonb,
  jogadores_desenham BOOLEAN NOT NULL DEFAULT TRUE,
  ativo              BOOLEAN NOT NULL DEFAULT FALSE,
  ordem              INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Uma única cena ativa por mesa (a que os jogadores veem).
CREATE UNIQUE INDEX IF NOT EXISTS mapas_um_ativo_por_mesa ON mapas (mesa_id) WHERE ativo;

ALTER TABLE mapas ENABLE ROW LEVEL SECURITY;
GRANT ALL ON mapas TO authenticated;

-- Gestor (mestre/co-mestre): tudo. Jogador: só a cena ATIVA (preparadas não vazam).
DROP POLICY IF EXISTS "mapas_gestor" ON mapas;
CREATE POLICY "mapas_gestor" ON mapas FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

DROP POLICY IF EXISTS "mapas_select_ativo" ON mapas;
CREATE POLICY "mapas_select_ativo" ON mapas FOR SELECT
  USING (ativo AND mesa_id IN (SELECT minhas_mesas()));

-- ─── 2) Tokens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens_mapa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapa_id       UUID NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  ficha_id      UUID REFERENCES fichas(id) ON DELETE CASCADE,
  combatente_id UUID REFERENCES combatentes(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL DEFAULT 'Token',
  imagem_url    TEXT,
  cor           TEXT DEFAULT '#8B5CF6',
  x             DOUBLE PRECISION NOT NULL DEFAULT 0,
  y             DOUBLE PRECISION NOT NULL DEFAULT 0,
  tamanho       NUMERIC NOT NULL DEFAULT 1 CHECK (tamanho > 0),
  oculto        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tokens_mapa ENABLE ROW LEVEL SECURITY;
GRANT ALL ON tokens_mapa TO authenticated;

DROP POLICY IF EXISTS "tokens_gestor" ON tokens_mapa;
CREATE POLICY "tokens_gestor" ON tokens_mapa FOR ALL
  USING (EXISTS (SELECT 1 FROM mapas m WHERE m.id = tokens_mapa.mapa_id AND sou_gestor(m.mesa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM mapas m WHERE m.id = tokens_mapa.mapa_id AND sou_gestor(m.mesa_id)));

-- Jogador vê tokens NÃO ocultos da cena ativa (o RLS de `mapas` já limita às mesas dele).
DROP POLICY IF EXISTS "tokens_select_membro" ON tokens_mapa;
CREATE POLICY "tokens_select_membro" ON tokens_mapa FOR SELECT
  USING (NOT oculto AND mapa_id IN (SELECT id FROM mapas WHERE ativo));

-- Dono da ficha move o próprio token.
DROP POLICY IF EXISTS "tokens_update_dono" ON tokens_mapa;
CREATE POLICY "tokens_update_dono" ON tokens_mapa FOR UPDATE
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()) AND mapa_id IN (SELECT id FROM mapas WHERE ativo))
  WITH CHECK (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()) AND mapa_id IN (SELECT id FROM mapas WHERE ativo));

-- ─── 3) Desenhos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS desenhos_mapa (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapa_id    UUID NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  autor_id   UUID NOT NULL DEFAULT auth.uid(),
  forma      TEXT NOT NULL DEFAULT 'livre',   -- 'livre' | 'linha'
  pontos     JSONB NOT NULL DEFAULT '[]'::jsonb,
  cor        TEXT DEFAULT '#FBBF24',
  espessura  REAL DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE desenhos_mapa ENABLE ROW LEVEL SECURITY;
GRANT ALL ON desenhos_mapa TO authenticated;

DROP POLICY IF EXISTS "desenhos_gestor" ON desenhos_mapa;
CREATE POLICY "desenhos_gestor" ON desenhos_mapa FOR ALL
  USING (EXISTS (SELECT 1 FROM mapas m WHERE m.id = desenhos_mapa.mapa_id AND sou_gestor(m.mesa_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM mapas m WHERE m.id = desenhos_mapa.mapa_id AND sou_gestor(m.mesa_id)));

DROP POLICY IF EXISTS "desenhos_select_membro" ON desenhos_mapa;
CREATE POLICY "desenhos_select_membro" ON desenhos_mapa FOR SELECT
  USING (mapa_id IN (SELECT id FROM mapas));

-- Jogador desenha na cena ativa se o mestre liberou e ele não é espectador.
DROP POLICY IF EXISTS "desenhos_insert_jogador" ON desenhos_mapa;
CREATE POLICY "desenhos_insert_jogador" ON desenhos_mapa FOR INSERT
  WITH CHECK (
    autor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM mapas m
      WHERE m.id = desenhos_mapa.mapa_id AND m.ativo AND m.jogadores_desenham
        AND NOT EXISTS (
          SELECT 1 FROM membros_mesa mm
          WHERE mm.mesa_id = m.mesa_id AND mm.usuario_id = auth.uid() AND mm.role = 'espectador'
        )
    )
  );

DROP POLICY IF EXISTS "desenhos_delete_autor" ON desenhos_mapa;
CREATE POLICY "desenhos_delete_autor" ON desenhos_mapa FOR DELETE
  USING (autor_id = auth.uid());

-- ─── 4) Realtime ────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['mapas', 'tokens_mapa', 'desenhos_mapa'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- ─── 5) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('mapas','tokens_mapa','desenhos_mapa') ORDER BY tablename, cmd;
--   SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' AND tablename IN ('mapas','tokens_mapa','desenhos_mapa');

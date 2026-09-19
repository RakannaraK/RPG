-- ============================================================================
-- Fase 29 — Chat da mesa, notas (privadas ou compartilhadas) e calendário
-- ----------------------------------------------------------------------------
-- Idempotente. Só ACRESCENTA tabelas; nada existente muda.
-- Sem isto: a mesa funciona igual, os painéis novos só avisam que falta o SQL.
-- ============================================================================

-- ─── 0) Pré-requisito: funções da Fase 16 ──────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL
     OR to_regprocedure('minhas_mesas()') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor(uuid) / minhas_mesas() (Fase 16).';
  END IF;
END $$;

-- ─── 1) Chat ────────────────────────────────────────────────────────────────
-- `para` NULL = mensagem para a mesa toda; com ids = sussurro (só autor e
-- destinatários leem — nem o mestre lê sussurro alheio).
CREATE TABLE IF NOT EXISTS mensagens_mesa (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  autor_id    UUID NOT NULL DEFAULT auth.uid(),
  texto       TEXT NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 2000),
  para        UUID[] CHECK (para IS NULL OR cardinality(para) > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mensagens_mesa_recentes ON mensagens_mesa (mesa_id, created_at DESC);

ALTER TABLE mensagens_mesa ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON mensagens_mesa TO authenticated;  -- sem UPDATE: mensagem não se edita

DROP POLICY IF EXISTS "mensagens_select" ON mensagens_mesa;
CREATE POLICY "mensagens_select" ON mensagens_mesa FOR SELECT
  USING (
    mesa_id IN (SELECT minhas_mesas())
    AND (para IS NULL OR autor_id = auth.uid() OR auth.uid() = ANY (para))
  );

-- Qualquer membro (espectador também) fala, em nome próprio, se a mesa não está arquivada
DROP POLICY IF EXISTS "mensagens_insert" ON mensagens_mesa;
CREATE POLICY "mensagens_insert" ON mensagens_mesa FOR INSERT
  WITH CHECK (
    autor_id = auth.uid()
    AND mesa_id IN (SELECT minhas_mesas())
    AND EXISTS (SELECT 1 FROM mesas m WHERE m.id = mesa_id AND m.arquivada IS NOT TRUE)
  );

-- Apaga a própria mensagem; o mestre/co-mestre modera
DROP POLICY IF EXISTS "mensagens_delete" ON mensagens_mesa;
CREATE POLICY "mensagens_delete" ON mensagens_mesa FOR DELETE
  USING (autor_id = auth.uid() OR sou_gestor(mesa_id));

-- ─── 2) Notas ───────────────────────────────────────────────────────────────
-- Privadas por padrão (só o autor lê). `compartilhada` = a mesa toda lê.
CREATE TABLE IF NOT EXISTS notas_mesa (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id       UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  autor_id      UUID NOT NULL DEFAULT auth.uid(),
  titulo        TEXT NOT NULL DEFAULT '' CHECK (char_length(titulo) <= 200),
  texto         TEXT NOT NULL DEFAULT '' CHECK (char_length(texto) <= 100000),
  compartilhada BOOLEAN NOT NULL DEFAULT false,
  fixada        BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notas_mesa_mesa ON notas_mesa (mesa_id);

ALTER TABLE notas_mesa ENABLE ROW LEVEL SECURITY;
GRANT ALL ON notas_mesa TO authenticated;

DROP POLICY IF EXISTS "notas_select" ON notas_mesa;
CREATE POLICY "notas_select" ON notas_mesa FOR SELECT
  USING (autor_id = auth.uid() OR (compartilhada AND mesa_id IN (SELECT minhas_mesas())));

DROP POLICY IF EXISTS "notas_insert" ON notas_mesa;
CREATE POLICY "notas_insert" ON notas_mesa FOR INSERT
  WITH CHECK (autor_id = auth.uid() AND mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS "notas_update" ON notas_mesa;
CREATE POLICY "notas_update" ON notas_mesa FOR UPDATE
  USING (autor_id = auth.uid())
  WITH CHECK (autor_id = auth.uid() AND mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS "notas_delete" ON notas_mesa;
CREATE POLICY "notas_delete" ON notas_mesa FOR DELETE
  USING (autor_id = auth.uid());

-- ─── 3) Calendário do mundo ─────────────────────────────────────────────────
-- Uma linha por mesa. `config` = { nome, meses: [{nome, dias}], dias_semana: [..], sufixo_ano }
CREATE TABLE IF NOT EXISTS calendarios_mesa (
  mesa_id    UUID PRIMARY KEY REFERENCES mesas(id) ON DELETE CASCADE,
  config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ano        INTEGER NOT NULL DEFAULT 1,
  mes        INTEGER NOT NULL DEFAULT 1 CHECK (mes >= 1),
  dia        INTEGER NOT NULL DEFAULT 1 CHECK (dia >= 1),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendarios_mesa ENABLE ROW LEVEL SECURITY;
GRANT ALL ON calendarios_mesa TO authenticated;

DROP POLICY IF EXISTS "calendarios_select" ON calendarios_mesa;
CREATE POLICY "calendarios_select" ON calendarios_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS "calendarios_gestor" ON calendarios_mesa;
CREATE POLICY "calendarios_gestor" ON calendarios_mesa FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- Eventos: `ano` NULL = repete todo ano (festival, aniversário).
-- `secreto` = só o mestre/co-mestre vê.
CREATE TABLE IF NOT EXISTS eventos_calendario (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id    UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  ano        INTEGER,
  mes        INTEGER NOT NULL CHECK (mes >= 1),
  dia        INTEGER NOT NULL CHECK (dia >= 1),
  titulo     TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descricao  TEXT CHECK (descricao IS NULL OR char_length(descricao) <= 5000),
  secreto    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS eventos_calendario_mesa ON eventos_calendario (mesa_id, mes, dia);

ALTER TABLE eventos_calendario ENABLE ROW LEVEL SECURITY;
GRANT ALL ON eventos_calendario TO authenticated;

DROP POLICY IF EXISTS "eventos_select" ON eventos_calendario;
CREATE POLICY "eventos_select" ON eventos_calendario FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()) AND (NOT secreto OR sou_gestor(mesa_id)));

DROP POLICY IF EXISTS "eventos_gestor" ON eventos_calendario;
CREATE POLICY "eventos_gestor" ON eventos_calendario FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- ─── 4) Realtime ────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['mensagens_mesa', 'notas_mesa', 'calendarios_mesa', 'eventos_calendario'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ─── 5) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('mensagens_mesa','notas_mesa','calendarios_mesa','eventos_calendario')
--   ORDER BY tablename, cmd;

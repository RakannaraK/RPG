-- ============================================================================
-- Fase 24 — Trilhas, Dots e Estados: pré-requisitos (RODADO pelo usuário)
-- ============================================================================

-- 1) Dots (24.3): override de exibição por atributo (NULL = padrão do sistema)
ALTER TABLE atributos ADD COLUMN exibicao TEXT DEFAULT NULL;

-- 2) Trilhas por ficha (24.2)
CREATE TABLE trilhas_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  trilha_id TEXT NOT NULL,             -- id da trilha na config_layout.trilhas
  marcas JSONB NOT NULL DEFAULT '[]',  -- array por caixinha: [null|"<tipo_id>", ...]
  UNIQUE(ficha_id, trilha_id)
);

-- 3) Estados por ficha (24.4)
CREATE TABLE estados_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  estado_id TEXT NOT NULL,             -- id do estado na config_layout.estados
  valor INTEGER NOT NULL DEFAULT 0,
  UNIQUE(ficha_id, estado_id)
);

-- RLS padrão (dono ALL; membros da mesa SELECT)
ALTER TABLE trilhas_ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE estados_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON trilhas_ficha TO authenticated;
GRANT ALL ON estados_ficha TO authenticated;

CREATE POLICY "trilhas_dono" ON trilhas_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "trilhas_membros" ON trilhas_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid())));

CREATE POLICY "estados_dono" ON estados_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "estados_membros" ON estados_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid())));

-- 4) Realtime (painel de sessão reflete marcas e estados ao vivo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'trilhas_ficha') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE trilhas_ficha;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'estados_ficha') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE estados_ficha;
  END IF;
END $$;

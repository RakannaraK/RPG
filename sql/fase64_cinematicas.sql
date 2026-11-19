-- Fase 64 — cinemáticas: cenas em tela cheia que o mestre exibe para a mesa.
-- Só cria duas tabelas novas; não apaga nem altera nenhum dado. Pode rodar mais de uma vez.

-- 1) As cinemáticas guardadas. Só o mestre ou co-mestre lê e escreve:
--    o jogador não consegue ver a cena antes da hora.
CREATE TABLE IF NOT EXISTS cinematicas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id    UUID NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  titulo     TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 80),
  quadros    JSONB NOT NULL DEFAULT '[]'::jsonb
             CHECK (jsonb_typeof(quadros) = 'array'
                    AND jsonb_array_length(quadros) <= 12
                    AND octet_length(quadros::text) <= 30000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cinematicas_mesa ON cinematicas (mesa_id, created_at);

ALTER TABLE cinematicas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cinematicas FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cinematicas TO authenticated;

DROP POLICY IF EXISTS cinematicas_gestor ON cinematicas;
CREATE POLICY cinematicas_gestor ON cinematicas FOR ALL TO authenticated
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- 2) O que está em exibição agora: uma linha por mesa. Membro lê; só o gestor escreve.
--    quadro NULL = nada em exibição.
CREATE TABLE IF NOT EXISTS cinematica_ao_vivo (
  mesa_id       UUID PRIMARY KEY REFERENCES mesas(id) ON DELETE CASCADE,
  cinematica_id UUID REFERENCES cinematicas(id) ON DELETE SET NULL,
  quadro        JSONB CHECK (quadro IS NULL
                             OR (jsonb_typeof(quadro) = 'object' AND octet_length(quadro::text) <= 4000)),
  indice        INTEGER NOT NULL DEFAULT 0,
  total         INTEGER NOT NULL DEFAULT 0,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cinematica_ao_vivo ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON cinematica_ao_vivo FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cinematica_ao_vivo TO authenticated;

DROP POLICY IF EXISTS cinematica_ao_vivo_select_membro ON cinematica_ao_vivo;
CREATE POLICY cinematica_ao_vivo_select_membro ON cinematica_ao_vivo FOR SELECT TO authenticated
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS cinematica_ao_vivo_gestor ON cinematica_ao_vivo;
CREATE POLICY cinematica_ao_vivo_gestor ON cinematica_ao_vivo FOR ALL TO authenticated
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

-- 3) Tempo real: a mesa vê o quadro trocar na hora.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'cinematica_ao_vivo') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cinematica_ao_vivo;
  END IF;
END $$;

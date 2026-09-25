-- Fase 43 — trilha sonora sincronizada + mesa de efeitos.
-- Aditivo: só cria a tabela nova. Nada é apagado.
--
-- Uma linha por mesa. A música é um vídeo do YouTube (não gasta armazenamento):
-- guardamos só o id do vídeo e "em que segundo estava, e quando". Cada pessoa
-- calcula a posição de agora sozinha: posicao_s + (agora - marcado_em).
-- O efeito sonoro é o último que o mestre disparou; cada navegador sintetiza
-- o som localmente (nenhum arquivo de áudio trafega).

CREATE TABLE IF NOT EXISTS som_mesa (
  mesa_id         uuid PRIMARY KEY REFERENCES mesas(id) ON DELETE CASCADE,
  video_id        text CHECK (video_id IS NULL OR video_id ~ '^[A-Za-z0-9_-]{11}$'),
  titulo          text CHECK (titulo IS NULL OR char_length(titulo) <= 120),
  tocando         boolean NOT NULL DEFAULT false,
  posicao_s       real NOT NULL DEFAULT 0 CHECK (posicao_s >= 0),
  marcado_em      timestamptz NOT NULL DEFAULT now(),
  repetir         boolean NOT NULL DEFAULT true,
  efeito          text CHECK (efeito IS NULL OR efeito ~ '^[a-z_]{1,30}$'),
  efeito_em       timestamptz,
  atualizado_por  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE som_mesa ENABLE ROW LEVEL SECURITY;

-- quem participa ouve; só quem gere a mesa mexe
DROP POLICY IF EXISTS som_mesa_ler ON som_mesa;
CREATE POLICY som_mesa_ler ON som_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS som_mesa_gestor ON som_mesa;
CREATE POLICY som_mesa_gestor ON som_mesa FOR ALL
  USING (sou_gestor(mesa_id))
  WITH CHECK (sou_gestor(mesa_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON som_mesa TO authenticated;
REVOKE ALL ON som_mesa FROM anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'som_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE som_mesa;
  END IF;
END $$;

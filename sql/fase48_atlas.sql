-- Fase 48 — Atlas: mapa-mundi da campanha com pinos ligados à enciclopédia (F41).
-- Aditivo: só cria tabelas novas. Nada é apagado.
--
-- Segredo por padrão, como a enciclopédia: o mapa nasce escondido dos jogadores
-- (`visivel = false`), e cada pino só aparece para quem já recebeu ALGUMA
-- revelação do verbete dele — senão o pino entregaria "tem algo aqui".

CREATE TABLE IF NOT EXISTS atlas_mesa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  nome        text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 80),
  imagem_url  text NOT NULL CHECK (char_length(imagem_url) BETWEEN 1 AND 1000),
  visivel     boolean NOT NULL DEFAULT false,
  criado_por  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS atlas_mesa_mesa ON atlas_mesa (mesa_id, created_at);

-- x e y vão de 0 a 1 (fração da largura/altura da imagem): o pino fica no
-- mesmo lugar em qualquer tamanho de tela
CREATE TABLE IF NOT EXISTS pinos_atlas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atlas_id    uuid NOT NULL REFERENCES atlas_mesa(id) ON DELETE CASCADE,
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  verbete_id  uuid NOT NULL REFERENCES verbetes(id) ON DELETE CASCADE,
  x           real NOT NULL CHECK (x BETWEEN 0 AND 1),
  y           real NOT NULL CHECK (y BETWEEN 0 AND 1),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (atlas_id, verbete_id)
);
CREATE INDEX IF NOT EXISTS pinos_atlas_mesa ON pinos_atlas (mesa_id);

-- mesa do pino vem do mapa; e o verbete tem que ser da MESMA mesa
CREATE OR REPLACE FUNCTION pino_da_mesa_do_atlas() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT mesa_id INTO NEW.mesa_id FROM atlas_mesa WHERE id = NEW.atlas_id;
  IF NOT EXISTS (SELECT 1 FROM verbetes WHERE id = NEW.verbete_id AND mesa_id = NEW.mesa_id) THEN
    RAISE EXCEPTION 'Esse verbete não é desta mesa.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pino_da_mesa_do_atlas ON pinos_atlas;
CREATE TRIGGER pino_da_mesa_do_atlas BEFORE INSERT OR UPDATE ON pinos_atlas
  FOR EACH ROW EXECUTE FUNCTION pino_da_mesa_do_atlas();

ALTER TABLE atlas_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinos_atlas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS atlas_gestor ON atlas_mesa;
CREATE POLICY atlas_gestor ON atlas_mesa FOR ALL
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));
DROP POLICY IF EXISTS atlas_jogador_ve ON atlas_mesa;
CREATE POLICY atlas_jogador_ve ON atlas_mesa FOR SELECT
  USING (visivel AND mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS pinos_gestor ON pinos_atlas;
CREATE POLICY pinos_gestor ON pinos_atlas FOR ALL
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));
-- o jogador vê o pino se vê o mapa (a RLS de atlas_mesa filtra a subconsulta)
-- E se já recebeu alguma revelação do verbete (a RLS de revelacoes_verbete só
-- mostra as dele e as da mesa toda)
DROP POLICY IF EXISTS pinos_jogador_ve ON pinos_atlas;
CREATE POLICY pinos_jogador_ve ON pinos_atlas FOR SELECT
  USING (
    atlas_id IN (SELECT id FROM atlas_mesa)
    AND EXISTS (SELECT 1 FROM revelacoes_verbete r
                 WHERE r.verbete_id = pinos_atlas.verbete_id
                   AND (r.usuario_id = auth.uid() OR r.usuario_id IS NULL))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON atlas_mesa, pinos_atlas TO authenticated;
REVOKE ALL ON atlas_mesa, pinos_atlas FROM anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'atlas_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE atlas_mesa;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pinos_atlas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pinos_atlas;
  END IF;
END $$;

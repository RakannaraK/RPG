-- Fase 44 — ferramentas de segurança da mesa: linhas e véus, combinados e X-Card.
-- Aditivo: só cria tabelas novas. Nada é apagado.
--
-- ANONIMATO DE PROPÓSITO: nenhuma das duas tabelas guarda quem escreveu.
-- Uma linha é unilateral (se alguém tem, a mesa tem) e o X-Card não pede
-- explicação — por isso ninguém, nem o mestre, consegue saber de quem veio.

CREATE TABLE IF NOT EXISTS limites_mesa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  tipo        text NOT NULL CHECK (tipo IN ('linha', 'veu', 'combinado')),
  texto       text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 200),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS limites_mesa_mesa ON limites_mesa (mesa_id, tipo, created_at);

CREATE TABLE IF NOT EXISTS xcard_mesa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xcard_mesa_mesa ON xcard_mesa (mesa_id, created_at DESC);

ALTER TABLE limites_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE xcard_mesa ENABLE ROW LEVEL SECURITY;

-- quem participa vê e acrescenta; só quem gere a mesa tira (duplicata, brincadeira)
DROP POLICY IF EXISTS limites_ler ON limites_mesa;
CREATE POLICY limites_ler ON limites_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));
DROP POLICY IF EXISTS limites_acrescentar ON limites_mesa;
CREATE POLICY limites_acrescentar ON limites_mesa FOR INSERT
  WITH CHECK (mesa_id IN (SELECT minhas_mesas()));
DROP POLICY IF EXISTS limites_gestor_tira ON limites_mesa;
CREATE POLICY limites_gestor_tira ON limites_mesa FOR DELETE
  USING (sou_gestor(mesa_id));

-- X-Card: qualquer participante toca; todos veem que foi tocado; ninguém edita
DROP POLICY IF EXISTS xcard_ler ON xcard_mesa;
CREATE POLICY xcard_ler ON xcard_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));
DROP POLICY IF EXISTS xcard_tocar ON xcard_mesa;
CREATE POLICY xcard_tocar ON xcard_mesa FOR INSERT
  WITH CHECK (mesa_id IN (SELECT minhas_mesas()));

-- created_at vem do banco: ninguém "toca no passado" nem no futuro
GRANT SELECT, DELETE ON limites_mesa TO authenticated;
GRANT INSERT (mesa_id, tipo, texto) ON limites_mesa TO authenticated;
GRANT SELECT ON xcard_mesa TO authenticated;
GRANT INSERT (mesa_id) ON xcard_mesa TO authenticated;
REVOKE ALL ON limites_mesa, xcard_mesa FROM anon;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'limites_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE limites_mesa;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'xcard_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE xcard_mesa;
  END IF;
END $$;

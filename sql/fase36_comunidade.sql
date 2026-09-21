-- ============================================================================
-- Fase 36 — Comunidade: vitrine de fichas, criaturas, sistemas e artes
-- ----------------------------------------------------------------------------
-- Idempotente. Só ACRESCENTA tabelas, uma coluna em profiles e duas funções.
-- Nada existente muda; nada é apagado.
--
-- SEGURANÇA: `vitrine_publica` é a SEGUNDA (e última) função liberada ao papel
-- anônimo — junto com overlay_dados (F34). Ela só devolve publicações NÃO
-- ocultas e nada de mesas, fichas ao vivo ou usuários.
-- ============================================================================

-- ─── 1) Administrador da comunidade ─────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION sou_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT p.admin FROM profiles p WHERE p.id = auth.uid()), false)
$$;
REVOKE EXECUTE ON FUNCTION sou_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sou_admin() TO authenticated, service_role;

-- ─── 2) Publicações ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('ficha', 'criatura', 'sistema', 'arte')),
  titulo      TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 2 AND 120),
  descricao   TEXT CHECK (descricao IS NULL OR char_length(descricao) <= 2000),
  etiquetas   TEXT[] NOT NULL DEFAULT '{}',
  conteudo    JSONB,          -- arquivo portátil (ficha/criatura/sistema)
  imagem_url  TEXT CHECK (imagem_url IS NULL OR char_length(imagem_url) <= 500),
  creditos    TEXT CHECK (creditos IS NULL OR char_length(creditos) <= 200),
  curtidas    INTEGER NOT NULL DEFAULT 0,
  denuncias   INTEGER NOT NULL DEFAULT 0,
  oculta      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- arte precisa de imagem; o resto precisa de conteúdo
  CONSTRAINT publicacoes_conteudo_coerente CHECK (
    (tipo = 'arte' AND imagem_url IS NOT NULL) OR (tipo <> 'arte' AND conteudo IS NOT NULL)
  ),
  -- teto de tamanho (a decisão do roadmap: sem limite de quantidade, só de tamanho)
  CONSTRAINT publicacoes_tamanho CHECK (conteudo IS NULL OR pg_column_size(conteudo) <= 1000000)
);
CREATE INDEX IF NOT EXISTS publicacoes_vitrine ON publicacoes (tipo, created_at DESC) WHERE NOT oculta;
CREATE INDEX IF NOT EXISTS publicacoes_autor ON publicacoes (autor_id);

ALTER TABLE publicacoes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON publicacoes TO authenticated;

DROP POLICY IF EXISTS "publicacoes_select" ON publicacoes;
CREATE POLICY "publicacoes_select" ON publicacoes FOR SELECT
  USING (NOT oculta OR autor_id = auth.uid() OR sou_admin());

DROP POLICY IF EXISTS "publicacoes_insert" ON publicacoes;
CREATE POLICY "publicacoes_insert" ON publicacoes FOR INSERT
  WITH CHECK (autor_id = auth.uid());

-- O autor edita título/descrição/etiquetas; contagens e `oculta` são do banco
-- (gatilho) e do administrador.
DROP POLICY IF EXISTS "publicacoes_update_autor" ON publicacoes;
CREATE POLICY "publicacoes_update_autor" ON publicacoes FOR UPDATE
  USING (autor_id = auth.uid() OR sou_admin())
  WITH CHECK (autor_id = auth.uid() OR sou_admin());

DROP POLICY IF EXISTS "publicacoes_delete" ON publicacoes;
CREATE POLICY "publicacoes_delete" ON publicacoes FOR DELETE
  USING (autor_id = auth.uid() OR sou_admin());

-- Protege as contagens: só o gatilho/administrador mexe
CREATE OR REPLACE FUNCTION proteger_publicacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- As contagens são atualizadas pelos gatilhos abaixo, que marcam a transação
  -- com `app.contagem`. Sem isto, esta proteção desfazia a própria contagem.
  IF current_setting('app.contagem', true) = '1' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT sou_admin() THEN
    NEW.curtidas  := OLD.curtidas;
    NEW.denuncias := OLD.denuncias;
    NEW.oculta    := OLD.oculta;
    NEW.autor_id  := OLD.autor_id;
    NEW.tipo      := OLD.tipo;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS publicacoes_proteger ON publicacoes;
CREATE TRIGGER publicacoes_proteger BEFORE UPDATE ON publicacoes
  FOR EACH ROW EXECUTE FUNCTION proteger_publicacao();

-- ─── 3) Curtidas (uma por pessoa) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS curtidas_publicacao (
  publicacao_id UUID NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (publicacao_id, usuario_id)
);
ALTER TABLE curtidas_publicacao ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON curtidas_publicacao TO authenticated;

DROP POLICY IF EXISTS "curtidas_select" ON curtidas_publicacao;
CREATE POLICY "curtidas_select" ON curtidas_publicacao FOR SELECT USING (true);
DROP POLICY IF EXISTS "curtidas_minhas" ON curtidas_publicacao;
CREATE POLICY "curtidas_minhas" ON curtidas_publicacao FOR INSERT WITH CHECK (usuario_id = auth.uid());
DROP POLICY IF EXISTS "curtidas_descurtir" ON curtidas_publicacao;
CREATE POLICY "curtidas_descurtir" ON curtidas_publicacao FOR DELETE USING (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION contar_curtidas()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.contagem', '1', true);
  UPDATE publicacoes p
     SET curtidas = (SELECT count(*) FROM curtidas_publicacao c WHERE c.publicacao_id = p.id)
   WHERE p.id = COALESCE(NEW.publicacao_id, OLD.publicacao_id);
  PERFORM set_config('app.contagem', '0', true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS curtidas_contar ON curtidas_publicacao;
CREATE TRIGGER curtidas_contar AFTER INSERT OR DELETE ON curtidas_publicacao
  FOR EACH ROW EXECUTE FUNCTION contar_curtidas();

-- ─── 4) Denúncias (uma por pessoa; 3 escondem) ──────────────────────────────
CREATE TABLE IF NOT EXISTS denuncias_publicacao (
  publicacao_id UUID NOT NULL REFERENCES publicacoes(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  motivo        TEXT CHECK (motivo IS NULL OR char_length(motivo) <= 500),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (publicacao_id, usuario_id)
);
ALTER TABLE denuncias_publicacao ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON denuncias_publicacao TO authenticated;

DROP POLICY IF EXISTS "denuncias_select" ON denuncias_publicacao;
CREATE POLICY "denuncias_select" ON denuncias_publicacao FOR SELECT
  USING (usuario_id = auth.uid() OR sou_admin());
DROP POLICY IF EXISTS "denuncias_minhas" ON denuncias_publicacao;
CREATE POLICY "denuncias_minhas" ON denuncias_publicacao FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE OR REPLACE FUNCTION contar_denuncias()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_total INTEGER;
BEGIN
  SELECT count(*) INTO v_total FROM denuncias_publicacao d WHERE d.publicacao_id = NEW.publicacao_id;
  PERFORM set_config('app.contagem', '1', true);
  UPDATE publicacoes
     SET denuncias = v_total,
         oculta = (v_total >= 3) OR oculta   -- 3 denúncias somem com a publicação
   WHERE id = NEW.publicacao_id;
  PERFORM set_config('app.contagem', '0', true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS denuncias_contar ON denuncias_publicacao;
CREATE TRIGGER denuncias_contar AFTER INSERT ON denuncias_publicacao
  FOR EACH ROW EXECUTE FUNCTION contar_denuncias();

-- ─── 5) Vitrine para quem não tem conta ─────────────────────────────────────
CREATE OR REPLACE FUNCTION vitrine_publica(p_limite INTEGER DEFAULT 24)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
             'id', p.id, 'tipo', p.tipo, 'titulo', p.titulo, 'descricao', p.descricao,
             'etiquetas', p.etiquetas, 'imagem_url', p.imagem_url, 'creditos', p.creditos,
             'curtidas', p.curtidas, 'created_at', p.created_at,
             'autor', COALESCE((SELECT pr.username FROM profiles pr WHERE pr.id = p.autor_id), 'alguém')
           ) AS x
      FROM publicacoes p
     WHERE NOT p.oculta
     ORDER BY p.created_at DESC
     LIMIT GREATEST(1, LEAST(60, COALESCE(p_limite, 24)))
  ) s
$$;
REVOKE EXECUTE ON FUNCTION vitrine_publica(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vitrine_publica(INTEGER) TO anon, authenticated, service_role;

-- ─── 6) Realtime (curtidas aparecendo ao vivo) ──────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['publicacoes'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT tipo, count(*) FROM publicacoes GROUP BY 1;
--   SELECT policyname, cmd FROM pg_policies WHERE tablename LIKE '%publicaca%';

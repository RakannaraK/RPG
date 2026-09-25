-- Fases 41 e 42 — enciclopédia da campanha + revelação campo a campo + handouts.
-- Aditivo e idempotente.
--
-- MODELO DE SEGURANÇA (a parte que importa):
-- RLS é por LINHA, não por coluna. Se o jogador pudesse dar SELECT em
-- `verbetes`, receberia todas as colunas da linha — inclusive o corpo ainda
-- secreto e as notas do mestre. Por isso:
--   * `verbetes`: SÓ quem gere a mesa lê e escreve. Jogador não lê nada direto.
--   * o jogador lê por `verbetes_visiveis(mesa)`, que devolve apenas os campos
--     revelados a ele (ou à mesa toda); o resto sai NULL.
--   * `segredo` (notas do mestre) nunca sai da função, nem revelado.
--   * `revelacoes_verbete` guarda só QUAIS campos foram revelados a QUEM — sem
--     conteúdo —, e o jogador pode lê-la para o tempo real avisar que chegou algo.

CREATE TABLE IF NOT EXISTS verbetes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  tipo        text NOT NULL DEFAULT 'outro'
              CHECK (tipo IN ('npc', 'local', 'faccao', 'divindade', 'item', 'lore', 'handout', 'outro')),
  titulo      text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  resumo      text CHECK (resumo IS NULL OR char_length(resumo) <= 500),
  corpo       text CHECK (corpo IS NULL OR char_length(corpo) <= 20000),
  segredo     text CHECK (segredo IS NULL OR char_length(segredo) <= 5000),
  imagem_url  text CHECK (imagem_url IS NULL OR char_length(imagem_url) <= 1000),
  tags        text[] NOT NULL DEFAULT '{}',
  campos      jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_por  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS verbetes_mesa_idx ON verbetes (mesa_id);

CREATE TABLE IF NOT EXISTS revelacoes_verbete (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verbete_id  uuid NOT NULL REFERENCES verbetes(id) ON DELETE CASCADE,
  mesa_id     uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  usuario_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,        -- NULL = a mesa toda
  campo       text NOT NULL CHECK (campo ~ '^(titulo|resumo|imagem|corpo|tags|campos\.[a-z_]{1,40})$'),
  revelado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS revelacao_unica ON revelacoes_verbete
  (verbete_id, COALESCE(usuario_id, '00000000-0000-0000-0000-000000000000'::uuid), campo);
CREATE INDEX IF NOT EXISTS revelacoes_mesa_idx ON revelacoes_verbete (mesa_id);

-- a mesa da revelação vem SEMPRE do verbete (ninguém revela para outra mesa)
CREATE OR REPLACE FUNCTION revelacao_mesa_do_verbete() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.mesa_id := (SELECT mesa_id FROM verbetes WHERE id = NEW.verbete_id);
  IF NEW.mesa_id IS NULL THEN RAISE EXCEPTION 'Verbete não encontrado.'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS revelacao_mesa_do_verbete ON revelacoes_verbete;
CREATE TRIGGER revelacao_mesa_do_verbete BEFORE INSERT OR UPDATE ON revelacoes_verbete
  FOR EACH ROW EXECUTE FUNCTION revelacao_mesa_do_verbete();

CREATE OR REPLACE FUNCTION verbete_atualizado() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS verbete_atualizado ON verbetes;
CREATE TRIGGER verbete_atualizado BEFORE UPDATE ON verbetes
  FOR EACH ROW EXECUTE FUNCTION verbete_atualizado();

ALTER TABLE verbetes ENABLE ROW LEVEL SECURITY;
ALTER TABLE revelacoes_verbete ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verbetes_gestor ON verbetes;
CREATE POLICY verbetes_gestor ON verbetes FOR ALL
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));

DROP POLICY IF EXISTS revelacoes_gestor ON revelacoes_verbete;
CREATE POLICY revelacoes_gestor ON revelacoes_verbete FOR ALL
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));

-- jogador vê só as linhas de revelação que são PARA ele (sem conteúdo nenhum)
DROP POLICY IF EXISTS revelacoes_destinatario ON revelacoes_verbete;
CREATE POLICY revelacoes_destinatario ON revelacoes_verbete FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()) AND (usuario_id = auth.uid() OR usuario_id IS NULL));

GRANT SELECT, INSERT, UPDATE, DELETE ON verbetes, revelacoes_verbete TO authenticated;
REVOKE ALL ON verbetes, revelacoes_verbete FROM anon;

-- O que o jogador pode ver: só campos revelados a ele ou à mesa toda.
CREATE OR REPLACE FUNCTION verbetes_visiveis(p_mesa_id uuid)
RETURNS TABLE (id uuid, tipo text, titulo text, resumo text, corpo text, imagem_url text,
               tags text[], campos jsonb, revelado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM minhas_mesas() m WHERE m = p_mesa_id) THEN
    RAISE EXCEPTION 'Você não participa desta mesa.';
  END IF;
  RETURN QUERY
  WITH r AS (
    SELECT rv.verbete_id, array_agg(DISTINCT rv.campo) AS rev, max(rv.revelado_em) AS em
      FROM revelacoes_verbete rv
     WHERE rv.mesa_id = p_mesa_id AND (rv.usuario_id = v_uid OR rv.usuario_id IS NULL)
     GROUP BY rv.verbete_id
  )
  SELECT v.id, v.tipo,
         CASE WHEN 'titulo' = ANY (r.rev) THEN v.titulo END,
         CASE WHEN 'resumo' = ANY (r.rev) THEN v.resumo END,
         CASE WHEN 'corpo'  = ANY (r.rev) THEN v.corpo END,
         CASE WHEN 'imagem' = ANY (r.rev) THEN v.imagem_url END,
         CASE WHEN 'tags'   = ANY (r.rev) THEN v.tags END,
         COALESCE((SELECT jsonb_object_agg(e.key, e.value) FROM jsonb_each(v.campos) e
                    WHERE ('campos.' || e.key) = ANY (r.rev)), '{}'::jsonb),
         r.em
    FROM verbetes v JOIN r ON r.verbete_id = v.id
   WHERE v.mesa_id = p_mesa_id;
END $$;
REVOKE ALL ON FUNCTION verbetes_visiveis(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION verbetes_visiveis(uuid) TO authenticated;

-- Revela campos a jogadores (ou à mesa toda, com p_usuarios vazio) e avisa quem
-- recebeu. É o "entregar handout": tudo numa transação, conferindo quem manda.
CREATE OR REPLACE FUNCTION entregar_verbete(p_verbete_id uuid, p_usuarios uuid[], p_campos text[], p_avisar boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mesa uuid;
  v_titulo text;
  v_tipo text;
  v_novos integer := 0;
  v_alvo uuid;
  v_campo text;
  v_destinos uuid[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  SELECT mesa_id, titulo, tipo INTO v_mesa, v_titulo, v_tipo FROM verbetes WHERE id = p_verbete_id;
  IF v_mesa IS NULL THEN RAISE EXCEPTION 'Verbete não encontrado.'; END IF;
  IF NOT sou_gestor(v_mesa) THEN RAISE EXCEPTION 'Só quem gere a mesa revela.'; END IF;
  IF p_campos IS NULL OR cardinality(p_campos) = 0 THEN RAISE EXCEPTION 'Escolha o que revelar.'; END IF;

  -- destinatários precisam ser da mesa
  IF p_usuarios IS NOT NULL AND cardinality(p_usuarios) > 0 THEN
    IF EXISTS (SELECT 1 FROM unnest(p_usuarios) u
                WHERE NOT EXISTS (SELECT 1 FROM membros_mesa m WHERE m.mesa_id = v_mesa AND m.usuario_id = u)) THEN
      RAISE EXCEPTION 'Alguém da lista não participa da mesa.';
    END IF;
  END IF;

  FOREACH v_campo IN ARRAY p_campos LOOP
    IF p_usuarios IS NULL OR cardinality(p_usuarios) = 0 THEN
      INSERT INTO revelacoes_verbete (verbete_id, mesa_id, usuario_id, campo)
      SELECT p_verbete_id, v_mesa, NULL, v_campo
       WHERE NOT EXISTS (SELECT 1 FROM revelacoes_verbete
                          WHERE verbete_id = p_verbete_id AND usuario_id IS NULL AND campo = v_campo);
      v_novos := v_novos + (CASE WHEN FOUND THEN 1 ELSE 0 END);
    ELSE
      FOREACH v_alvo IN ARRAY p_usuarios LOOP
        INSERT INTO revelacoes_verbete (verbete_id, mesa_id, usuario_id, campo)
        SELECT p_verbete_id, v_mesa, v_alvo, v_campo
         WHERE NOT EXISTS (SELECT 1 FROM revelacoes_verbete
                            WHERE verbete_id = p_verbete_id AND usuario_id = v_alvo AND campo = v_campo);
        v_novos := v_novos + (CASE WHEN FOUND THEN 1 ELSE 0 END);
      END LOOP;
    END IF;
  END LOOP;

  IF p_avisar AND v_novos > 0 THEN
    v_destinos := CASE
      WHEN p_usuarios IS NULL OR cardinality(p_usuarios) = 0
        THEN ARRAY(SELECT usuario_id FROM membros_mesa WHERE mesa_id = v_mesa AND usuario_id <> v_uid)
      ELSE p_usuarios END;
    INSERT INTO notificacoes (usuario_id, tipo, titulo, corpo, link)
    SELECT d, 'revelacao',
           CASE WHEN v_tipo = 'handout' THEN 'Você recebeu um documento' ELSE 'Algo novo na enciclopédia' END,
           -- o título só vai no aviso se ele próprio foi revelado
           CASE WHEN 'titulo' = ANY (p_campos) THEN v_titulo ELSE 'Abra a enciclopédia da mesa' END,
           '/mesa/' || v_mesa || '?aba=Enciclopédia'
      FROM unnest(v_destinos) d
     WHERE d <> v_uid;
  END IF;
  RETURN v_novos;
END $$;
REVOKE ALL ON FUNCTION entregar_verbete(uuid, uuid[], text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION entregar_verbete(uuid, uuid[], text[], boolean) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'revelacoes_verbete') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE revelacoes_verbete;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'verbetes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE verbetes;
  END IF;
END $$;

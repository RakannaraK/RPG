-- ============================================================================
-- Fase 34 — Overlay para OBS por link secreto
-- ----------------------------------------------------------------------------
-- Idempotente. Acrescenta 2 colunas em mesas e 2 funções. Nada é apagado.
--
-- ATENÇÃO DE SEGURANÇA: `overlay_dados` é a ÚNICA função que o papel anônimo
-- pode executar (ver sql/seguranca_funcoes_anon.sql). Ela só devolve dados da
-- mesa cujo token secreto foi informado, só de fichas NÃO privadas, e só o que
-- a configuração do mestre manda mostrar.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Falta sou_gestor(uuid) (Fase 16).';
  END IF;
END $$;

ALTER TABLE mesas ADD COLUMN IF NOT EXISTS overlay_token  TEXT;
ALTER TABLE mesas ADD COLUMN IF NOT EXISTS overlay_config JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS mesas_overlay_token ON mesas (overlay_token) WHERE overlay_token IS NOT NULL;

-- ─── Dados do overlay (chamada anônima, só com o token) ─────────────────────
CREATE OR REPLACE FUNCTION overlay_dados(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa   mesas;
  v_cfg    JSONB;
  v_vida   TEXT;
  v_pers   JSONB;
  v_turno  JSONB := NULL;
  v_rol    JSONB := NULL;
  v_enc    encontros;
  v_atual  combatentes;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_mesa FROM mesas WHERE overlay_token = p_token LIMIT 1;
  IF v_mesa.id IS NULL THEN
    RETURN NULL;
  END IF;

  v_cfg  := COALESCE(v_mesa.overlay_config, '{}'::jsonb);
  v_vida := COALESCE(v_cfg->>'mostrar_vida', 'barra');  -- 'numeros' | 'barra' | 'nada'

  -- Personagens: forma ativa (F33) no lugar da ficha; ficha privada (F30) fora.
  SELECT COALESCE(jsonb_agg(p ORDER BY p->>'ordem'), '[]'::jsonb) INTO v_pers
  FROM (
    SELECT jsonb_build_object(
             'id',        f.id,
             'ordem',     to_char(f.created_at, 'YYYYMMDDHH24MISS'),
             'nome',      COALESCE(fa.nome_personagem, f.nome_personagem),
             'imagem',    COALESCE(fa.imagem_url, f.imagem_url),
             'hp_atual',  CASE WHEN v_vida = 'nada' THEN NULL ELSE COALESCE(fa.hp_atual, f.hp_atual) END,
             'hp_maximo', CASE WHEN v_vida = 'nada' THEN NULL ELSE COALESCE(fa.hp_maximo, f.hp_maximo) END,
             'vida_temp', CASE WHEN v_vida = 'nada' THEN NULL ELSE COALESCE(fa.vida_temp_atual, f.vida_temp_atual) END
           ) AS p
      FROM fichas f
      LEFT JOIN fichas fa ON fa.id = f.forma_ativa_id
     WHERE f.mesa_id = v_mesa.id
       AND f.tipo_ficha = 'personagem'
       AND f.forma_de_id IS NULL
       AND f.privada IS NOT TRUE
  ) s;

  -- Turno atual (só se o mestre liberou)
  IF COALESCE((v_cfg->>'mostrar_turno')::boolean, true) THEN
    SELECT * INTO v_enc FROM encontros WHERE mesa_id = v_mesa.id AND ativo ORDER BY created_at DESC LIMIT 1;
    IF v_enc.id IS NOT NULL THEN
      SELECT * INTO v_atual
        FROM combatentes
       WHERE encontro_id = v_enc.id AND reserva IS NOT TRUE
       ORDER BY iniciativa DESC NULLS LAST, COALESCE(ordem, 0), created_at
       OFFSET GREATEST(0, COALESCE(v_enc.turno_atual, 0)) LIMIT 1;
      v_turno := jsonb_build_object(
        'rodada', v_enc.rodada,
        'titulo', v_enc.titulo,
        'de', v_atual.nome
      );
    END IF;
  END IF;

  -- Última rolagem (só se o mestre liberou)
  IF COALESCE((v_cfg->>'mostrar_rolagem')::boolean, false) THEN
    SELECT jsonb_build_object('autor', r.autor_nome, 'rotulo', r.rotulo, 'notacao', r.notacao, 'total', r.total, 'em', r.created_at)
      INTO v_rol
      FROM rolagens r
     WHERE r.mesa_id = v_mesa.id
     ORDER BY r.created_at DESC LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'mesa', jsonb_build_object('nome', v_mesa.nome),
    'config', v_cfg,
    'personagens', v_pers,
    'turno', v_turno,
    'rolagem', v_rol
  );
END $$;

REVOKE EXECUTE ON FUNCTION overlay_dados(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION overlay_dados(TEXT) TO anon, authenticated, service_role;

-- ─── Configurar e (re)gerar o link (só gestor) ──────────────────────────────
CREATE OR REPLACE FUNCTION definir_overlay(p_mesa_id UUID, p_config JSONB DEFAULT NULL, p_novo_token BOOLEAN DEFAULT false)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_token TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT sou_gestor(p_mesa_id) THEN
    RAISE EXCEPTION 'Só o mestre ou co-mestre mexe no overlay.' USING ERRCODE = '42501';
  END IF;

  SELECT overlay_token INTO v_token FROM mesas WHERE id = p_mesa_id;
  IF p_novo_token OR v_token IS NULL THEN
    -- 32 hex sem depender do pgcrypto (que no Supabase vive noutro schema)
    v_token := replace(gen_random_uuid()::text, '-', '');
  END IF;

  UPDATE mesas
     SET overlay_token = v_token,
         overlay_config = COALESCE(p_config, overlay_config, '{}'::jsonb)
   WHERE id = p_mesa_id;

  RETURN v_token;
END $$;

REVOKE EXECUTE ON FUNCTION definir_overlay(UUID, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION definir_overlay(UUID, JSONB, BOOLEAN) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT nome, overlay_token IS NOT NULL AS tem_link, overlay_config FROM mesas;

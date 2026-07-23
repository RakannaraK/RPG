-- ============================================================================
-- Import de sistema — RPC atômica (export/import, Sub-fase B2)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente (CREATE
-- OR REPLACE). Não altera dado nenhum ao ser criada — só define a função.
--
-- Recebe a mesa alvo e o payload JÁ REMAPEADO pelo cliente (systemSerializer:
-- desserializarSistema + montarPayloadImportacao — ids novos, refs consistentes,
-- sistema_id carimbado, modificadores achatados). Insere tudo numa ÚNICA
-- transação (a função é atômica: se qualquer passo falhar, nada é gravado).
-- Autorizada só para gestor da mesa (sou_gestor). Recusa se a mesa já tiver um
-- sistema (o app assume 1 sistema por mesa).
-- ============================================================================
CREATE OR REPLACE FUNCTION importar_sistema(p_mesa_id UUID, p_payload JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sid UUID := (p_payload->'sistema'->>'id')::uuid;
BEGIN
  IF NOT sou_gestor(p_mesa_id) THEN
    RAISE EXCEPTION 'Sem permissão para importar nesta mesa.';
  END IF;
  IF v_sid IS NULL THEN
    RAISE EXCEPTION 'Payload inválido: sistema.id ausente.';
  END IF;
  IF EXISTS (SELECT 1 FROM sistemas WHERE mesa_id = p_mesa_id) THEN
    RAISE EXCEPTION 'Esta mesa já tem um sistema. Remova-o antes de importar.';
  END IF;

  INSERT INTO sistemas (id, mesa_id, criador_id, nome, descricao, config_layout)
  VALUES (
    v_sid, p_mesa_id, auth.uid(),
    COALESCE(p_payload->'sistema'->>'nome', ''),
    p_payload->'sistema'->>'descricao',
    COALESCE(p_payload->'sistema'->'config_layout', '{}'::jsonb)
  );

  -- Ordem de inserção respeita as dependências (pais antes de filhos).
  INSERT INTO atributos         SELECT * FROM jsonb_populate_recordset(NULL::atributos,         COALESCE(p_payload->'atributos','[]'::jsonb));
  INSERT INTO linhas_poder      SELECT * FROM jsonb_populate_recordset(NULL::linhas_poder,      COALESCE(p_payload->'linhas_poder','[]'::jsonb));
  INSERT INTO pools             SELECT * FROM jsonb_populate_recordset(NULL::pools,             COALESCE(p_payload->'pools','[]'::jsonb));
  INSERT INTO categorias_item   SELECT * FROM jsonb_populate_recordset(NULL::categorias_item,   COALESCE(p_payload->'categorias_item','[]'::jsonb));
  INSERT INTO classes           SELECT * FROM jsonb_populate_recordset(NULL::classes,           COALESCE(p_payload->'classes','[]'::jsonb));
  INSERT INTO racas             SELECT * FROM jsonb_populate_recordset(NULL::racas,             COALESCE(p_payload->'racas','[]'::jsonb));
  INSERT INTO pericias          SELECT * FROM jsonb_populate_recordset(NULL::pericias,          COALESCE(p_payload->'pericias','[]'::jsonb));
  INSERT INTO habilidades       SELECT * FROM jsonb_populate_recordset(NULL::habilidades,       COALESCE(p_payload->'habilidades','[]'::jsonb));
  INSERT INTO poderes           SELECT * FROM jsonb_populate_recordset(NULL::poderes,           COALESCE(p_payload->'poderes','[]'::jsonb));
  INSERT INTO propriedades_item SELECT * FROM jsonb_populate_recordset(NULL::propriedades_item, COALESCE(p_payload->'propriedades_item','[]'::jsonb));
  INSERT INTO recompensas_nivel SELECT * FROM jsonb_populate_recordset(NULL::recompensas_nivel, COALESCE(p_payload->'recompensas_nivel','[]'::jsonb));
  INSERT INTO modificadores     SELECT * FROM jsonb_populate_recordset(NULL::modificadores,     COALESCE(p_payload->'modificadores','[]'::jsonb));

  UPDATE mesas SET sistema_id = v_sid WHERE id = p_mesa_id;

  RETURN v_sid;
END $$;

GRANT EXECUTE ON FUNCTION importar_sistema(UUID, JSONB) TO authenticated;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- A função existe:
--   SELECT proname, prosecdef FROM pg_proc WHERE proname = 'importar_sistema';

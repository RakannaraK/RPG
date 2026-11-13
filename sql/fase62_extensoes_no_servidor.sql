-- Fase 62 — instalar e remover extensão no servidor, um item por vez.
-- Antes o navegador lia a lista, alterava e gravava inteira (definir_extensoes): com dois mestres
-- mexendo ao mesmo tempo, uma instalação podia se perder. Agora a linha da mesa fica travada
-- durante a troca, então as duas alterações entram em fila.
-- Só acrescenta funções; não apaga nem altera nenhum dado. Pode rodar mais de uma vez.

CREATE OR REPLACE FUNCTION instalar_extensao(p_mesa_id UUID, p_item JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id    TEXT;
  v_lista JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT sou_gestor(p_mesa_id) THEN
    RAISE EXCEPTION 'Só o mestre ou co-mestre mexe nas extensões.' USING ERRCODE = '42501';
  END IF;

  -- item = id do catálogo (texto) ou pacote importado (objeto com "id")
  IF jsonb_typeof(p_item) = 'string' THEN
    v_id := p_item #>> '{}';
  ELSIF jsonb_typeof(p_item) = 'object' THEN
    v_id := p_item ->> 'id';
  END IF;
  IF v_id IS NULL OR v_id !~ '^[a-z0-9_-]{1,40}$' OR v_id = 'essencial' THEN
    RAISE EXCEPTION 'Extensão inválida.';
  END IF;
  IF octet_length(p_item::text) > 30000 THEN
    RAISE EXCEPTION 'Extensão grande demais.';
  END IF;

  -- trava a linha da mesa: duas instalações ao mesmo tempo entram em fila
  SELECT extensoes INTO v_lista FROM mesas WHERE id = p_mesa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa não encontrada.';
  END IF;
  IF v_lista IS NULL OR jsonb_typeof(v_lista) <> 'array' THEN
    v_lista := '[]'::jsonb;
  END IF;

  -- tira a versão antiga do mesmo id (reinstalar substitui) e põe a nova no fim
  SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb) INTO v_lista
  FROM jsonb_array_elements(v_lista) WITH ORDINALITY AS t(e, ord)
  WHERE COALESCE(CASE WHEN jsonb_typeof(e) = 'string' THEN e #>> '{}' ELSE e ->> 'id' END, '') <> v_id;

  IF jsonb_array_length(v_lista) >= 20 THEN
    RAISE EXCEPTION 'A mesa já tem o máximo de 20 extensões.';
  END IF;
  v_lista := v_lista || jsonb_build_array(p_item);
  IF octet_length(v_lista::text) > 300000 THEN
    RAISE EXCEPTION 'Extensões grandes demais.';
  END IF;

  UPDATE mesas SET extensoes = v_lista WHERE id = p_mesa_id;
  RETURN v_lista;
END
$$;

CREATE OR REPLACE FUNCTION remover_extensao(p_mesa_id UUID, p_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lista JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT sou_gestor(p_mesa_id) THEN
    RAISE EXCEPTION 'Só o mestre ou co-mestre mexe nas extensões.' USING ERRCODE = '42501';
  END IF;

  SELECT extensoes INTO v_lista FROM mesas WHERE id = p_mesa_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mesa não encontrada.';
  END IF;
  IF v_lista IS NULL OR jsonb_typeof(v_lista) <> 'array' THEN
    v_lista := '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(e ORDER BY ord), '[]'::jsonb) INTO v_lista
  FROM jsonb_array_elements(v_lista) WITH ORDINALITY AS t(e, ord)
  WHERE COALESCE(CASE WHEN jsonb_typeof(e) = 'string' THEN e #>> '{}' ELSE e ->> 'id' END, '') <> COALESCE(p_id, '');

  UPDATE mesas SET extensoes = v_lista WHERE id = p_mesa_id;
  RETURN v_lista;
END
$$;

REVOKE EXECUTE ON FUNCTION instalar_extensao(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION instalar_extensao(UUID, JSONB) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION remover_extensao(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION remover_extensao(UUID, TEXT) TO authenticated, service_role;

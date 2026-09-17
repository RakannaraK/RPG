-- ============================================================================
-- Segurança — funções do banco só para quem está logado (achado de 2026-09-17)
-- ----------------------------------------------------------------------------
-- Idempotente. Não apaga dados.
--
-- ACHADO: `expulsar_membro` podia ser chamada SEM LOGIN e expulsar qualquer
-- membro (menos o dono) de qualquer mesa, sabendo os dois IDs. Motivo: sem
-- login auth.uid() é NULL; `criador_id = NULL` dá NULL, e `IF NOT (NULL OR
-- false)` não dispara a exceção (NULL não é verdadeiro). As outras funções
-- foram revisadas e barram o NULL (NOT EXISTS / IS DISTINCT FROM / checagem
-- explícita); `sair_da_mesa` sem login não apaga nada.
--
-- Duas camadas:
--   1) corrige a lógica da expulsar_membro;
--   2) anônimo não executa NENHUMA função do schema public (o app só chama
--      funções logado). Funções de gatilho ficam de fora (não são chamáveis).
-- ============================================================================

-- ─── 1) expulsar_membro: NULL nunca passa ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.expulsar_membro(p_mesa_id uuid, p_usuario_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_sou_dono BOOLEAN; v_sou_comestre BOOLEAN; v_alvo_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  v_sou_dono := EXISTS (SELECT 1 FROM mesas WHERE id = p_mesa_id AND criador_id = auth.uid());
  v_sou_comestre := EXISTS (SELECT 1 FROM membros_mesa WHERE mesa_id = p_mesa_id AND usuario_id = auth.uid() AND role = 'co-mestre');
  SELECT role INTO v_alvo_role FROM membros_mesa WHERE mesa_id = p_mesa_id AND usuario_id = p_usuario_id;
  IF NOT (v_sou_dono OR v_sou_comestre) THEN RAISE EXCEPTION 'Sem permissão para expulsar.'; END IF;
  IF p_usuario_id = auth.uid() THEN RAISE EXCEPTION 'Use sair da mesa.'; END IF;
  IF v_alvo_role IS NULL THEN RAISE EXCEPTION 'Essa pessoa não é membro da mesa.'; END IF;
  IF v_alvo_role = 'mestre' THEN RAISE EXCEPTION 'Não é possível expulsar o dono da mesa.'; END IF;
  IF v_sou_comestre AND NOT v_sou_dono AND v_alvo_role = 'co-mestre' THEN
    RAISE EXCEPTION 'Co-mestre não pode expulsar outro co-mestre.'; END IF;
  DELETE FROM membros_mesa WHERE mesa_id = p_mesa_id AND usuario_id = p_usuario_id;
  INSERT INTO notificacoes (usuario_id, tipo, titulo, corpo, link)
  VALUES (p_usuario_id, 'removido_mesa', 'Você foi removido de uma mesa',
          (SELECT 'Mesa: ' || nome FROM mesas WHERE id = p_mesa_id), '/dashboard');
END; $function$;

-- ─── 2) Anônimo não executa funções do schema public ───────────────────────
DO $$
DECLARE f RECORD;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS assinatura
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_function_result(p.oid) NOT IN ('trigger', 'event_trigger')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.assinatura);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.assinatura);
  END LOOP;
END $$;

-- Funções criadas daqui em diante já nascem fechadas para anônimos
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE');
--   (esperado: só handle_new_user e rls_auto_enable — funções de gatilho)

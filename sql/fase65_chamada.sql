-- Fase 65 — chamada de voz e vídeo: canal PRIVADO do Realtime só para membros da mesa.
-- Só cria uma função e duas políticas; não apaga nem altera nenhum dado. Pode rodar mais de uma vez.
-- O tópico do canal é "chamada:<id da mesa>". Os canais públicos que o site já usa
-- (dados, presença, efeitos do mapa) não passam por estas políticas e continuam como estão.

CREATE OR REPLACE FUNCTION posso_entrar_na_chamada(p_topico TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  -- só aceita "chamada:" seguido de um uuid; qualquer outra coisa é recusada antes de converter
  IF p_topico IS NULL
     OR p_topico !~ '^chamada:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN FALSE;
  END IF;
  v_mesa := substring(p_topico FROM 9)::uuid;
  RETURN EXISTS (SELECT 1 FROM membros_mesa WHERE mesa_id = v_mesa AND usuario_id = auth.uid())
      OR EXISTS (SELECT 1 FROM mesas WHERE id = v_mesa AND criador_id = auth.uid());
END
$$;

REVOKE EXECUTE ON FUNCTION posso_entrar_na_chamada(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION posso_entrar_na_chamada(TEXT) TO authenticated, service_role;

-- Receber (ouvir sinalização e presença da chamada)
DROP POLICY IF EXISTS chamada_membros_recebem ON realtime.messages;
CREATE POLICY chamada_membros_recebem ON realtime.messages FOR SELECT TO authenticated
  USING (
    extension IN ('broadcast', 'presence')
    AND public.posso_entrar_na_chamada((SELECT realtime.topic()))
  );

-- Enviar (mandar sinalização e anunciar presença na chamada)
DROP POLICY IF EXISTS chamada_membros_enviam ON realtime.messages;
CREATE POLICY chamada_membros_enviam ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    extension IN ('broadcast', 'presence')
    AND public.posso_entrar_na_chamada((SELECT realtime.topic()))
  );

-- ============================================================================
-- Fase 19.3 — XP e subida de nível
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Retrocompatível: sistemas com progressao_xp.modo = 'nenhum' (o padrão para
-- quem nunca configurou) seguem funcionando exatamente como hoje.
-- ============================================================================

-- ─── 1) Coluna de XP na ficha ───────────────────────────────────────────────
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

-- ─── 2) RPC: adicionar XP ───────────────────────────────────────────────────
-- Dar XP na ficha de OUTRO jogador é escrita cross-user, então passa por
-- SECURITY DEFINER (padrão do projeto) em vez de UPDATE direto do cliente.
-- Autorizado: o DONO da ficha, ou um GESTOR da mesa (mestre / co-mestre / criador).
-- XP nunca fica negativo. Retorna o XP novo.
CREATE OR REPLACE FUNCTION adicionar_xp(p_ficha_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa_id UUID;
  v_dono_id UUID;
  v_novo    INTEGER;
BEGIN
  SELECT mesa_id, dono_id INTO v_mesa_id, v_dono_id
  FROM fichas WHERE id = p_ficha_id;

  IF v_mesa_id IS NULL THEN
    RAISE EXCEPTION 'Ficha não encontrada.';
  END IF;

  IF auth.uid() IS DISTINCT FROM v_dono_id
     AND NOT EXISTS (
       SELECT 1 FROM membros_mesa
       WHERE mesa_id = v_mesa_id
         AND usuario_id = auth.uid()
         AND role IN ('mestre', 'co-mestre')
     )
     AND NOT EXISTS (
       SELECT 1 FROM mesas WHERE id = v_mesa_id AND criador_id = auth.uid()
     )
  THEN
    RAISE EXCEPTION 'Você não pode alterar o XP desta ficha.';
  END IF;

  UPDATE fichas
     SET xp = GREATEST(0, COALESCE(xp, 0) + p_delta),
         updated_at = NOW()
   WHERE id = p_ficha_id
   RETURNING xp INTO v_novo;

  RETURN v_novo;
END;
$$;

GRANT EXECUTE ON FUNCTION adicionar_xp(UUID, INTEGER) TO authenticated;

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
-- (a) a coluna existe e está zerada nas fichas antigas:
--     SELECT id, nome_personagem, xp FROM fichas LIMIT 10;
-- (b) a RPC existe:
--     SELECT proname FROM pg_proc WHERE proname = 'adicionar_xp';
-- (c) teste rápido (numa ficha SUA): SELECT adicionar_xp('<ficha_id>', 50);
--     e depois SELECT adicionar_xp('<ficha_id>', -50); para voltar ao valor.

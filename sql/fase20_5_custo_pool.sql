-- ============================================================================
-- Fase 20.5 — Custo de pool em habilidades (transformações)
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Retrocompatível: `custo_pool` fica NULL nas habilidades existentes, e NULL
-- significa "sem custo" — nada muda para quem já usa recurso próprio (F10).
-- ============================================================================

-- ─── 1) Custo de pool na habilidade ─────────────────────────────────────────
-- [{ "pool_id": "…", "quantidade": "2", "por_turno": true }]
--   quantidade — texto, aceita fórmula (F17), igual ao custo de poder
--   por_turno  — custo recorrente enquanto a habilidade está ativa
ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS custo_pool JSONB;

-- ─── 2) RPC: cobrar o turno ─────────────────────────────────────────────────
-- Quem avança o turno no combate é o MESTRE, mas `pools_ficha` só aceita escrita
-- do dono da ficha. Cobrar o turno é escrita cross-user, então passa por
-- SECURITY DEFINER — mesmo padrão do adicionar_xp (Fase 19.3).
--
-- As QUANTIDADES podem ser fórmula (F17), e SQL não avalia fórmula. Por isso o
-- cliente (que já tem o contexto da ficha) calcula o plano com o motor puro
-- `planejarTurno` e manda aqui só o resultado:
--   p_debitos   = [{ "pool_id": "…", "atual": 24 }]   valor FINAL de cada pool
--   p_desativar = ids de habilidades_ficha que não conseguiram pagar
--
-- Autorizado: DONO da ficha, ou GESTOR da mesa (mestre / co-mestre / criador).
CREATE OR REPLACE FUNCTION pagar_custo_turno(
  p_ficha_id  UUID,
  p_debitos   JSONB   DEFAULT '[]'::jsonb,
  p_desativar UUID[]  DEFAULT '{}'::uuid[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa_id UUID;
  v_dono_id UUID;
  v_item    JSONB;
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
    RAISE EXCEPTION 'Você não pode pagar custos desta ficha.';
  END IF;

  -- Debita os pools (valor final já calculado pelo cliente; nunca negativo)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_debitos)
  LOOP
    INSERT INTO pools_ficha (ficha_id, pool_id, atual)
    VALUES (
      p_ficha_id,
      (v_item->>'pool_id')::uuid,
      GREATEST(0, (v_item->>'atual')::int)
    )
    ON CONFLICT (ficha_id, pool_id)
    DO UPDATE SET atual = EXCLUDED.atual;
  END LOOP;

  -- Desativa quem não conseguiu pagar o turno
  IF array_length(p_desativar, 1) IS NOT NULL THEN
    UPDATE habilidades_ficha
       SET ativa = FALSE
     WHERE ficha_id = p_ficha_id
       AND id = ANY(p_desativar);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION pagar_custo_turno(UUID, JSONB, UUID[]) TO authenticated;

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
-- (a) a coluna existe e está NULL em tudo que já existia:
--     SELECT COUNT(*) AS total, COUNT(custo_pool) AS com_custo FROM habilidades;
--
-- (b) a RPC existe:
--     SELECT proname FROM pg_proc WHERE proname = 'pagar_custo_turno';
--
-- (c) teste seco numa ficha SUA (não muda nada se passar lista vazia):
--     SELECT pagar_custo_turno('<ficha_id>');

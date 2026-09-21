-- ============================================================================
-- Fase 32 — Combate avançado: recarga, ultimate, efeito por rodada, reserva
-- ----------------------------------------------------------------------------
-- Idempotente. Só ACRESCENTA colunas (com padrão que mantém tudo como está) e
-- uma função. Nenhuma política muda; nada é apagado.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL OR to_regprocedure('pode_editar_ficha(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor(uuid) (F16) / pode_editar_ficha(uuid) (F30).';
  END IF;
END $$;

-- ─── 1) Habilidade: recarga em turnos e carga de ultimate ───────────────────
ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS recarga_turnos   INTEGER;  -- NULL = sem recarga
ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS carga_max        INTEGER;  -- NULL = não é ultimate
ALTER TABLE habilidades ADD COLUMN IF NOT EXISTS carga_por_rodada INTEGER;  -- ganho automático por rodada

ALTER TABLE habilidades_ficha ADD COLUMN IF NOT EXISTS recarga_restante INTEGER;          -- NULL = pronta
ALTER TABLE habilidades_ficha ADD COLUMN IF NOT EXISTS carga_atual      INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_recarga_carga_validas') THEN
    ALTER TABLE habilidades ADD CONSTRAINT habilidades_recarga_carga_validas CHECK (
      (recarga_turnos IS NULL OR recarga_turnos >= 0)
      AND (carga_max IS NULL OR carga_max > 0)
      AND (carga_por_rodada IS NULL OR carga_por_rodada >= 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_ficha_recarga_carga_validas') THEN
    ALTER TABLE habilidades_ficha ADD CONSTRAINT habilidades_ficha_recarga_carga_validas CHECK (
      (recarga_restante IS NULL OR recarga_restante >= 0) AND carga_atual >= 0
    );
  END IF;
END $$;

-- ─── 2) Condição com efeito por rodada (veneno, regeneração, queimando) ─────
-- { tipo: 'dano'|'cura', notacao: '1d4', valor: 3 } — notação rola; valor é fixo.
ALTER TABLE condicoes_ativas ADD COLUMN IF NOT EXISTS efeito_turno JSONB;

-- ─── 3) Reserva: combatente no banco, fora da ordem de iniciativa ───────────
ALTER TABLE combatentes ADD COLUMN IF NOT EXISTS reserva BOOLEAN NOT NULL DEFAULT false;

-- ─── 4) Virar o turno de UMA ficha: recarga −1, carga +ganho ────────────────
-- Precisa de DEFINER: quem avança o turno é o mestre, e ele não escreve em
-- habilidades_ficha alheia (mesma razão de pagar_custo_turno, F20.5).
CREATE OR REPLACE FUNCTION avancar_turno_ficha(p_ficha_id UUID)
RETURNS TABLE (habilidade_id UUID, recarga_restante INTEGER, carga_atual INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mesa UUID;
  v_dono UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  SELECT f.mesa_id, f.dono_id INTO v_mesa, v_dono FROM fichas f WHERE f.id = p_ficha_id;
  IF v_mesa IS NULL THEN
    RAISE EXCEPTION 'Ficha não encontrada.';
  END IF;
  IF NOT (sou_gestor(v_mesa) OR v_dono = auth.uid() OR pode_editar_ficha(p_ficha_id)) THEN
    RAISE EXCEPTION 'Sem permissão para virar o turno desta ficha.' USING ERRCODE = '42501';
  END IF;

  -- Recarga: desce 1; ao chegar a zero volta a NULL (pronta)
  UPDATE habilidades_ficha hf
     SET recarga_restante = CASE WHEN hf.recarga_restante <= 1 THEN NULL ELSE hf.recarga_restante - 1 END
   WHERE hf.ficha_id = p_ficha_id AND hf.recarga_restante IS NOT NULL;

  -- Ultimate: soma o ganho por rodada, com teto na carga máxima
  UPDATE habilidades_ficha hf
     SET carga_atual = LEAST(h.carga_max, hf.carga_atual + h.carga_por_rodada)
    FROM habilidades h
   WHERE h.id = hf.habilidade_id
     AND hf.ficha_id = p_ficha_id
     AND COALESCE(h.carga_por_rodada, 0) > 0
     AND COALESCE(h.carga_max, 0) > 0
     AND hf.carga_atual < h.carga_max;

  RETURN QUERY
    SELECT hf.habilidade_id, hf.recarga_restante, hf.carga_atual
      FROM habilidades_ficha hf
     WHERE hf.ficha_id = p_ficha_id;
END $$;

REVOKE EXECUTE ON FUNCTION avancar_turno_ficha(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION avancar_turno_ficha(UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
--   SELECT count(*) FROM habilidades WHERE recarga_turnos IS NOT NULL OR carga_max IS NOT NULL;
--   SELECT count(*) FROM combatentes WHERE reserva;

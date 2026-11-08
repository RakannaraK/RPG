-- Fase 53 — Combate em área, vários alvos, barras afetadas e responsável por combatente.
-- Só acréscimo. Roda inteiro numa transação (psql --single-transaction).
-- Pré-requisitos: sou_gestor(uuid), pode_escrever_mesa(uuid) (Fase 16), pode_editar_ficha(uuid) (Fase 30),
-- pools_ficha (Fase 20.1), fichas.forma_de_id (Fase 33), combatentes.reserva (Fase 32).

DO $$ BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL
     OR to_regprocedure('pode_escrever_mesa(uuid)') IS NULL
     OR to_regclass('public.pools_ficha') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor/pode_escrever_mesa (Fase 16) ou pools_ficha (Fase 20.1).';
  END IF;
END $$;

-- 1. Responsável: membro da mesa que age por este combatente (NPC, criatura, aliado).
--    Só o gestor muda (política ALL de gestor em combatentes, já existente).
ALTER TABLE combatentes
  ADD COLUMN IF NOT EXISTS controlador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Participa do encontro = gestor da mesa, ou dono/editor/responsável de algum combatente
--    em jogo (fora da reserva) deste encontro ATIVO, numa mesa onde pode escrever.
CREATE OR REPLACE FUNCTION participo_do_encontro(p_encontro_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM encontros e
    WHERE e.id = p_encontro_id
      AND e.ativo
      AND pode_escrever_mesa(e.mesa_id)
      AND (
        sou_gestor(e.mesa_id)
        OR EXISTS (
          SELECT 1
          FROM combatentes c
          LEFT JOIN fichas f ON f.id = c.ficha_id
          WHERE c.encontro_id = e.id
            AND NOT COALESCE(c.reserva, false)
            AND (c.controlador_id = auth.uid()
                 OR f.dono_id = auth.uid()
                 OR auth.uid() = ANY (COALESCE(f.editores, '{}')))
        )
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION participo_do_encontro(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION participo_do_encontro(UUID) TO authenticated, service_role;

-- 3. Aplica o resultado de UMA ação (dano ou cura) em vários alvos do mesmo encontro.
--    Os valores novos chegam calculados pelo cliente (mesma regra de useAplicarHp: vida
--    temporária primeiro, cura limitada ao máximo). Aqui se valida QUEM aplica e ONDE.
--    p_alvos = [{ "combatente_id": uuid,
--                 "ficha_id": uuid | null,      -- ficha do alvo ou a forma ativa dela; null = vida no combatente
--                 "hp": int | null, "temp": int | null,
--                 "pools": [{ "pool_id": uuid, "atual": int }] }]
--    ponytail: qualquer participante pode aplicar em qualquer combatente do encontro (mesa de
--    confiança, tudo vai ao feed). Se precisar travar por turno, checar o dono da vez aqui.
CREATE OR REPLACE FUNCTION aplicar_resultado_combate(p_encontro_id UUID, p_alvos JSONB)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a JSONB;
  p JSONB;
  v_comb combatentes%ROWTYPE;
  v_ficha UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É preciso estar logado.';
  END IF;
  IF NOT participo_do_encontro(p_encontro_id) THEN
    RAISE EXCEPTION 'Você não participa deste combate.';
  END IF;
  IF p_alvos IS NULL OR jsonb_typeof(p_alvos) <> 'array' OR jsonb_array_length(p_alvos) > 100 THEN
    RAISE EXCEPTION 'Lista de alvos inválida.';
  END IF;

  FOR a IN SELECT value FROM jsonb_array_elements(p_alvos) LOOP
    SELECT * INTO v_comb FROM combatentes
     WHERE id = (a->>'combatente_id')::uuid AND encontro_id = p_encontro_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Alvo fora deste combate.';
    END IF;

    v_ficha := NULLIF(a->>'ficha_id', '')::uuid;

    IF v_ficha IS NOT NULL THEN
      IF v_comb.ficha_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM fichas f
         WHERE f.id = v_ficha
           AND (f.id = v_comb.ficha_id OR f.forma_de_id = v_comb.ficha_id)
      ) THEN
        RAISE EXCEPTION 'A ficha não pertence a este alvo.';
      END IF;

      IF jsonb_typeof(a->'hp') = 'number' THEN
        UPDATE fichas SET hp_atual = GREATEST(0, (a->>'hp')::int) WHERE id = v_ficha;
      END IF;
      IF jsonb_typeof(a->'temp') = 'number' THEN
        UPDATE fichas SET vida_temp_atual = GREATEST(0, (a->>'temp')::int) WHERE id = v_ficha;
      END IF;

      FOR p IN SELECT value FROM jsonb_array_elements(COALESCE(a->'pools', '[]'::jsonb)) LOOP
        INSERT INTO pools_ficha (ficha_id, pool_id, atual)
        VALUES (v_ficha, (p->>'pool_id')::uuid, GREATEST(0, (p->>'atual')::int))
        ON CONFLICT (ficha_id, pool_id) DO UPDATE SET atual = EXCLUDED.atual;
      END LOOP;

    ELSIF jsonb_typeof(a->'hp') = 'number' THEN
      UPDATE combatentes SET hp_atual = GREATEST(0, (a->>'hp')::int) WHERE id = v_comb.id;
    END IF;
  END LOOP;
END
$$;
REVOKE EXECUTE ON FUNCTION aplicar_resultado_combate(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION aplicar_resultado_combate(UUID, JSONB) TO authenticated, service_role;

-- Fase 49 — Baú do grupo e passar item entre personagens.
-- Aditivo: nova coluna, `ficha_id` passa a aceitar vazio (só no baú), novas
-- políticas e funções. Nada é apagado.
--
-- Item do baú é o MESMO registro de itens_ficha, só que sem ficha e com a mesa
-- em `bau_mesa_id`. Mover (em vez de apagar e recriar) mantém o id — e a
-- maestria ligada ao item (maestrias_ficha.item_id, ON DELETE CASCADE) não se perde.

ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS bau_mesa_id uuid REFERENCES mesas(id) ON DELETE CASCADE;
ALTER TABLE itens_ficha ALTER COLUMN ficha_id DROP NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itens_ficha_dono_ou_bau') THEN
    -- sempre exatamente um: numa ficha OU no baú de uma mesa
    ALTER TABLE itens_ficha ADD CONSTRAINT itens_ficha_dono_ou_bau
      CHECK ((ficha_id IS NULL) <> (bau_mesa_id IS NULL));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS itens_ficha_bau ON itens_ficha (bau_mesa_id) WHERE bau_mesa_id IS NOT NULL;

-- As políticas antigas olham só ficha_id: item do baú (ficha_id nulo) fica fora
-- delas. Estas cuidam do baú: quem participa vê; quem gere a mesa põe e tira
-- direto (o saque). Jogador mexe pelo baú só pelas funções abaixo.
DROP POLICY IF EXISTS bau_membros_veem ON itens_ficha;
CREATE POLICY bau_membros_veem ON itens_ficha FOR SELECT
  USING (bau_mesa_id IN (SELECT minhas_mesas()));
DROP POLICY IF EXISTS bau_gestor ON itens_ficha;
CREATE POLICY bau_gestor ON itens_ficha FOR ALL
  USING (bau_mesa_id IS NOT NULL AND sou_gestor(bau_mesa_id))
  WITH CHECK (bau_mesa_id IS NOT NULL AND ficha_id IS NULL AND sou_gestor(bau_mesa_id));

-- quem pode mexer nos itens da ficha: dono ou editor, numa mesa em que pode escrever
CREATE OR REPLACE FUNCTION posso_mexer_na_ficha(p_ficha_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM fichas f
     WHERE f.id = p_ficha_id
       AND (f.dono_id = auth.uid() OR auth.uid() = ANY (f.editores))
       AND pode_escrever_mesa(f.mesa_id))
$$;
REVOKE ALL ON FUNCTION posso_mexer_na_ficha(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION posso_mexer_na_ficha(uuid) TO authenticated;

-- Ficha -> baú da mesa dela
CREATE OR REPLACE FUNCTION guardar_no_bau(p_item_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ficha uuid; v_mesa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  SELECT i.ficha_id, f.mesa_id INTO v_ficha, v_mesa
    FROM itens_ficha i JOIN fichas f ON f.id = i.ficha_id WHERE i.id = p_item_id;
  IF v_ficha IS NULL OR NOT posso_mexer_na_ficha(v_ficha) THEN
    RAISE EXCEPTION 'Você não pode mexer neste item.';
  END IF;
  UPDATE itens_ficha SET ficha_id = NULL, bau_mesa_id = v_mesa, equipado = false WHERE id = p_item_id;
END $$;

-- Baú -> uma ficha minha da mesma mesa
CREATE OR REPLACE FUNCTION pegar_do_bau(p_item_id uuid, p_ficha_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mesa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  SELECT bau_mesa_id INTO v_mesa FROM itens_ficha WHERE id = p_item_id;
  IF v_mesa IS NULL THEN RAISE EXCEPTION 'Este item não está no baú.'; END IF;
  IF NOT posso_mexer_na_ficha(p_ficha_id)
     OR NOT EXISTS (SELECT 1 FROM fichas WHERE id = p_ficha_id AND mesa_id = v_mesa) THEN
    RAISE EXCEPTION 'Escolha uma ficha sua desta mesa.';
  END IF;
  UPDATE itens_ficha SET bau_mesa_id = NULL, ficha_id = p_ficha_id, equipado = false WHERE id = p_item_id;
END $$;

-- Ficha minha -> qualquer ficha da mesma mesa (dar não precisa de licença de quem recebe)
CREATE OR REPLACE FUNCTION dar_item(p_item_id uuid, p_ficha_destino uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ficha uuid; v_mesa uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  SELECT i.ficha_id, f.mesa_id INTO v_ficha, v_mesa
    FROM itens_ficha i JOIN fichas f ON f.id = i.ficha_id WHERE i.id = p_item_id;
  IF v_ficha IS NULL OR NOT posso_mexer_na_ficha(v_ficha) THEN
    RAISE EXCEPTION 'Você não pode mexer neste item.';
  END IF;
  IF p_ficha_destino = v_ficha
     OR NOT EXISTS (SELECT 1 FROM fichas WHERE id = p_ficha_destino AND mesa_id = v_mesa) THEN
    RAISE EXCEPTION 'Escolha outra ficha desta mesa.';
  END IF;
  UPDATE itens_ficha SET ficha_id = p_ficha_destino, equipado = false WHERE id = p_item_id;
END $$;

REVOKE ALL ON FUNCTION guardar_no_bau(uuid), pegar_do_bau(uuid, uuid), dar_item(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION guardar_no_bau(uuid), pegar_do_bau(uuid, uuid), dar_item(uuid, uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'itens_ficha') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_ficha;
  END IF;
END $$;

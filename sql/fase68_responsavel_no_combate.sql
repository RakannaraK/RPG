-- Fase 68 — o responsável por uma criatura no combate (F53) lê as armas e os atributos dela.
-- Só acrescenta uma função e duas regras de leitura; não apaga nem altera nenhum dado nem regra. Pode rodar mais de uma vez.
-- Antes, o jogador escolhido como responsável (combatentes.controlador_id) por uma criatura PRIVADA do mestre
-- não lia os itens nem os atributos dela, e ficava sem as armas ao agir. Agora lê, só enquanto o combate
-- estiver ativo e ele não estiver na reserva. São só as duas tabelas que a tela de ação do combate usa
-- (AcoesCombate: itens_ficha e valores_atributos); o resto da ficha continua escondido.

CREATE OR REPLACE FUNCTION controlo_no_combate(p_ficha_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
      FROM combatentes c
      JOIN encontros e ON e.id = c.encontro_id
     WHERE c.ficha_id = p_ficha_id
       AND c.controlador_id = auth.uid()
       AND e.ativo
       AND NOT COALESCE(c.reserva, false)
  )
$$;

REVOKE EXECUTE ON FUNCTION controlo_no_combate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION controlo_no_combate(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS itens_responsavel_no_combate ON itens_ficha;
CREATE POLICY itens_responsavel_no_combate ON itens_ficha FOR SELECT TO authenticated
  USING (controlo_no_combate(ficha_id));

DROP POLICY IF EXISTS valores_responsavel_no_combate ON valores_atributos;
CREATE POLICY valores_responsavel_no_combate ON valores_atributos FOR SELECT TO authenticated
  USING (controlo_no_combate(ficha_id));

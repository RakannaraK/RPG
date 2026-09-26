-- Fase 51 — Mesas abertas: vitrine de mesas procurando jogadores + pedido de vaga.
-- Aditivo: tabelas e funções novas. Nada é apagado. Sem pagamento de nenhum tipo.
--
-- O código de convite NUNCA aparece na vitrine: quem se interessa pede uma vaga,
-- e quem gere a mesa aceita ou recusa. `mesas_abertas()` é a 3ª função liberada
-- ao anônimo (depois de overlay_dados e vitrine_publica), de propósito: a vitrine
-- existe para quem ainda não tem conta. Ela devolve só o que está no anúncio.

CREATE TABLE IF NOT EXISTS anuncios_mesa (
  mesa_id      uuid PRIMARY KEY REFERENCES mesas(id) ON DELETE CASCADE,
  ativo        boolean NOT NULL DEFAULT true,
  sistema      text CHECK (sistema IS NULL OR char_length(sistema) <= 60),
  quando       text CHECK (quando IS NULL OR char_length(quando) <= 120),
  vagas        integer NOT NULL DEFAULT 1 CHECK (vagas BETWEEN 0 AND 20),
  iniciantes   boolean NOT NULL DEFAULT false,
  descricao    text NOT NULL CHECK (char_length(btrim(descricao)) BETWEEN 1 AND 1000),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pedidos_mesa (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id       uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          text NOT NULL,  -- como a pessoa aparece (quem gere ainda não é "colega" dela)
  mensagem      text CHECK (mensagem IS NULL OR char_length(mensagem) <= 500),
  status        text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceito', 'recusado')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz,
  UNIQUE (mesa_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS pedidos_mesa_pendentes ON pedidos_mesa (mesa_id) WHERE status = 'pendente';

ALTER TABLE anuncios_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos_mesa ENABLE ROW LEVEL SECURITY;

-- anúncio: quem gere a mesa escreve; a leitura pública é só pela função
DROP POLICY IF EXISTS anuncio_gestor ON anuncios_mesa;
CREATE POLICY anuncio_gestor ON anuncios_mesa FOR ALL
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));

-- pedido: a pessoa vê e cancela o seu; quem gere vê os da mesa. Criar e
-- responder é só pelas funções (checam anúncio, vaga, membro, aviso).
DROP POLICY IF EXISTS pedido_proprio ON pedidos_mesa;
CREATE POLICY pedido_proprio ON pedidos_mesa FOR SELECT USING (usuario_id = auth.uid());
DROP POLICY IF EXISTS pedido_cancelar ON pedidos_mesa;
CREATE POLICY pedido_cancelar ON pedidos_mesa FOR DELETE USING (usuario_id = auth.uid() AND status = 'pendente');
DROP POLICY IF EXISTS pedido_gestor_ve ON pedidos_mesa;
CREATE POLICY pedido_gestor_ve ON pedidos_mesa FOR SELECT USING (sou_gestor(mesa_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON anuncios_mesa TO authenticated;
GRANT SELECT, DELETE ON pedidos_mesa TO authenticated;
REVOKE ALL ON anuncios_mesa, pedidos_mesa FROM anon;

-- Vitrine pública: só o que está no anúncio (nada de convite, dono ou membros)
CREATE OR REPLACE FUNCTION mesas_abertas()
RETURNS TABLE (mesa_id uuid, nome text, capa jsonb, sistema text, quando text, vagas integer,
               iniciantes boolean, descricao text, jogadores integer, atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.nome, to_jsonb(m.capa), a.sistema, a.quando, a.vagas, a.iniciantes, a.descricao,
         (SELECT count(*)::integer FROM membros_mesa mm WHERE mm.mesa_id = m.id AND mm.role IN ('jogador', 'co-mestre')),
         a.updated_at
    FROM anuncios_mesa a JOIN mesas m ON m.id = a.mesa_id
   WHERE a.ativo AND a.vagas > 0 AND m.arquivada IS NOT TRUE
   ORDER BY a.updated_at DESC
   LIMIT 100
$$;
REVOKE ALL ON FUNCTION mesas_abertas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mesas_abertas() TO anon, authenticated;

-- Pedir uma vaga: logado com conta (convidado não), mesa anunciada, ainda não membro
CREATE OR REPLACE FUNCTION pedir_vaga(p_mesa_id uuid, p_mensagem text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_nome text; v_mesa text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  IF coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Crie uma conta para pedir vaga em outra mesa.';
  END IF;
  SELECT m.nome INTO v_mesa FROM anuncios_mesa a JOIN mesas m ON m.id = a.mesa_id
   WHERE a.mesa_id = p_mesa_id AND a.ativo AND a.vagas > 0 AND m.arquivada IS NOT TRUE;
  IF v_mesa IS NULL THEN RAISE EXCEPTION 'Esta mesa não está procurando jogadores agora.'; END IF;
  IF EXISTS (SELECT 1 FROM membros_mesa WHERE mesa_id = p_mesa_id AND usuario_id = v_uid) THEN
    RAISE EXCEPTION 'Você já está nesta mesa.';
  END IF;
  SELECT coalesce(username, 'Jogador') INTO v_nome FROM profiles WHERE id = v_uid;
  BEGIN
    INSERT INTO pedidos_mesa (mesa_id, usuario_id, nome, mensagem)
    VALUES (p_mesa_id, v_uid, coalesce(v_nome, 'Jogador'), nullif(left(btrim(coalesce(p_mensagem, '')), 500), ''));
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já pediu vaga nesta mesa.';
  END;
  -- avisa quem gere (dono e co-mestres)
  INSERT INTO notificacoes (usuario_id, tipo, titulo, corpo, link)
  SELECT g.usuario_id, 'pedido_vaga', 'Pedido de vaga', coalesce(v_nome, 'Alguém') || ' quer jogar em ' || v_mesa,
         '/mesa/' || p_mesa_id || '?aba=Membros'
    FROM (SELECT criador_id AS usuario_id FROM mesas WHERE id = p_mesa_id
          UNION SELECT usuario_id FROM membros_mesa WHERE mesa_id = p_mesa_id AND role = 'co-mestre') g;
END $$;

-- Responder: só quem gere. Aceitar põe como jogador e gasta uma vaga (a última fecha o anúncio).
CREATE OR REPLACE FUNCTION responder_pedido(p_pedido_id uuid, p_aceitar boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mesa uuid; v_usuario uuid; v_nome_mesa text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  SELECT p.mesa_id, p.usuario_id, m.nome INTO v_mesa, v_usuario, v_nome_mesa
    FROM pedidos_mesa p JOIN mesas m ON m.id = p.mesa_id
   WHERE p.id = p_pedido_id AND p.status = 'pendente';
  IF v_mesa IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado ou já respondido.'; END IF;
  IF NOT sou_gestor(v_mesa) THEN RAISE EXCEPTION 'Só quem gere a mesa responde pedidos.'; END IF;

  UPDATE pedidos_mesa SET status = CASE WHEN p_aceitar THEN 'aceito' ELSE 'recusado' END, respondido_em = now()
   WHERE id = p_pedido_id;
  IF p_aceitar THEN
    INSERT INTO membros_mesa (mesa_id, usuario_id, role) VALUES (v_mesa, v_usuario, 'jogador')
    ON CONFLICT DO NOTHING;
    UPDATE anuncios_mesa SET vagas = greatest(vagas - 1, 0), ativo = (vagas - 1) > 0, updated_at = now()
     WHERE mesa_id = v_mesa;
  END IF;
  INSERT INTO notificacoes (usuario_id, tipo, titulo, corpo, link)
  VALUES (v_usuario, 'pedido_vaga',
          CASE WHEN p_aceitar THEN 'Você entrou numa mesa!' ELSE 'Pedido de vaga não aceito' END,
          v_nome_mesa,
          CASE WHEN p_aceitar THEN '/mesa/' || v_mesa ELSE '/comunidade' END);
END $$;

REVOKE ALL ON FUNCTION pedir_vaga(uuid, text), responder_pedido(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pedir_vaga(uuid, text), responder_pedido(uuid, boolean) TO authenticated;

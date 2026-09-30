-- Melhorias de segurança (item 5 da auditoria de 2026-09). Aditivo: nada é apagado
-- (fora a limpeza automática de tentativas de convite com mais de 1 dia).

-- ═══ 1) Rolagens sorteadas no SERVIDOR ═══════════════════════════════════════
-- Antes o navegador sorteava e mandava o resultado pronto: quem soubesse usar a
-- API gravava o número que quisesse. Agora `rolar_notacao` sorteia no banco e
-- carimba a rolagem com `verificada = true`. O site não consegue carimbar sozinho
-- (gatilho abaixo), então uma rolagem forjada aparece SEM o selo no feed.

ALTER TABLE rolagens ADD COLUMN IF NOT EXISTS verificada boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION rolagem_sem_selo() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- vindo do site (authenticated/anon) nunca é verificada; a função abaixo roda
  -- como dono do banco e pode carimbar
  IF current_user IN ('authenticated', 'anon') THEN NEW.verificada := false; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rolagem_sem_selo ON rolagens;
CREATE TRIGGER rolagem_sem_selo BEFORE INSERT OR UPDATE ON rolagens
  FOR EACH ROW EXECUTE FUNCTION rolagem_sem_selo();

-- Mesma notação do site (lib/diceNotation.js): grupos NdM, NdMkhK, NdMklK e números.
-- p_extras: { skin, som, critico: {multiplicador, modo}, percentual } — o que muda
-- o total fica gravado e aparece no feed.
CREATE OR REPLACE FUNCTION rolar_notacao(p_mesa_id uuid, p_notacao text, p_rotulo text DEFAULT NULL,
                                         p_ficha_id uuid DEFAULT NULL, p_sessao_id uuid DEFAULT NULL,
                                         p_extras jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  n text := lower(regexp_replace(coalesce(p_notacao, ''), '\s', '', 'g'));
  m text[]; g text[];
  v_qtd int; v_lados int; v_tipo text; v_keep int; v_total_dados int := 0;
  v_rolls int[]; v_ord int[]; v_mantidos_idx int[];
  v_dados jsonb := '[]'; v_ind jsonb := '[]'; v_man jsonb := '[]'; v_desc jsonb := '[]';
  v_mod int := 0; v_soma int := 0; v_total int; v_antes int;
  v_mult numeric; v_modo text; v_perc numeric; v_crit jsonb; v_res jsonb; v_extra jsonb;
  v_nome text; v_sessao uuid := p_sessao_id; i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'É preciso estar logado.'; END IF;
  IF NOT pode_escrever_mesa(p_mesa_id) THEN RAISE EXCEPTION 'Você não pode rolar nesta mesa.'; END IF;
  IF p_ficha_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM fichas WHERE id = p_ficha_id AND mesa_id = p_mesa_id) THEN
    RAISE EXCEPTION 'Essa ficha não é desta mesa.';
  END IF;
  IF v_sessao IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sessoes WHERE id = v_sessao AND mesa_id = p_mesa_id) THEN
    v_sessao := NULL;
  END IF;
  IF length(n) > 200 OR n !~ '^[+-]?(\d+d\d+((kh|kl)\d+)?|\d+)([+-](\d+d\d+((kh|kl)\d+)?|\d+))*$' THEN
    RAISE EXCEPTION 'Notação inválida: "%"', p_notacao;
  END IF;

  FOR m IN SELECT regexp_matches(n, '([+-]?)(\d+d\d+(?:(?:kh|kl)\d+)?|\d+)', 'g') LOOP
    IF position('d' IN m[2]) = 0 THEN
      IF length(m[2]) > 6 THEN RAISE EXCEPTION 'Número grande demais na notação.'; END IF;
      v_mod := v_mod + (CASE WHEN m[1] = '-' THEN -1 ELSE 1 END) * m[2]::int;
      CONTINUE;
    END IF;
    g := regexp_match(m[2], '^(\d{1,4})d(\d{1,5})(?:(kh|kl)(\d{1,4}))?$');
    IF g IS NULL THEN RAISE EXCEPTION 'Grupo de dados grande demais: %', m[2]; END IF;
    v_qtd := g[1]::int; v_lados := g[2]::int; v_tipo := g[3]; v_keep := g[4]::int;
    IF v_qtd < 1 OR v_qtd > 200 THEN RAISE EXCEPTION 'Quantidade de dados inválida: %', v_qtd; END IF;
    IF v_lados < 2 OR v_lados > 10000 THEN RAISE EXCEPTION 'Número de lados inválido: %', v_lados; END IF;
    IF v_keep IS NOT NULL AND (v_keep < 1 OR v_keep > v_qtd) THEN
      RAISE EXCEPTION 'kh/kl inválido: não é possível manter % de % dados', v_keep, v_qtd;
    END IF;
    v_total_dados := v_total_dados + v_qtd;
    IF v_total_dados > 500 THEN RAISE EXCEPTION 'Dados demais numa rolagem só (máximo 500).'; END IF;

    v_rolls := ARRAY(SELECT 1 + floor(random() * v_lados)::int FROM generate_series(1, v_qtd));
    FOR i IN 1..v_qtd LOOP v_ind := v_ind || to_jsonb(v_rolls[i]); END LOOP;
    IF v_tipo IS NULL THEN
      v_mantidos_idx := ARRAY(SELECT generate_series(1, v_qtd));
      FOR i IN 1..v_qtd LOOP v_man := v_man || to_jsonb(v_rolls[i]); v_soma := v_soma + v_rolls[i]; END LOOP;
    ELSE
      -- como no site: ordena por valor (empate: ordem de rolagem) e fica com os de cima/baixo
      v_ord := ARRAY(SELECT t.i::int FROM unnest(v_rolls) WITH ORDINALITY AS t(v, i) ORDER BY t.v, t.i);
      v_mantidos_idx := CASE WHEN v_tipo = 'kh' THEN v_ord[v_qtd - v_keep + 1 : v_qtd] ELSE v_ord[1 : v_keep] END;
      FOR i IN 1..v_qtd LOOP
        IF v_ord[i] = ANY (v_mantidos_idx) THEN
          v_man := v_man || to_jsonb(v_rolls[v_ord[i]]); v_soma := v_soma + v_rolls[v_ord[i]];
        ELSE
          v_desc := v_desc || to_jsonb(v_rolls[v_ord[i]]);
        END IF;
      END LOOP;
    END IF;
    FOR i IN 1..v_qtd LOOP
      v_dados := v_dados || jsonb_build_object('lados', v_lados, 'valor', v_rolls[i], 'descartado', NOT (i = ANY (v_mantidos_idx)));
    END LOOP;
  END LOOP;

  v_total := v_soma + v_mod;
  v_res := jsonb_build_object('notacao', n, 'dados', v_dados, 'individuais', v_ind, 'mantidos', v_man,
                              'descartados', v_desc, 'modificador', v_mod);

  -- crítico (F22.4): dados+fixos × multiplicador, antes do percentual
  IF jsonb_typeof(p_extras -> 'critico') = 'object' THEN
    v_mult := least(greatest(coalesce((p_extras #>> '{critico,multiplicador}')::numeric, 1), 1), 10);
    v_modo := CASE WHEN p_extras #>> '{critico,modo}' = 'dados' THEN 'dados' ELSE 'total' END;
    v_antes := v_total;
    v_total := floor(CASE WHEN v_modo = 'dados' THEN v_soma * v_mult + v_mod ELSE v_total * v_mult END)::int;
    v_crit := jsonb_build_object('multiplicador', v_mult, 'modo', v_modo, 'antes', v_antes);
    v_res := v_res || jsonb_build_object('critico', v_crit);
  END IF;
  -- percentual de rolagem (F18.3): sobre o total, com piso
  v_perc := least(greatest(coalesce((p_extras ->> 'percentual')::numeric, 0), -100), 1000);
  IF v_perc <> 0 THEN
    v_res := v_res || jsonb_build_object('percentual', v_perc, 'total_base', v_total);
    v_total := floor(v_total * (100 + v_perc) / 100)::int;
  END IF;
  v_res := v_res || jsonb_build_object('total', v_total);

  SELECT coalesce(nullif(mm.apelido, ''), p.username, 'Jogador') INTO v_nome
    FROM profiles p LEFT JOIN membros_mesa mm ON mm.usuario_id = p.id AND mm.mesa_id = p_mesa_id
   WHERE p.id = v_uid;
  v_extra := jsonb_strip_nulls(jsonb_build_object(
    'skin', left(p_extras ->> 'skin', 30),
    'som', CASE WHEN jsonb_typeof(p_extras -> 'som') = 'object' AND length((p_extras -> 'som')::text) < 500 THEN p_extras -> 'som' END));

  INSERT INTO rolagens (mesa_id, autor_id, autor_nome, ficha_id, rotulo, notacao, resultados, total, sessao_id, verificada)
  VALUES (p_mesa_id, v_uid, coalesce(v_nome, 'Jogador'), p_ficha_id, left(p_rotulo, 200), n,
          (v_res - 'notacao' - 'total') || v_extra, v_total, v_sessao, true);
  RETURN v_res;
END $$;
REVOKE ALL ON FUNCTION rolar_notacao(uuid, text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION rolar_notacao(uuid, text, text, uuid, uuid, jsonb) TO authenticated;

-- ═══ 2) Código de convite mais longo + limite de tentativas ═════════════════
-- 12 caracteres aleatórios (os 12 primeiros de um UUID v4 são todos sorteados)
-- em vez de 8. Códigos antigos continuam valendo.
ALTER TABLE mesas ALTER COLUMN codigo_convite SET DEFAULT left(replace(gen_random_uuid()::text, '-', ''), 12);

CREATE OR REPLACE FUNCTION public.regenerar_convite(p_mesa_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_novo TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM mesas WHERE id = p_mesa_id AND criador_id = auth.uid()
    UNION
    SELECT 1 FROM membros_mesa WHERE mesa_id = p_mesa_id AND usuario_id = auth.uid() AND role = 'co-mestre'
  ) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  v_novo := left(replace(gen_random_uuid()::text, '-', ''), 12);
  UPDATE mesas SET codigo_convite = v_novo WHERE id = p_mesa_id;
  RETURN v_novo;
END; $function$;

-- Tentativas com código errado: 10 em 15 minutos e a pessoa espera.
-- Sem políticas de RLS: só as funções do banco leem e escrevem aqui.
CREATE TABLE IF NOT EXISTS tentativas_convite (
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  em         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tentativas_convite_usuario ON tentativas_convite (usuario_id, em);
ALTER TABLE tentativas_convite ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tentativas_convite FROM authenticated, anon;

-- Código errado agora devolve "nenhuma mesa" (sem erro) para a tentativa ficar
-- gravada — um erro desfaria a gravação. O site já trata a lista vazia como
-- "código inválido".
CREATE OR REPLACE FUNCTION public.entrar_na_mesa(codigo text)
RETURNS TABLE(mesa_id uuid, nome text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_id uuid; v_nome text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF (SELECT count(*) FROM tentativas_convite t
       WHERE t.usuario_id = auth.uid() AND t.em > now() - interval '15 minutes') >= 10 THEN
    RAISE EXCEPTION 'Muitos códigos errados seguidos. Espere uns minutos e tente de novo.';
  END IF;

  SELECT m.id, m.nome INTO v_id, v_nome
    FROM mesas m WHERE m.codigo_convite = lower(trim(codigo));
  IF v_id IS NULL THEN
    DELETE FROM tentativas_convite t WHERE t.em < now() - interval '1 day';
    INSERT INTO tentativas_convite (usuario_id) VALUES (auth.uid());
    RETURN;
  END IF;

  BEGIN
    INSERT INTO membros_mesa (mesa_id, usuario_id, role)
    VALUES (v_id, auth.uid(), 'jogador');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já é membro desta mesa.';
  END;

  RETURN QUERY SELECT v_id, v_nome;
END $function$;

-- ═══ 3) Passar ficha para outra pessoa: só quem gere a mesa ═════════════════
CREATE OR REPLACE FUNCTION public.proteger_permissoes_ficha()
RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'public' AS $function$
BEGIN
  IF (NEW.dono_id IS DISTINCT FROM OLD.dono_id
      OR NEW.mesa_id IS DISTINCT FROM OLD.mesa_id
      OR NEW.privada IS DISTINCT FROM OLD.privada
      OR NEW.leitores IS DISTINCT FROM OLD.leitores
      OR NEW.editores IS DISTINCT FROM OLD.editores)
     AND auth.uid() IS NOT NULL  -- sem login = painel/SQL do administrador
     AND OLD.dono_id IS DISTINCT FROM auth.uid()
     AND NOT sou_gestor(OLD.mesa_id) THEN
    RAISE EXCEPTION 'Só o dono da ficha ou o mestre muda dono, mesa e permissões.' USING ERRCODE = '42501';
  END IF;
  -- o próprio dono não entrega a ficha a outra pessoa por fora: quem decide é o mestre
  IF NEW.dono_id IS DISTINCT FROM OLD.dono_id
     AND auth.uid() IS NOT NULL
     AND NOT sou_gestor(OLD.mesa_id) THEN
    RAISE EXCEPTION 'Só quem gere a mesa passa uma ficha para outra pessoa.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

-- ═══ 4) Curtidas: cada um vê só as próprias ═════════════════════════════════
-- (o site só lê as suas; o total de cada publicação é contado por um gatilho
-- DEFINER, que continua vendo todas)
DROP POLICY IF EXISTS curtidas_select ON curtidas_publicacao;
CREATE POLICY curtidas_select ON curtidas_publicacao FOR SELECT USING (usuario_id = auth.uid());

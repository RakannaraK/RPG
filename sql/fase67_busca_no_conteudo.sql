-- Fase 67 — busca global (Ctrl+K) dentro do conteúdo das mesas: fichas, itens, baú e verbetes.
-- Só cria uma função; não apaga nem altera nenhum dado. Pode rodar mais de uma vez.
-- SECURITY INVOKER de propósito: cada parte passa pelas mesmas regras de leitura (RLS) das telas.
--   - ficha privada não aparece para quem não pode lê-la (fichas_select_membro);
--   - item só aparece junto da ficha dele, então item de ficha privada também não aparece;
--   - verbete: o mestre busca na tabela; o jogador só no que já foi revelado (verbetes_visiveis).
-- ponytail: busca por trecho sem índice (varre as tabelas das mesas da pessoa);
-- se ficar lento, índice trigram (pg_trgm) em nome e titulo.

CREATE OR REPLACE FUNCTION buscar_conteudo(p_texto TEXT)
RETURNS TABLE (tipo TEXT, id UUID, mesa_id UUID, mesa_nome TEXT, titulo TEXT, detalhe TEXT, ficha_id UUID)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH q AS (
    SELECT lower(btrim(p_texto)) AS t
     WHERE char_length(btrim(coalesce(p_texto, ''))) BETWEEN 2 AND 60
  ),
  mm AS (
    SELECT m.id, m.nome FROM mesas m WHERE m.id IN (SELECT minhas_mesas())
  ),
  achou_fichas AS (
    SELECT 'ficha'::text, f.id, f.mesa_id, mm.nome, f.nome_personagem, coalesce(f.tipo_ficha, 'personagem'), f.id
      FROM fichas f JOIN mm ON mm.id = f.mesa_id CROSS JOIN q
     WHERE coalesce(f.tipo_ficha, 'personagem') <> 'forma'
       AND position(q.t IN lower(coalesce(f.nome_personagem, ''))) > 0
     ORDER BY f.nome_personagem LIMIT 10
  ),
  achou_itens AS (
    SELECT 'item'::text, i.id, f.mesa_id, mm.nome, i.nome, f.nome_personagem, f.id
      FROM itens_ficha i JOIN fichas f ON f.id = i.ficha_id JOIN mm ON mm.id = f.mesa_id CROSS JOIN q
     WHERE position(q.t IN lower(coalesce(i.nome, '') || ' ' || coalesce(i.descricao, ''))) > 0
     ORDER BY i.nome LIMIT 10
  ),
  achou_bau AS (
    SELECT 'bau'::text, i.id, i.bau_mesa_id, mm.nome, i.nome, NULL::text, NULL::uuid
      FROM itens_ficha i JOIN mm ON mm.id = i.bau_mesa_id CROSS JOIN q
     WHERE position(q.t IN lower(coalesce(i.nome, '') || ' ' || coalesce(i.descricao, ''))) > 0
     ORDER BY i.nome LIMIT 10
  ),
  achou_verbetes_mestre AS (
    SELECT 'verbete'::text, v.id, v.mesa_id, mm.nome, v.titulo, v.resumo, NULL::uuid
      FROM verbetes v JOIN mm ON mm.id = v.mesa_id CROSS JOIN q
     WHERE sou_gestor(v.mesa_id)
       AND position(q.t IN lower(concat_ws(' ', v.titulo, v.resumo, v.corpo, array_to_string(v.tags, ' ')))) > 0
     ORDER BY v.titulo LIMIT 10
  ),
  achou_verbetes_jogador AS (
    SELECT 'verbete'::text, vv.id, mm.id, mm.nome, vv.titulo, vv.resumo, NULL::uuid
      FROM mm CROSS JOIN LATERAL verbetes_visiveis(mm.id) vv CROSS JOIN q
     WHERE NOT sou_gestor(mm.id)
       AND position(q.t IN lower(concat_ws(' ', vv.titulo, vv.resumo, vv.corpo, array_to_string(vv.tags, ' ')))) > 0
     ORDER BY vv.titulo LIMIT 10
  )
  SELECT * FROM achou_fichas
  UNION ALL SELECT * FROM achou_itens
  UNION ALL SELECT * FROM achou_bau
  UNION ALL SELECT * FROM achou_verbetes_mestre
  UNION ALL SELECT * FROM achou_verbetes_jogador
$$;

REVOKE EXECUTE ON FUNCTION buscar_conteudo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION buscar_conteudo(TEXT) TO authenticated;

-- ============================================================================
-- Fase 21 — Itens como fonte de modificador
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Um item da ficha pode carregar modificadores (mesma estrutura da F12) que
-- entram no motor quando o item está EQUIPADO e não DANIFICADO (durabilidade 0).
-- Retrocompatível: colunas ficam vazias; itens existentes não mudam de efeito
-- (modificadores NULL = nenhum; equipado default TRUE = como se sempre valeu,
-- mas sem modificadores não há efeito).
-- ============================================================================

-- Lista de modificadores do item (array JSONB de objetos no formato F12):
-- [{ "tipo":"converter","operacao":"converter","alvo":"tipo_dano",
--    "valor":"{\"de\":\"fisico\",\"para\":\"eletrico\"}" }, ...]
ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS modificadores JSONB;

-- Item equipado? Só o equipado contribui seus modificadores.
ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS equipado BOOLEAN DEFAULT TRUE;

-- Realtime: equipar/desequipar um item muda os modificadores em jogo, então o
-- painel de sessão precisa reagir. Só adiciona se ainda não estiver na publicação.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'itens_ficha'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE itens_ficha;
  END IF;
END
$$;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- SELECT COUNT(*) AS total, COUNT(modificadores) AS com_mods,
--        COUNT(*) FILTER (WHERE equipado) AS equipados
-- FROM itens_ficha;

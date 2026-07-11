-- ============================================================================
-- Fase 21.5 — Recurso de item, durabilidade e conversão de tipo
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Retrocompatível: colunas JSONB ficam NULL; itens existentes não mudam.
-- ============================================================================

-- ─── 1) Recurso e durabilidade do item (JSONB na itens_ficha) ───────────────
-- recurso: { "nome":"Almas", "atual":29, "maximo":50,
--            "ao_completar":"texto...", "reinicia_ao_completar":false }
ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS recurso JSONB;

-- durabilidade: { "atual":100, "maximo":100 }  (em 0 = danificado; efeitos off)
ALTER TABLE itens_ficha ADD COLUMN IF NOT EXISTS durabilidade JSONB;

-- ─── 2) Operação 'converter' nos modificadores ──────────────────────────────
-- Só é preciso se a coluna `operacao` tiver um CHECK que liste os valores.
-- O bloco abaixo detecta o CHECK atual e o recria incluindo 'converter'
-- (mantendo os valores que já existiam). Se NÃO houver CHECK, não faz nada.
DO $$
DECLARE
  v_con   TEXT;
  v_def   TEXT;
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid)
    INTO v_con, v_def
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'modificadores'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%operacao%';

  IF v_con IS NOT NULL AND v_def NOT ILIKE '%converter%' THEN
    EXECUTE format('ALTER TABLE modificadores DROP CONSTRAINT %I', v_con);
    -- recria permitindo os valores usados no app + 'converter'
    EXECUTE 'ALTER TABLE modificadores ADD CONSTRAINT ' || quote_ident(v_con) ||
            ' CHECK (operacao IN (''somar'',''multiplicar'',''definir'',''percentual'',''converter''))';
  END IF;
END
$$;

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
-- (a) as colunas existem e estão NULL:
--     SELECT COUNT(*) AS total, COUNT(recurso) AS com_recurso, COUNT(durabilidade) AS com_durab
--     FROM itens_ficha;
--
-- (b) o CHECK de operacao (se existir) agora inclui 'converter':
--     SELECT pg_get_constraintdef(c.oid)
--     FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
--     WHERE t.relname = 'modificadores' AND c.contype = 'c'
--       AND pg_get_constraintdef(c.oid) ILIKE '%operacao%';

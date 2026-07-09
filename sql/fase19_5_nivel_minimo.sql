-- ============================================================================
-- Fase 19.5 — Requisito de nível mínimo
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Retrocompatível: `nivel_minimo` fica NULL em tudo que já existe, e NULL
-- significa "sem requisito" — nada deixa de ser concedido.
-- ============================================================================

-- ─── 1) Requisito na habilidade e no modificador ────────────────────────────
-- Interpretação: o mínimo é medido contra o nível da CLASSE de origem quando
-- existe (Voo Dracônico exige nv 5 *de Dragão*, não nível total). Habilidades
-- de raça e avulsas medem contra o nível TOTAL.
ALTER TABLE habilidades   ADD COLUMN IF NOT EXISTS nivel_minimo INTEGER;
ALTER TABLE modificadores ADD COLUMN IF NOT EXISTS nivel_minimo INTEGER;

-- ─── 2) Conferência (não altera nada) ───────────────────────────────────────
-- (a) tudo que já existia continua sem requisito:
--     SELECT COUNT(*) AS total, COUNT(nivel_minimo) AS com_requisito FROM habilidades;
--     SELECT COUNT(*) AS total, COUNT(nivel_minimo) AS com_requisito FROM modificadores;
--
-- (b) inspecionar os que vierem a exigir nível:
--     SELECT id, nome, classe_id, raca_id, nivel_minimo
--     FROM habilidades WHERE nivel_minimo IS NOT NULL;

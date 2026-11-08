-- Fase 54 — Árvore de habilidades com vários pré-requisitos e orçamento de pontos.
-- Só acréscimo. Roda inteiro numa transação (psql --single-transaction).
-- `requer_habilidade_id` (Fase 33) continua existindo e passa a espelhar o 1º pré-requisito.

-- 1. Vários pré-requisitos (sem FK: id apagado é ignorado pelo motor da árvore).
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS requer_habilidades_ids UUID[] NOT NULL DEFAULT '{}';

-- 2. 'todos' = exige todas; 'qualquer' = basta uma (estilo constelação).
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS requer_modo TEXT NOT NULL DEFAULT 'todos';

-- 3. Custo em pontos da árvore (NULL ou 0 = de graça).
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS custo_pontos INTEGER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_requer_modo_check') THEN
    ALTER TABLE habilidades ADD CONSTRAINT habilidades_requer_modo_check
      CHECK (requer_modo IN ('todos', 'qualquer'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_custo_pontos_check') THEN
    ALTER TABLE habilidades ADD CONSTRAINT habilidades_custo_pontos_check
      CHECK (custo_pontos IS NULL OR custo_pontos >= 0);
  END IF;
END $$;

-- 4. Copia o pré-requisito único antigo para a lista nova (não apaga nada).
UPDATE habilidades
   SET requer_habilidades_ids = ARRAY[requer_habilidade_id]
 WHERE requer_habilidade_id IS NOT NULL
   AND requer_habilidades_ids = '{}';

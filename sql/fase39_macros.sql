-- Fase 39 — macros de rolagem salvas na ficha (aditivo, idempotente)
-- Sem RLS nova: a coluna mora em `fichas`, então vale a política da ficha
-- (dono e editores escrevem; quem vê a ficha vê as macros).

ALTER TABLE fichas ADD COLUMN IF NOT EXISTS macros jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN fichas.macros IS
  'Fase 39 — rolagens salvas pelo jogador: [{id, nome, notacao}]. A notacao aceita formulas (F17). Sem RLS nova: vale a da ficha.';

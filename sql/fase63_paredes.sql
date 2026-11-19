-- Fase 63 — paredes e linha de visão no mapa.
-- Só acrescenta uma coluna em mapas; não apaga nem altera nenhum dado. Pode rodar mais de uma vez.
-- Quem lê e quem escreve não muda: jogador lê o mapa ativo (mapas_select_ativo) e só o
-- mestre ou co-mestre altera (mapas_gestor).

ALTER TABLE mapas ADD COLUMN IF NOT EXISTS paredes JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE mapas DROP CONSTRAINT IF EXISTS mapas_paredes_tamanho;
ALTER TABLE mapas ADD CONSTRAINT mapas_paredes_tamanho
  CHECK (jsonb_typeof(paredes) = 'object' AND octet_length(paredes::text) <= 60000);

-- Fase 61 — a Comunidade passa a aceitar o tipo "extensao" (pacote de cenas e efeitos do mapa).
-- Só amplia a lista de tipos permitidos; não apaga nem altera nenhum dado.
-- Pode rodar mais de uma vez.

ALTER TABLE publicacoes DROP CONSTRAINT IF EXISTS publicacoes_tipo_check;

ALTER TABLE publicacoes ADD CONSTRAINT publicacoes_tipo_check
  CHECK (tipo IN ('ficha', 'criatura', 'sistema', 'arte', 'extensao'));

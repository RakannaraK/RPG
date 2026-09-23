-- Fase 37.4 — capa da mesa (identidade visual "Dado & Pena")
-- Aditivo e idempotente: guarda só o id do padrão escolhido; o desenho é SVG no
-- front (src/lib/capas.js). Sem política nova — quem já edita a mesa escolhe a
-- capa, pela política que já existe em `mesas`.

ALTER TABLE mesas ADD COLUMN IF NOT EXISTS capa TEXT;

COMMENT ON COLUMN mesas.capa IS
  'Fase 37 — id do padrão de capa da mesa (ver src/lib/capas.js). NULL = sem capa.';

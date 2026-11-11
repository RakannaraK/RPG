-- Fases 57–60 — Efeitos do mapa: atmosfera, luz, efeitos de ação e extensões.
-- Só acréscimo. Roda inteiro numa transação (psql --single-transaction).
-- Pré-requisitos: sou_gestor(uuid) (Fase 16), mapas e tokens_mapa (Fase 26).

DO $$ BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL
     OR to_regclass('public.mapas') IS NULL
     OR to_regclass('public.tokens_mapa') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor (Fase 16) ou mapas/tokens_mapa (Fase 26).';
  END IF;
END $$;

-- 1. Atmosfera da cena: efeitos (fogo, chuva, neblina…), escuridão, luzes fixas e sons.
--    Quem escreve é o gestor (política mapas_gestor); o jogador recebe pelo Realtime de mapas.
ALTER TABLE mapas
  ADD COLUMN IF NOT EXISTS atmosfera JSONB NOT NULL DEFAULT '{}';

-- 2. Luz e aura que o token carrega: { raio, cor, tremula } e { raio, cor }.
ALTER TABLE tokens_mapa
  ADD COLUMN IF NOT EXISTS luz JSONB;
ALTER TABLE tokens_mapa
  ADD COLUMN IF NOT EXISTS aura JSONB;

-- 3. Extensões instaladas na mesa: lista de ids do catálogo e/ou pacotes importados inteiros.
ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS extensoes JSONB NOT NULL DEFAULT '[]';

-- 4. Efeito visual que a habilidade solta no mapa ao ser usada (id de um efeito de ação).
ALTER TABLE habilidades
  ADD COLUMN IF NOT EXISTS efeito_visual TEXT;

-- 5. Tetos de tamanho e formato (o site também valida; aqui é a última barreira).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mapas_atmosfera_tamanho') THEN
    ALTER TABLE mapas ADD CONSTRAINT mapas_atmosfera_tamanho
      CHECK (jsonb_typeof(atmosfera) = 'object' AND octet_length(atmosfera::text) <= 20000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tokens_mapa_luz_tamanho') THEN
    ALTER TABLE tokens_mapa ADD CONSTRAINT tokens_mapa_luz_tamanho
      CHECK (luz IS NULL OR octet_length(luz::text) <= 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tokens_mapa_aura_tamanho') THEN
    ALTER TABLE tokens_mapa ADD CONSTRAINT tokens_mapa_aura_tamanho
      CHECK (aura IS NULL OR octet_length(aura::text) <= 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_extensoes_tamanho') THEN
    ALTER TABLE mesas ADD CONSTRAINT mesas_extensoes_tamanho
      CHECK (jsonb_typeof(extensoes) = 'array' AND octet_length(extensoes::text) <= 300000);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'habilidades_efeito_visual_check') THEN
    ALTER TABLE habilidades ADD CONSTRAINT habilidades_efeito_visual_check
      CHECK (efeito_visual IS NULL OR efeito_visual ~ '^[a-z0-9_-]{1,40}$');
  END IF;
END $$;

-- 6. Instalar/remover extensões: mestre e co-mestre (a política de mesas só deixa o dono
--    escrever direto; o co-mestre passa por aqui, como no overlay da Fase 34).
CREATE OR REPLACE FUNCTION definir_extensoes(p_mesa_id UUID, p_extensoes JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT sou_gestor(p_mesa_id) THEN
    RAISE EXCEPTION 'Só o mestre ou co-mestre mexe nas extensões.' USING ERRCODE = '42501';
  END IF;
  IF p_extensoes IS NULL OR jsonb_typeof(p_extensoes) <> 'array' OR jsonb_array_length(p_extensoes) > 20 THEN
    RAISE EXCEPTION 'Lista de extensões inválida (máximo 20).';
  END IF;
  IF octet_length(p_extensoes::text) > 300000 THEN
    RAISE EXCEPTION 'Extensões grandes demais.';
  END IF;
  UPDATE mesas SET extensoes = p_extensoes WHERE id = p_mesa_id;
  RETURN p_extensoes;
END
$$;
REVOKE EXECUTE ON FUNCTION definir_extensoes(UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION definir_extensoes(UUID, JSONB) TO authenticated, service_role;

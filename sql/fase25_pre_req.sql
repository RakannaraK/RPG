-- ============================================================================
-- Fase 25 — XP direto, Prioridades e Árvores: pré-requisitos
-- (revisar antes de rodar; necessário a partir da 25.2/25.3)
-- ============================================================================

-- 1) Árvores/linhas de poder (25.3)
CREATE TABLE linhas_poder (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,                    -- ex: "Dominação" (nome do mestre)
  descricao TEXT,
  maximo INTEGER DEFAULT 5,
  auto_conceder BOOLEAN DEFAULT FALSE,   -- subir o rating concede os poderes do nível
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poderes (F20) penduram numa linha e num nível dela
ALTER TABLE poderes ADD COLUMN linha_id UUID REFERENCES linhas_poder(id) ON DELETE SET NULL;
ALTER TABLE poderes ADD COLUMN nivel_linha INTEGER;

-- Rating da linha por ficha (exibido em dots F24.3)
CREATE TABLE linhas_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  linha_id UUID REFERENCES linhas_poder(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL DEFAULT 0,
  UNIQUE(ficha_id, linha_id)
);

-- Linhas NATIVAS via raça/classe existentes (sem entidade "clã")
ALTER TABLE racas   ADD COLUMN linhas_nativas UUID[] DEFAULT '{}';
ALTER TABLE classes ADD COLUMN linhas_nativas UUID[] DEFAULT '{}';

-- 2) Log de XP direto (25.2; padrão do log da F22)
CREATE TABLE xp_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('ganho','gasto','ajuste')) NOT NULL,
  quantidade INTEGER NOT NULL,           -- positivo = ganho; negativo = gasto
  detalhe JSONB,                         -- {"categoria","alvo_id","de","para","custo"} ou {"motivo"}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) RLS (padrão do projeto: dono ALL; membros SELECT; conteúdo de sistema
--    escrito por gestor via sou_gestor_do_sistema, como nas F19-21)
ALTER TABLE linhas_poder ENABLE ROW LEVEL SECURITY;
ALTER TABLE linhas_ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON linhas_poder TO authenticated;
GRANT ALL ON linhas_ficha TO authenticated;
GRANT ALL ON xp_log TO authenticated;

-- leitura pega carona na RLS de sistemas (padrão F19.6+); escrita = gestor
CREATE POLICY "linhas_select" ON linhas_poder FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));
CREATE POLICY "linhas_gestor" ON linhas_poder FOR ALL
  USING (sou_gestor_do_sistema(sistema_id))
  WITH CHECK (sou_gestor_do_sistema(sistema_id));

CREATE POLICY "linhas_ficha_dono" ON linhas_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "linhas_ficha_membros" ON linhas_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid())));

CREATE POLICY "xp_log_dono" ON xp_log FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "xp_log_membros" ON xp_log FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid())));

-- 4) Realtime (opcional — ratings ao vivo na sessão)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'linhas_ficha') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE linhas_ficha;
  END IF;
END $$;

-- ============================================================================
-- 5) MIGRAÇÃO DE CONFIG F19 → F25 (OPCIONAL — revisar antes de rodar)
-- ============================================================================
-- O app já migra em LEITURA (mergeConfigLayout): config sem `progressao` vira
-- modo 'nivel' (comportamento F19 idêntico; a curva segue em progressao_xp).
-- Este UPDATE apenas MATERIALIZA isso no banco. Idempotente: só toca sistemas
-- que ainda não têm a chave `progressao`; não altera progressao_xp nem nada mais.
UPDATE sistemas
SET config_layout = jsonb_set(
  COALESCE(config_layout, '{}'::jsonb),
  '{progressao}',
  '{"modo":"nivel","categorias_compra":[]}'::jsonb,
  true
)
WHERE config_layout IS NULL OR NOT (config_layout ? 'progressao');

-- ============================================================================
-- 6) 25.2 — caixinhas extras de trilha compradas com XP
--    (alvo 'trilha_tamanho_bonus' das categorias de compra)
-- ============================================================================
ALTER TABLE trilhas_ficha ADD COLUMN tamanho_bonus INTEGER DEFAULT 0;

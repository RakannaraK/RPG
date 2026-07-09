-- ============================================================================
-- Fase 19.6 — Recompensas por nível
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- Recompensas são TEXTO-GUIA (checklist). O app não aplica nada mecanicamente.
-- Retrocompatível: sem recompensas cadastradas, o painel nem aparece.
-- ============================================================================

-- ─── 1) Catálogo de recompensas do sistema ──────────────────────────────────
-- classe_id NULL = recompensa por nível TOTAL do sistema.
-- classe_id preenchido = dispara no nível DAQUELA classe.
CREATE TABLE IF NOT EXISTS recompensas_nivel (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  classe_id  UUID REFERENCES classes(id)  ON DELETE CASCADE,
  nivel      INTEGER NOT NULL CHECK (nivel >= 1),
  titulo     TEXT NOT NULL,
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recompensas_nivel ENABLE ROW LEVEL SECURITY;
GRANT ALL ON recompensas_nivel TO authenticated;

-- Leitura: quem enxerga o sistema (piggyback na RLS de `sistemas`, mesmo padrão
-- adotado na 19.1 — evita reconsultar membros_mesa e duplicar a regra de acesso).
DROP POLICY IF EXISTS "recompensas_select" ON recompensas_nivel;
CREATE POLICY "recompensas_select"
  ON recompensas_nivel FOR SELECT
  USING (sistema_id IN (SELECT id FROM sistemas));

-- Escrita: mestre E co-mestre.
-- Helper SECURITY DEFINER (padrão do projeto): decide sem depender da RLS das
-- tabelas consultadas e sem risco de recursão entre políticas.
-- Gestor = criador do sistema, criador da mesa, ou membro com role mestre/co-mestre.
CREATE OR REPLACE FUNCTION sou_gestor_do_sistema(p_sistema_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sistemas s
    LEFT JOIN mesas m        ON m.id = s.mesa_id
    LEFT JOIN membros_mesa mm ON mm.mesa_id = s.mesa_id AND mm.usuario_id = auth.uid()
    WHERE s.id = p_sistema_id
      AND (
        s.criador_id = auth.uid()
        OR m.criador_id = auth.uid()
        OR mm.role IN ('mestre', 'co-mestre')
      )
  );
$$;

GRANT EXECUTE ON FUNCTION sou_gestor_do_sistema(UUID) TO authenticated;

-- FOR ALL sem WITH CHECK: o Postgres reaproveita o USING também no INSERT/UPDATE.
DROP POLICY IF EXISTS "recompensas_mestre" ON recompensas_nivel;
CREATE POLICY "recompensas_mestre"
  ON recompensas_nivel FOR ALL
  USING (sou_gestor_do_sistema(sistema_id));

-- ─── 2) Estado das recompensas em cada ficha (pendente / concluída) ─────────
CREATE TABLE IF NOT EXISTS recompensas_ficha (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id      UUID REFERENCES fichas(id) ON DELETE CASCADE,
  recompensa_id UUID REFERENCES recompensas_nivel(id) ON DELETE CASCADE,
  concluida     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ficha_id, recompensa_id)   -- não duplica a mesma pendência
);

ALTER TABLE recompensas_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON recompensas_ficha TO authenticated;

-- Dono da ficha: CRUD (é ele quem marca o checklist)
DROP POLICY IF EXISTS "recompensas_ficha_dono" ON recompensas_ficha;
CREATE POLICY "recompensas_ficha_dono"
  ON recompensas_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: só leitura (piggyback na RLS de `fichas`)
DROP POLICY IF EXISTS "recompensas_ficha_membros" ON recompensas_ficha;
CREATE POLICY "recompensas_ficha_membros"
  ON recompensas_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── 3) Conferência (não altera nada) ───────────────────────────────────────
-- (a) as tabelas existem e estão vazias:
--     SELECT COUNT(*) FROM recompensas_nivel;
--     SELECT COUNT(*) FROM recompensas_ficha;
--
-- (b) depois de cadastrar e subir de nível, ver as pendências de uma ficha:
--     SELECT rf.concluida, rn.nivel, rn.titulo, rn.classe_id
--     FROM recompensas_ficha rf
--     JOIN recompensas_nivel rn ON rn.id = rf.recompensa_id
--     WHERE rf.ficha_id = '<ficha_id>'
--     ORDER BY rf.concluida, rn.nivel;
--
-- (c) conferir que você é reconhecido como gestor do sistema (deve dar true):
--     SELECT sou_gestor_do_sistema('<sistema_id>');
--     Logado como co-mestre, também deve dar true.

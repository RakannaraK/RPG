-- ============================================================================
-- Fase 19.1 — Multiclasse: tabela classes_ficha + migração das fichas antigas
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. Roda no SQL Editor do Supabase, uma vez.
-- Seguro: idempotente (dá pra rodar de novo sem duplicar) e retrocompatível
-- (não altera fichas antigas; a coluna fichas.classe_id continua existindo).
-- ============================================================================

-- ─── 1) Tabela de classes por ficha (uma linha por classe) ──────────────────
CREATE TABLE IF NOT EXISTS classes_ficha (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id   UUID REFERENCES fichas(id)  ON DELETE CASCADE,
  classe_id  UUID REFERENCES classes(id) ON DELETE CASCADE,
  nivel      INTEGER NOT NULL DEFAULT 1 CHECK (nivel >= 1),
  ordem      INTEGER DEFAULT 0,          -- ordem de exibição ("Bárbaro 9 / Paladino 4")
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ficha_id, classe_id)           -- a mesma classe não repete na ficha
);

ALTER TABLE classes_ficha ENABLE ROW LEVEL SECURITY;
GRANT ALL ON classes_ficha TO authenticated;

-- Dono da ficha: CRUD completo
DROP POLICY IF EXISTS "classes_ficha_dono" ON classes_ficha;
CREATE POLICY "classes_ficha_dono"
  ON classes_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));

-- Membros da mesa: somente leitura.
-- Piggyback na RLS já existente de `fichas` (que só expõe fichas de mesas do
-- usuário) em vez de reconsultar membros_mesa — mesmo padrão da auditoria de RLS,
-- evita recursão e duplicação da lógica de acesso.
DROP POLICY IF EXISTS "classes_ficha_membros" ON classes_ficha;
CREATE POLICY "classes_ficha_membros"
  ON classes_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas));

-- ─── 2) Migração: fichas.classe_id  →  linha em classes_ficha ────────────────
-- Só migra fichas que têm classe estruturada (classe_id) E cuja classe existe.
-- Fichas de sistemas sem classes (campo texto `fichas.classe`) ficam intactas.
-- ON CONFLICT DO NOTHING = idempotente e convive com linhas já criadas pelo app.
INSERT INTO classes_ficha (ficha_id, classe_id, nivel, ordem)
SELECT f.id, f.classe_id, COALESCE(f.nivel, 1), 0
FROM fichas f
JOIN classes c ON c.id = f.classe_id           -- garante FK válida (ignora classe_id órfão)
WHERE f.classe_id IS NOT NULL
ON CONFLICT (ficha_id, classe_id) DO NOTHING;

-- ─── 3) Conferência (rode e compare; não altera nada) ───────────────────────
-- (a) quantas fichas deveriam ser migradas:
--     SELECT COUNT(*) FROM fichas f JOIN classes c ON c.id = f.classe_id;
-- (b) quantas linhas existem agora em classes_ficha:
--     SELECT COUNT(*) FROM classes_ficha;
-- (c) fichas com classe_id que NÃO ganharam linha (esperado: 0 — o resto é
--     classe_id órfão, sem classe correspondente):
--     SELECT f.id, f.classe_id
--     FROM fichas f
--     LEFT JOIN classes_ficha cf ON cf.ficha_id = f.id AND cf.classe_id = f.classe_id
--     WHERE f.classe_id IS NOT NULL AND cf.id IS NULL;

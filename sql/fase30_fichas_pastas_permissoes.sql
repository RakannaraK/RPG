-- ============================================================================
-- Fase 30 — Ficha privada, acesso por membro (ver/editar) e pastas
-- ----------------------------------------------------------------------------
-- Idempotente. Rodar numa transação só (psql -1): a regra de leitura das fichas
-- é trocada e não pode haver instante sem ela. NÃO apaga dado nenhum.
-- Acrescenta colunas com padrão que mantém tudo como estava (ficha pública,
-- sem pasta, ninguém além do dono edita).
-- ============================================================================

-- ─── 0) Pré-requisito: funções da Fase 16 ──────────────────────────────────
DO $$
BEGIN
  IF to_regprocedure('sou_gestor(uuid)') IS NULL
     OR to_regprocedure('minhas_mesas()') IS NULL
     OR to_regprocedure('pode_escrever_mesa(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Faltam sou_gestor(uuid) / minhas_mesas() / pode_escrever_mesa(uuid) (Fase 16).';
  END IF;
END $$;

-- ─── 1) Colunas novas ───────────────────────────────────────────────────────
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS privada  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS leitores UUID[]  NOT NULL DEFAULT '{}';  -- veem mesmo privada
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS editores UUID[]  NOT NULL DEFAULT '{}';  -- editam como o dono
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS pasta    TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fichas_pasta_tamanho') THEN
    ALTER TABLE fichas ADD CONSTRAINT fichas_pasta_tamanho CHECK (pasta IS NULL OR char_length(pasta) BETWEEN 1 AND 60);
  END IF;
END $$;

-- ─── 2) Quem lê a ficha ─────────────────────────────────────────────────────
-- Pública: a mesa toda (como sempre). Privada: dono, mestre/co-mestre e quem
-- o dono liberou. As tabelas filhas (atributos, itens…) já filtram por
-- "ficha_id IN (SELECT id FROM fichas)", então herdam esta regra sozinhas.
DROP POLICY IF EXISTS "membros veem fichas da mesa" ON fichas;
DROP POLICY IF EXISTS "fichas_select_membro" ON fichas;
CREATE POLICY "fichas_select_membro" ON fichas FOR SELECT
  USING (
    mesa_id IN (SELECT minhas_mesas())
    AND (
      NOT privada
      OR dono_id = auth.uid()
      OR sou_gestor(mesa_id)
      OR auth.uid() = ANY (leitores)
      OR auth.uid() = ANY (editores)
    )
  );

-- ─── 3) Quem edita além do dono ─────────────────────────────────────────────
-- Editor liberado pelo dono, ainda membro com escrita na mesa (espectador não).
CREATE OR REPLACE FUNCTION pode_editar_ficha(p_ficha_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM fichas f
    WHERE f.id = p_ficha_id
      AND auth.uid() = ANY (f.editores)
      AND pode_escrever_mesa(f.mesa_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION pode_editar_ficha(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION pode_editar_ficha(UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "fichas_update_editor" ON fichas;
CREATE POLICY "fichas_update_editor" ON fichas FOR UPDATE
  USING (auth.uid() = ANY (editores) AND pode_escrever_mesa(mesa_id))
  WITH CHECK (pode_escrever_mesa(mesa_id));

-- Editor não mexe em dono, mesa nem compartilhamento (só dono ou gestor).
-- O RLS não enxerga o valor antigo; o gatilho enxerga.
CREATE OR REPLACE FUNCTION proteger_permissoes_ficha()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (NEW.dono_id IS DISTINCT FROM OLD.dono_id
      OR NEW.mesa_id IS DISTINCT FROM OLD.mesa_id
      OR NEW.privada IS DISTINCT FROM OLD.privada
      OR NEW.leitores IS DISTINCT FROM OLD.leitores
      OR NEW.editores IS DISTINCT FROM OLD.editores)
     AND auth.uid() IS NOT NULL  -- sem login = painel/SQL do administrador (a API sempre tem login ou é anon sem acesso)
     AND OLD.dono_id IS DISTINCT FROM auth.uid()
     AND NOT sou_gestor(OLD.mesa_id) THEN
    RAISE EXCEPTION 'Só o dono da ficha ou o mestre muda dono, mesa e permissões.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION proteger_permissoes_ficha() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS fichas_proteger_permissoes ON fichas;
CREATE TRIGGER fichas_proteger_permissoes
  BEFORE UPDATE ON fichas
  FOR EACH ROW EXECUTE FUNCTION proteger_permissoes_ficha();

-- Tabelas filhas: uma regra A MAIS para o editor (as do dono ficam como estão)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'classes_ficha', 'condicoes_manuais_ficha', 'estados_ficha', 'habilidades_ficha',
    'imagens_ficha', 'itens_ficha', 'linhas_ficha', 'maestrias_ficha', 'pericias_ficha',
    'poderes_ficha', 'pontos_status_ficha', 'pontos_status_log', 'pools_ficha',
    'projetos_ficha', 'recompensas_ficha', 'slots_ficha', 'trilhas_ficha',
    'valores_atributos', 'valores_combate', 'xp_log', 'descansos_log'
  ] LOOP
    IF to_regclass(t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_editor', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (pode_editar_ficha(ficha_id)) WITH CHECK (pode_editar_ficha(ficha_id))',
      t || '_editor', t);
  END LOOP;
END $$;

-- Combate e mapa: o editor mexe no combatente e no token da ficha como o dono
DROP POLICY IF EXISTS "combatentes_editor" ON combatentes;
CREATE POLICY "combatentes_editor" ON combatentes FOR UPDATE
  USING (pode_editar_ficha(ficha_id));

DO $$
BEGIN
  IF to_regclass('tokens_mapa') IS NOT NULL THEN
    DROP POLICY IF EXISTS "tokens_update_editor" ON tokens_mapa;
    CREATE POLICY "tokens_update_editor" ON tokens_mapa FOR UPDATE
      USING (pode_editar_ficha(ficha_id) AND mapa_id IN (SELECT id FROM mapas WHERE ativo))
      WITH CHECK (pode_editar_ficha(ficha_id) AND mapa_id IN (SELECT id FROM mapas WHERE ativo));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ─── 4) Conferência (não altera nada) ───────────────────────────────────────
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'fichas';
--   SELECT tablename FROM pg_policies WHERE policyname LIKE '%\_editor' ORDER BY 1;

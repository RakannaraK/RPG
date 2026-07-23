-- ============================================================================
-- Auditoria RLS — correção: endurecer o INSERT em profiles
-- ----------------------------------------------------------------------------
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
--
-- Problema encontrado na auditoria: a política "trigger cria perfil" tinha
-- WITH CHECK (true). Como o Postgres combina políticas PERMISSIVAS com OR, o
-- check efetivo de INSERT em profiles virava `true` — qualquer usuário
-- autenticado conseguia inserir uma linha de profile com um id arbitrário.
--
-- Essa política é desnecessária: o profile é criado no cadastro pelo trigger
-- handle_new_user(), que é SECURITY DEFINER e ignora RLS. Removê-la deixa o
-- INSERT restrito a auth.uid() = id (pela política "perfil próprio", que é
-- FOR ALL e cujo WITH CHECK o Postgres copia do USING). O cadastro continua
-- funcionando normalmente.
-- ============================================================================

DROP POLICY IF EXISTS "trigger cria perfil" ON profiles;

-- ─── Conferência (não altera nada) ──────────────────────────────────────────
-- Depois do DROP, as políticas de profiles devem ser apenas:
--   "perfil próprio"          ALL     USING (auth.uid() = id)
--   "profiles_select_colegas" SELECT  USING (id IN (SELECT colegas_de_mesa()))
-- e NENHUMA política de INSERT com with_check = true:
--
--   SELECT policyname, cmd, qual AS using_expr, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'profiles'
--   ORDER BY cmd, policyname;

-- ============================================================================
-- Correção de Realtime — classes_ficha (F19) ficou fora da publicação.
-- O painel de sessão escuta essa tabela; sem isso, subir de nível / trocar de
-- classe não reflete ao vivo no card do mestre.
-- Idempotente: o bloco só adiciona se ainda não estiver na publicação.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'classes_ficha'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE classes_ficha;
  END IF;
END
$$;

-- ─── Conferência: quais tabelas que o app escuta estão no Realtime ──────────
-- Deve listar TODAS estas. Se faltar alguma, ela não atualiza ao vivo.
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN (
    'fichas', 'sessoes', 'encontros', 'combatentes', 'condicoes_ativas',
    'habilidades_ficha', 'condicoes_manuais_ficha', 'valores_combate',
    'notificacoes', 'classes_ficha', 'pools_ficha', 'slots_ficha'
  )
ORDER BY tablename;

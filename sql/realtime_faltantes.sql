-- ============================================================================
-- Realtime — tabelas que o app escuta mas ficaram fora da publicação.
--   notificacoes    (F16.7) — o sininho não pisca ao vivo sem isto
--   valores_combate (F14)   — edição de campo de combate não reflete no
--                             card do mestre na sessão sem isto
-- Idempotente: cada tabela só é adicionada se ainda não estiver na publicação.
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'valores_combate'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE valores_combate;
  END IF;
END
$$;

-- ─── Conferência: agora devem aparecer as 12 tabelas ────────────────────────
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

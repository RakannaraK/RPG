-- ============================================================================
-- Correção: criar o bucket de imagens que o app inteiro usa
-- ----------------------------------------------------------------------------
-- Achado no teste com contas reais (2026-09-21): todo envio de imagem (ficha,
-- item, token, cena do mapa, avatar da mesa) e o som de crítico da F35 usam
-- `fichas-imagens`, e as três políticas do Storage também — mas o bucket
-- existente chama `ficha-imagens` (singular) e está VAZIO. Nada é apagado: o
-- bucket antigo fica onde está; este SQL só cria o que falta.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fichas-imagens', 'fichas-imagens', true,
  10485760,  -- 10 MB por arquivo (o navegador já comprime as imagens)
  ARRAY['image/jpeg','image/png','image/webp','image/gif',
        'audio/mpeg','audio/ogg','audio/wav','audio/mp4','audio/aac','audio/webm']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── Conferência ────────────────────────────────────────────────────────────
--   SELECT id, public, file_size_limit FROM storage.buckets ORDER BY id;

-- Storage do site: bucket `fichas-imagens` + regras de acesso. Idempotente.
-- Aditivo: cria o que falta. Nada é apagado.
--
-- Em 2026-09-25 o bucket foi apagado pelo painel (o nome é quase igual ao do
-- bucket vazio `ficha-imagens`, sem "s", que era o que devia sair) — e o painel
-- leva junto as políticas do bucket. As políticas nunca tinham sido versionadas;
-- agora estão aqui.
--
-- Caminhos que o código usa, todos começando pela pasta de quem envia:
--   <uid>/<fichaId>/...   imagens e itens da ficha     <uid>/avatars/...  avatar na mesa
--   <uid>/sons/...        som de dado/crítico (F35)    <uid>/mapas/<mesa>/...  cenas
--   <uid>/tokens/...      tokens do mapa               <uid>/verbetes/...  enciclopédia/atlas
-- Leitura é pública (bucket público: a URL abre direto, sem política).

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

-- cada um envia, troca, lista e apaga só na própria pasta
DROP POLICY IF EXISTS "upload próprio" ON storage.objects;
CREATE POLICY "upload próprio" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fichas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "ler próprio" ON storage.objects;
CREATE POLICY "ler próprio" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'fichas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "trocar próprio" ON storage.objects;
CREATE POLICY "trocar próprio" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'fichas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'fichas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "apagar próprio" ON storage.objects;
CREATE POLICY "apagar próprio" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'fichas-imagens' AND (storage.foldername(name))[1] = auth.uid()::text);

-- (a restritiva "convidado_nao_envia" da F47 continua valendo por cima destas)

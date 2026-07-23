-- ============================================================================
-- Nickname global — parar de expor o e-mail no username
-- REVISAR ANTES DE RODAR. SQL Editor do Supabase, uma vez. Idempotente.
-- O profiles.username ja e o nome exibido em todo lugar; o problema e que
-- nasce igual ao e-mail. Isto: (1) cadastros novos usam so a parte local do
-- e-mail; (2) backfill tira o dominio dos usernames e dos autor_nome ja
-- gravados. O usuario troca o apelido quando quiser na UI (Preferencias).
-- ============================================================================

-- 1) Cadastros novos: apelido inicial = parte local do e-mail (antes do @).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- 2) Backfill dos perfis existentes: tira o dominio de quem tem e-mail no nome.
UPDATE profiles
SET username = split_part(username, '@', 1)
WHERE username LIKE '%@%';

-- 3) Backfill do historico de rolagens (autor_nome guardava o e-mail).
UPDATE rolagens
SET autor_nome = split_part(autor_nome, '@', 1)
WHERE autor_nome LIKE '%@%';

-- Conferencia (deve vir vazio):
--   SELECT username FROM profiles WHERE username LIKE '%@%';

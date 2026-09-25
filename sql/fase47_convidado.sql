-- Fase 47 — jogador convidado, sem conta (login anônimo do Supabase).
-- Aditivo: troca o corpo de handle_new_user (mesmo comportamento para quem tem
-- e-mail) e cria políticas RESTRITIVAS novas. Nada é apagado.
--
-- O convidado é um usuário `authenticated` como qualquer outro — herda TODAS as
-- políticas. Por isso as restritivas: elas valem "por cima" das permissivas
-- (a linha precisa passar nas duas). O que fica de fora para convidado:
-- criar mesa, publicar/curtir/denunciar na comunidade (conta anônima é de
-- graça: 3 denúncias escondem uma publicação) e enviar arquivos.
-- Dentro da mesa para a qual foi convidado ele joga normalmente.

-- 1) Convidado não tem e-mail; username é único e obrigatório -> um nome próprio.
--    (O nome que ele escolhe vai no apelido da mesa, que aparece antes do username.)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    coalesce(nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
             'convidado-' || left(replace(NEW.id::text, '-', ''), 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$;

-- 2) O que convidado não faz
DROP POLICY IF EXISTS convidado_nao_cria_mesa ON mesas;
CREATE POLICY convidado_nao_cria_mesa ON mesas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS convidado_nao_publica ON publicacoes;
CREATE POLICY convidado_nao_publica ON publicacoes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS convidado_nao_curte ON curtidas_publicacao;
CREATE POLICY convidado_nao_curte ON curtidas_publicacao AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

DROP POLICY IF EXISTS convidado_nao_denuncia ON denuncias_publicacao;
CREATE POLICY convidado_nao_denuncia ON denuncias_publicacao AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);

-- 3) Arquivos: storage.objects é de outro dono; se não der para criar aqui,
--    avisa e segue (o upload já é limitado à pasta do próprio usuário).
DO $$
BEGIN
  DROP POLICY IF EXISTS convidado_nao_envia ON storage.objects;
  CREATE POLICY convidado_nao_envia ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false);
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Sem permissão em storage.objects: política de upload de convidado não criada.';
END $$;

-- Auditoria de segurança 2026-09-26 — correções. Nada é apagado.
--
-- 1) GRAVE: qualquer usuário logado conseguia se tornar ADMIN.
--    A política "perfil próprio" deixa cada um editar a própria linha de
--    `profiles`, e a permissão de UPDATE cobria todas as colunas — inclusive
--    `admin`. Um "admin" vê publicações escondidas, edita/apaga a de qualquer um
--    e lê todas as denúncias. (Conferido: 0 admins no banco; ninguém usou.)
--    Correção em duas camadas:
--      a) o site só pode gravar username, avatar_url e preferencias;
--      b) um gatilho barra mudança em `admin` vinda do site, mesmo que alguém
--         um dia devolva a permissão da tabela inteira por engano.
--    Tornar alguém admin continua possível pelo painel/SQL do dono do projeto.

REVOKE INSERT, UPDATE ON profiles FROM authenticated, anon;
GRANT UPDATE (username, avatar_url, preferencias) ON profiles TO authenticated;
GRANT INSERT (id, username, avatar_url, preferencias) ON profiles TO authenticated;

CREATE OR REPLACE FUNCTION proteger_admin_perfil() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- chamadas do site rodam como authenticated/anon; o painel e as funções do
  -- banco rodam como o dono (postgres) e passam
  IF current_user IN ('authenticated', 'anon')
     AND (TG_OP = 'INSERT' AND NEW.admin IS TRUE
          OR TG_OP = 'UPDATE' AND NEW.admin IS DISTINCT FROM OLD.admin) THEN
    RAISE EXCEPTION 'Só o dono do projeto define administradores.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS proteger_admin_perfil ON profiles;
CREATE TRIGGER proteger_admin_perfil BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION proteger_admin_perfil();

-- 2) Endurecimento: o Supabase dá, por padrão, TRUNCATE, REFERENCES e TRIGGER
--    em todas as tabelas para os papéis do site. A API não usa nenhum dos três
--    (e TRUNCATE passaria por cima da RLS se um dia alguém tivesse acesso SQL
--    com esse papel). Tirar não muda nada no site.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') LOOP
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM authenticated, anon', t.relname);
  END LOOP;
END $$;
-- e para as tabelas que forem criadas daqui em diante
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated, anon;

-- Correção — nome de usuário repetido no cadastro.
-- Só troca o corpo de handle_new_user. Nada é apagado.
--
-- O username vem da parte do e-mail antes do "@" e é ÚNICO. Antes, se
-- joao@gmail.com já existisse, joao@hotmail.com batia na unicidade, o erro era
-- engolido (para não travar o cadastro) e a pessoa ficava SEM perfil: nome
-- "Jogador" e preferências que não salvam. Agora tenta joao, joao2, joao3…

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  -- convidado (F47) não tem e-mail: ganha um nome próprio
  v_base text := coalesce(nullif(split_part(coalesce(NEW.email, ''), '@', 1), ''),
                          'convidado-' || left(replace(NEW.id::text, '-', ''), 8));
  v_n integer := 1;
BEGIN
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, CASE WHEN v_n = 1 THEN v_base ELSE v_base || v_n END)
      ON CONFLICT (id) DO NOTHING;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      -- o nome já é de alguém: tenta o próximo número
      v_n := v_n + 1;
      IF v_n > 1000 THEN RETURN NEW; END IF;
    END;
  END LOOP;
EXCEPTION
  -- nunca travar o cadastro por causa do perfil
  WHEN OTHERS THEN
    RETURN NEW;
END;
$function$;

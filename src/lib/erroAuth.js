/**
 * Erros do login/cadastro do Supabase vêm em inglês: aqui viram português.
 * Usa o `code` quando existe (mais estável que a mensagem).
 */
const POR_CODIGO = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar: procure a mensagem que enviamos (veja também o spam).',
  user_already_exists: 'Já existe uma conta com esse e-mail. Entre com ela ou peça uma senha nova.',
  email_exists: 'Já existe uma conta com esse e-mail. Entre com ela ou peça uma senha nova.',
  weak_password: 'Senha fraca: use pelo menos 6 caracteres, misturando letras e números.',
  captcha_failed: 'A verificação anti-robô falhou. Marque a caixa de novo e tente outra vez.',
  over_email_send_rate_limit: 'Muitos e-mails enviados agora. Espere alguns minutos e tente de novo.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  anonymous_provider_disabled: 'A entrada de convidados está desligada neste site. Entre com uma conta.',
}

const POR_TEXTO = [
  [/invalid login credentials/i, POR_CODIGO.invalid_credentials],
  [/email not confirmed/i, POR_CODIGO.email_not_confirmed],
  [/already registered|already exists/i, POR_CODIGO.user_already_exists],
  [/captcha/i, POR_CODIGO.captcha_failed],
  [/anonymous sign-ins are disabled/i, POR_CODIGO.anonymous_provider_disabled],
  [/rate limit|too many/i, POR_CODIGO.over_request_rate_limit],
  [/password should be at least/i, POR_CODIGO.weak_password],
]

export function traduzirErroAuth(erro) {
  if (!erro) return ''
  if (erro.code && POR_CODIGO[erro.code]) return POR_CODIGO[erro.code]
  const msg = String(erro.message || erro)
  return POR_TEXTO.find(([re]) => re.test(msg))?.[1] || msg
}

/** O login falhou só porque o e-mail ainda não foi confirmado? (mostra "reenviar") */
export const faltaConfirmar = erro =>
  erro?.code === 'email_not_confirmed' || /email not confirmed/i.test(String(erro?.message || ''))

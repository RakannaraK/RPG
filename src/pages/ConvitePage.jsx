import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LIMITE_NOME_CONVIDADO, codigoDoConvite, validarNomeConvidado } from '../lib/convite'
import { traduzirErroAuth } from '../lib/erroAuth'
import Captcha, { CHAVE_CAPTCHA } from '../components/auth/Captcha'
import Marca from '../components/marca/Marca'
import Ilustra from '../components/arte/Ilustra'
import Botao from '../components/ui/Botao'

/** O login anônimo é ligado no painel do Supabase; o site pergunta antes de oferecer. */
async function convidadoLigado() {
  try {
    const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
    return !!(await r.json())?.external?.anonymous_users
  } catch { return false }
}

/** Entra na mesa pelo código; se já é membro, só acha a mesa. Devolve o id. */
async function entrarNaMesa(codigo) {
  const { data, error } = await supabase.rpc('entrar_na_mesa', { codigo })
  if (!error) {
    const id = (Array.isArray(data) ? data[0] : data)?.mesa_id
    if (id) return id
    // lista vazia = código errado (a tentativa conta no limite do banco)
    throw new Error('Código de convite inválido ou a mesa não existe mais.')
  }
  const { data: m } = await supabase.from('mesas').select('id').eq('codigo_convite', codigo).maybeSingle()
  if (m?.id) return m.id
  throw new Error(error.message)
}

/**
 * Fase 47 — /convite/:codigo. Com conta: entra na mesa. Sem conta: entra como
 * convidado (login anônimo) só com um nome — ou vai para o login e volta aqui.
 */
export default function ConvitePage() {
  const { codigo: bruto } = useParams()
  const codigo = codigoDoConvite(bruto)
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [ligado, setLigado] = useState(null)
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [captcha, setCaptcha] = useState(null)
  const [versaoCaptcha, setVersaoCaptcha] = useState(0)

  useEffect(() => { convidadoLigado().then(setLigado) }, [])

  async function entrarComConta() {
    setErro(''); setOcupado(true)
    try { navigate(`/mesa/${await entrarNaMesa(codigo)}`, { replace: true }) }
    catch (e) { setErro(e.message); setOcupado(false) }
  }

  async function entrarComoConvidado(e) {
    e.preventDefault()
    const v = validarNomeConvidado(nome)
    if (!v.ok) { setErro(v.erro); return }
    setErro(''); setOcupado(true)
    try {
      const { error } = await supabase.auth.signInAnonymously(captcha ? { options: { captchaToken: captcha } } : undefined)
      if (error) throw new Error(traduzirErroAuth(error))
      const mesaId = await entrarNaMesa(codigo)
      // o nome escolhido vira o apelido nesta mesa (o username do convidado é automático)
      await supabase.rpc('atualizar_perfil_mesa', { p_mesa_id: mesaId, p_apelido: v.nome, p_avatar_url: null })
      navigate(`/mesa/${mesaId}`, { replace: true })
    } catch (err) { setErro(err.message); setOcupado(false); setCaptcha(null); setVersaoCaptcha(v => v + 1) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-black px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center"><Marca tamanho="lg" /></div>

        <div className="velino moldura-cantos moldura-cantos-g border border-purple-800/60 rounded-2xl shadow-2xl shadow-black/60 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Ilustra nome="porta" tamanho={40} className="shrink-0" />
            <div>
              <h1 className="text-ink text-lg font-semibold">Você foi convidado para uma mesa</h1>
              <p className="text-ink-dim text-xs">Código <span className="font-mono text-ink">{codigo}</span></p>
            </div>
          </div>

          {loading || ocupado ? (
            <p className="text-ink-dim text-sm" role="status">{ocupado ? 'Abrindo a mesa…' : 'Carregando…'}</p>
          ) : session ? (
            <Botao variante="primario" tamanho="lg" className="w-full" onClick={entrarComConta}>Entrar na mesa</Botao>
          ) : (
            <>
              {ligado && (
                <form onSubmit={entrarComoConvidado} className="space-y-2">
                  <label className="flex flex-col gap-1 text-xs text-ink-dim">Como quer ser chamado na mesa?
                    <input
                      value={nome} onChange={e => setNome(e.target.value)} maxLength={LIMITE_NOME_CONVIDADO} autoFocus
                      placeholder="Seu nome ou o do personagem"
                      className="px-3 py-2.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500"
                    />
                  </label>
                  <Captcha onToken={setCaptcha} versao={versaoCaptcha} />
                  <Botao type="submit" variante="primario" tamanho="lg" className="w-full" disabled={!!CHAVE_CAPTCHA && !captcha}>Entrar como convidado</Botao>
                  <p className="text-ink-dim text-xs">
                    Sem e-mail e sem senha. Sua ficha fica guardada neste navegador, e dá para criar a conta depois sem perder nada.
                  </p>
                </form>
              )}
              {ligado && <p className="text-center text-ink-dim text-xs">ou</p>}
              <Botao
                variante={ligado ? 'contorno' : 'primario'} tamanho="lg" className="w-full"
                onClick={() => navigate('/', { state: { depois: `/convite/${codigo}` } })}
              >Entrar com minha conta ou criar uma</Botao>
            </>
          )}
          {erro && <p className="text-harm text-sm" role="alert">{erro}</p>}
        </div>
      </div>
    </div>
  )
}

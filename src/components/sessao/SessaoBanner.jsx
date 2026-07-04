import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessoes } from '../../hooks/useSessoes'

/**
 * Fase 13.1 — banner de sessão no topo da MesaPage.
 *  - Sem sessão ativa: mestre vê "Iniciar sessão"; jogador vê estado neutro.
 *  - Com sessão ativa: todos veem "AO VIVO" + "Entrar"; mestre também "Encerrar".
 */
export default function SessaoBanner({ mesaId, isGestor }) {
  const navigate = useNavigate()
  const { sessaoAtiva, loading, error, iniciarSessao, encerrarSessao } = useSessoes(mesaId)
  const [busy, setBusy] = useState(false)
  const [erroAcao, setErroAcao] = useState('')
  const [confirmEncerrar, setConfirmEncerrar] = useState(false)

  // Se a tabela ainda não existe (SQL pendente) ou erro de carga, não mostra nada
  // — a mesa segue funcionando normalmente sem UI de sessão.
  if (error) return null
  if (loading) return null

  function entrar() {
    if (sessaoAtiva) navigate(`/mesa/${mesaId}/sessao/${sessaoAtiva.id}`)
  }

  async function handleIniciar() {
    setBusy(true)
    setErroAcao('')
    try {
      const nova = await iniciarSessao()
      navigate(`/mesa/${mesaId}/sessao/${nova.id}`)
    } catch (err) {
      setErroAcao(err.message || 'Erro ao iniciar sessão.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEncerrar() {
    setBusy(true)
    setErroAcao('')
    try {
      await encerrarSessao(sessaoAtiva.id)
      setConfirmEncerrar(false)
    } catch (err) {
      setErroAcao(err.message || 'Erro ao encerrar sessão.')
    } finally {
      setBusy(false)
    }
  }

  // ---- Sessão ativa ----
  if (sessaoAtiva) {
    return (
      <div className="mt-6 rounded-2xl border border-red-700/60 bg-gradient-to-r from-red-950/60 to-slate-900/60 px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-red-300 text-xs font-bold uppercase tracking-wider shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Ao vivo
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold leading-tight truncate">
              {sessaoAtiva.titulo || 'Sessão em andamento'}
            </p>
            <p className="text-red-300/70 text-xs">Sessão em andamento nesta mesa</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={entrar}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Entrar na sessão →
            </button>
            {isGestor && !confirmEncerrar && (
              <button
                onClick={() => setConfirmEncerrar(true)}
                disabled={busy}
                className="px-3 py-2 text-red-300 hover:text-white border border-red-800 hover:border-red-600 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                Encerrar
              </button>
            )}
            {isGestor && confirmEncerrar && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleEncerrar}
                  disabled={busy}
                  className="px-3 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {busy ? '...' : 'Confirmar'}
                </button>
                <button
                  onClick={() => setConfirmEncerrar(false)}
                  disabled={busy}
                  className="px-3 py-2 text-purple-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
        {erroAcao && <p className="text-red-400 text-xs mt-2">{erroAcao}</p>}
      </div>
    )
  }

  // ---- Sem sessão ativa ----
  if (isGestor) {
    return (
      <div className="mt-6 rounded-2xl border border-purple-800/60 bg-slate-800/50 px-5 py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold leading-tight">Modo sessão</p>
            <p className="text-purple-400 text-xs">
              Inicie uma sessão ao vivo para reunir as fichas e o feed num painel compartilhado.
            </p>
          </div>
          <button
            onClick={handleIniciar}
            disabled={busy}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {busy ? 'Iniciando...' : '▶ Iniciar sessão'}
          </button>
        </div>
        {erroAcao && <p className="text-red-400 text-xs mt-2">{erroAcao}</p>}
      </div>
    )
  }

  // Jogador sem sessão ativa: estado neutro discreto
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-purple-900/60 bg-slate-900/30 px-5 py-3">
      <p className="text-purple-500 text-sm text-center">
        Nenhuma sessão ativa. Quando o mestre iniciar, o convite aparece aqui.
      </p>
    </div>
  )
}

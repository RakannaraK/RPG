import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificacoes } from '../../hooks/useNotificacoes'

/**
 * Fase 16.7 — sininho de notificações (inline no header). Contador de não lidas,
 * dropdown com a lista; clicar navega para o link e marca como lida.
 */
function tempoRel(ts) {
  if (!ts) return ''
  const seg = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (seg < 60) return 'agora'
  const min = Math.floor(seg / 60)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function Sininho() {
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes()

  function abrir(n) {
    marcarLida(n.id)
    setAberto(false)
    if (n.link) navigate(n.link)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setAberto(a => !a)}
        title="Notificações"
        className="relative p-2 text-purple-300 hover:text-white hover:bg-purple-800/50 rounded-lg transition-colors"
      >
        🔔
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-slate-900 border border-purple-800 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-900">
              <span className="text-white text-sm font-semibold">Notificações</span>
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas} className="text-purple-400 hover:text-white text-xs transition-colors">
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {notificacoes.length === 0 ? (
              <div className="py-8 text-center text-purple-500 text-sm">Nenhuma notificação.</div>
            ) : (
              <ul className="max-h-96 overflow-y-auto divide-y divide-purple-900/60">
                {notificacoes.map(n => (
                  <li key={n.id}>
                    <button
                      onClick={() => abrir(n)}
                      className={`w-full text-left px-4 py-3 transition-colors hover:bg-slate-800 ${n.lida ? '' : 'bg-purple-950/40'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.lida && <span className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${n.lida ? 'text-purple-300' : 'text-white font-medium'}`}>{n.titulo}</p>
                          {n.corpo && <p className="text-purple-500 text-xs mt-0.5 truncate">{n.corpo}</p>}
                          <p className="text-purple-700 text-[10px] mt-0.5">{tempoRel(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

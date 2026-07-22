import { useState } from 'react'

/**
 * Fase 25.5 — conceder XP a todos os personagens da sessão de uma vez (só o
 * mestre), no modo de progressão xp_direto. Mesmo padrão do DescansoGrupo
 * (F15.4): confirmar, aplicar, resumo por personagem. Ganho de XP não vai ao
 * feed (decisão da F19.3, mantida).
 */
export default function ConcederXpGrupo({ onConceder }) {
  const [aberto, setAberto] = useState(false)
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [aplicando, setAplicando] = useState(false)
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState('')

  async function aplicar() {
    const n = Math.floor(Number(quantidade))
    if (!n || n <= 0) return
    setAplicando(true)
    setErro('')
    try {
      const itens = await onConceder(n, motivo.trim())
      setResumo({ quantidade: n, itens: itens || [] })
      setAberto(false)
      setQuantidade('')
      setMotivo('')
    } catch (e) {
      setErro(e.message || 'Erro ao conceder XP.')
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-800/50 bg-amber-950/20 px-5 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-amber-300 text-sm font-medium mr-1">💰 XP do grupo:</span>
        <button
          onClick={() => { setResumo(null); setAberto(true) }}
          className="px-3 py-1.5 bg-amber-800/70 hover:bg-amber-700 text-amber-50 text-sm rounded-lg transition-colors"
        >
          Conceder a todos
        </button>
      </div>

      {resumo && (
        <div className="mt-3 border-t border-amber-900/50 pt-2">
          <p className="text-amber-300 text-xs font-medium mb-1">+{resumo.quantidade} XP concedido:</p>
          <ul className="space-y-0.5">
            {resumo.itens.map((it, i) => (
              <li key={i} className="text-purple-300 text-xs">
                <span className="text-white">{it.nome}</span>{it.erro ? <span className="text-red-400"> — falhou</span> : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Conceder XP a todos?</h3>
            <p className="text-purple-300 text-sm mb-4">
              Todos os personagens da mesa recebem a mesma quantidade de XP.
            </p>
            <div className="space-y-2 mb-4">
              <input type="number" min={1} value={quantidade} onChange={e => setQuantidade(e.target.value)}
                placeholder="Quantidade de XP" autoFocus
                className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <input type="text" value={motivo} onChange={e => setMotivo(e.target.value)}
                placeholder="Motivo (opcional, ex: Sessão 12)"
                className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            {erro && <p className="text-red-400 text-xs mb-3">{erro}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setAberto(false)}
                disabled={aplicando}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={aplicar}
                disabled={aplicando || !Number(quantidade)}
                className="flex-1 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {aplicando ? 'Aplicando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

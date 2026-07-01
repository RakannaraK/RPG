import { useState } from 'react'

/**
 * Fase 15.4 — descanso do grupo inteiro (só o mestre), na SessaoPage.
 * Escolhe o tipo de descanso, confirma e aplica a todos os personagens; cada um
 * recupera conforme suas próprias regras. Mostra resumo por personagem.
 */
export default function DescansoGrupo({ descansos = [], onDescansar }) {
  const [confirmar, setConfirmar] = useState(null) // tipo escolhido
  const [aplicando, setAplicando] = useState(false)
  const [resumo, setResumo] = useState(null) // { tipo, itens: [{nome, resumo}] }

  if (!descansos || descansos.length === 0) return null

  async function aplicar() {
    if (!confirmar) return
    setAplicando(true)
    try {
      const itens = await onDescansar(confirmar)
      setResumo({ tipo: confirmar, itens: itens || [] })
      setConfirmar(null)
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-emerald-800/50 bg-emerald-950/20 px-5 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-emerald-300 text-sm font-medium mr-1">🏕️ Descanso do grupo:</span>
        {descansos.map(d => (
          <button
            key={d.id}
            onClick={() => { setResumo(null); setConfirmar(d) }}
            className="px-3 py-1.5 bg-emerald-800/70 hover:bg-emerald-700 text-emerald-50 text-sm rounded-lg transition-colors"
          >
            {d.nome || 'Descanso'}
          </button>
        ))}
      </div>

      {resumo && (
        <div className="mt-3 border-t border-emerald-900/50 pt-2">
          <p className="text-emerald-300 text-xs font-medium mb-1">{resumo.tipo.nome} aplicado:</p>
          <ul className="space-y-0.5">
            {resumo.itens.map((it, i) => (
              <li key={i} className="text-purple-300 text-xs">
                <span className="text-white">{it.nome}</span> — {it.resumo}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmação */}
      {confirmar && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-700/60 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">{confirmar.nome} do grupo?</h3>
            <p className="text-purple-300 text-sm mb-5">
              Todos os personagens da mesa vão recuperar vida e recursos conforme as regras deste descanso.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmar(null)}
                disabled={aplicando}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={aplicar}
                disabled={aplicando}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
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

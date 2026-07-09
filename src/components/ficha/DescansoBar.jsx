import { useState } from 'react'
import { calcularDescanso } from '../../lib/restEngine'

/**
 * Fase 15.3 — botões de descanso na ficha, com preview + confirmação.
 * Calcula pelo motor puro (restEngine); só aplica após o usuário confirmar.
 * Oculto se o sistema não tem descansos configurados.
 */
export default function DescansoBar({ descansos = [], ficha, valoresFinais, habilidadesFicha = [], contextoFormula = null, onAplicar }) {
  const [preview, setPreview] = useState(null) // { tipo, resultado }
  const [aplicando, setAplicando] = useState(false)
  const [feito, setFeito] = useState('')

  if (!descansos || descansos.length === 0) return null

  function abrir(tipo) {
    const resultado = calcularDescanso({ tipoDescanso: tipo, ficha, valoresFinais, habilidadesFicha, contexto: contextoFormula })
    setPreview({ tipo, resultado })
  }

  async function confirmar() {
    if (!preview) return
    setAplicando(true)
    try {
      await onAplicar(preview.tipo, preview.resultado)
      setFeito(`${preview.tipo.nome}: ${preview.resultado.resumo}`)
      setTimeout(() => setFeito(''), 4000)
      setPreview(null)
    } finally {
      setAplicando(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-purple-300 text-sm font-medium mr-1">🏕️ Descanso:</span>
        {descansos.map(d => (
          <button
            key={d.id}
            onClick={() => abrir(d)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-purple-100 text-sm rounded-lg transition-colors"
          >
            {d.nome || 'Descanso'}
          </button>
        ))}
      </div>
      {feito && <p className="text-green-400 text-xs mt-2">✓ {feito}</p>}

      {/* Modal de confirmação com preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-1">{preview.tipo.nome}</h3>
            <p className="text-purple-300 text-sm mb-4">{preview.resultado.resumo}</p>

            <div className="space-y-1.5 mb-5 text-sm">
              {preview.resultado.vida.recuperado !== 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-400">Vida{preview.resultado.vida.notacao ? ` (${preview.resultado.vida.notacao})` : ''}</span>
                  <span className="text-white font-medium">
                    {preview.resultado.vida.de} → {preview.resultado.vida.para}
                    <span className="text-green-400 ml-1">(+{preview.resultado.vida.recuperado})</span>
                  </span>
                </div>
              )}
              {preview.resultado.vida_temp.para !== preview.resultado.vida_temp.de && (
                <div className="flex justify-between">
                  <span className="text-purple-400">Vida temporária</span>
                  <span className="text-white font-medium">{preview.resultado.vida_temp.de} → {preview.resultado.vida_temp.para}</span>
                </div>
              )}
              {preview.resultado.recursos.map(r => (
                <div key={r.habilidadeFichaId} className="flex justify-between">
                  <span className="text-purple-400">{r.nome}</span>
                  <span className="text-white font-medium">{r.de} → {r.para}</span>
                </div>
              ))}
              {preview.resultado.vida.recuperado === 0
                && preview.resultado.vida_temp.para === preview.resultado.vida_temp.de
                && preview.resultado.recursos.length === 0 && (
                <p className="text-purple-500">Nada seria recuperado.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                disabled={aplicando}
                className="flex-1 py-2.5 text-purple-300 hover:text-white border border-purple-700 hover:border-purple-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={aplicando}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {aplicando ? 'Aplicando...' : 'Confirmar descanso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

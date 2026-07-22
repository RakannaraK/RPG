import { useState } from 'react'
import { calcularDescanso } from '../../lib/restEngine'

/**
 * Fase 15.3 — botões de descanso na ficha, com preview + confirmação.
 * Calcula pelo motor puro (restEngine); só aplica após o usuário confirmar.
 * Oculto se o sistema não tem descansos configurados.
 */
export default function DescansoBar({
  descansos = [], ficha, valoresFinais, habilidadesFicha = [], contextoFormula = null, onAplicar,
  pools = [], linhasPools = [], maximosPools = {}, // 20.1
  configSlots = null, usadosSlots = {},            // 20.3
}) {
  const [preview, setPreview] = useState(null) // { tipo, resultado }
  const [aplicando, setAplicando] = useState(false)
  const [feito, setFeito] = useState('')

  if (!descansos || descansos.length === 0) return null

  function abrir(tipo) {
    const resultado = calcularDescanso({
      tipoDescanso: tipo, ficha, valoresFinais, habilidadesFicha, contexto: contextoFormula,
      pools, linhasPools, maximosPools,
      configSlots, usadosSlots,
    })
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
    <div className="bg-raised border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-accent-300 text-sm font-medium mr-1">🏕️ Descanso:</span>
        {descansos.map(d => (
          <button
            key={d.id}
            onClick={() => abrir(d)}
            className="px-3 py-1.5 bg-hover hover:bg-border text-accent-300 text-sm rounded-lg transition-colors"
          >
            {d.nome || 'Descanso'}
          </button>
        ))}
      </div>
      {feito && <p className="text-ok text-xs mt-2">✓ {feito}</p>}

      {/* Modal de confirmação com preview */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-void border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-ink font-bold text-lg mb-1">{preview.tipo.nome}</h3>
            <p className="text-accent-300 text-sm mb-4">{preview.resultado.resumo}</p>

            <div className="space-y-1.5 mb-5 text-sm">
              {preview.resultado.vida.recuperado !== 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-dim">Vida{preview.resultado.vida.notacao ? ` (${preview.resultado.vida.notacao})` : ''}</span>
                  <span className="text-ink font-medium">
                    {preview.resultado.vida.de} → {preview.resultado.vida.para}
                    <span className="text-ok ml-1">(+{preview.resultado.vida.recuperado})</span>
                  </span>
                </div>
              )}
              {preview.resultado.vida_temp.para !== preview.resultado.vida_temp.de && (
                <div className="flex justify-between">
                  <span className="text-ink-dim">Vida temporária</span>
                  <span className="text-ink font-medium">{preview.resultado.vida_temp.de} → {preview.resultado.vida_temp.para}</span>
                </div>
              )}
              {preview.resultado.recursos.map(r => (
                <div key={r.habilidadeFichaId} className="flex justify-between">
                  <span className="text-ink-dim">{r.nome}</span>
                  <span className="text-ink font-medium">{r.de} → {r.para}</span>
                </div>
              ))}
              {/* 20.1 — pools recuperados */}
              {(preview.resultado.pools || []).map(p => (
                <div key={p.poolId} className="flex justify-between">
                  <span className="text-temp">{p.nome}</span>
                  <span className="text-ink font-medium">{p.de} → {p.para}</span>
                </div>
              ))}
              {/* 20.3 — slots devolvidos */}
              {(preview.resultado.slots || []).map(s => (
                <div key={s.circulo} className="flex justify-between">
                  <span className="text-dice-400">Slots {s.circulo}º círculo</span>
                  <span className="text-ink font-medium">{s.de} → {s.para} usados</span>
                </div>
              ))}
              {preview.resultado.vida.recuperado === 0
                && preview.resultado.vida_temp.para === preview.resultado.vida_temp.de
                && preview.resultado.recursos.length === 0
                && (preview.resultado.pools || []).length === 0
                && (preview.resultado.slots || []).length === 0 && (
                <p className="text-ink-dim">Nada seria recuperado.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPreview(null)}
                disabled={aplicando}
                className="flex-1 py-2.5 text-accent-300 hover:text-ink border border-border hover:border-accent-500 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={aplicando}
                className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-ink font-semibold rounded-xl text-sm transition-colors"
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

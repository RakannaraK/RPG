import { useState, useEffect } from 'react'
import { usePericiasFicha } from '../../../hooks/usePericiasFicha'

export default function PainelPericias({ pericias, fichaId, isDono, valoresAtributos }) {
  const { periciasFicha, savePericia } = usePericiasFicha(fichaId)
  const [localBonus, setLocalBonus] = useState({})

  // Sync local bonus state when data loads
  useEffect(() => {
    const map = {}
    periciasFicha.forEach(p => { map[p.pericia_id] = p.bonus ?? 0 })
    setLocalBonus(map)
  }, [periciasFicha])

  function getPericiaFicha(periciaId) {
    return periciasFicha.find(p => p.pericia_id === periciaId) || { proficiente: false, bonus: 0 }
  }

  function getAtributoValor(atributoBaseId) {
    if (!atributoBaseId) return null
    const va = valoresAtributos.find(v => v.atributo?.id === atributoBaseId)
    return va?.valor ?? null
  }

  async function toggleProficiente(periciaId) {
    const atual = getPericiaFicha(periciaId)
    try {
      await savePericia(periciaId, { proficiente: !atual.proficiente, bonus: atual.bonus ?? 0 })
    } catch {}
  }

  async function handleBonusBlur(periciaId, rawVal) {
    const novoBonus = Number(rawVal) || 0
    const atual = getPericiaFicha(periciaId)
    try {
      await savePericia(periciaId, { proficiente: atual.proficiente ?? false, bonus: novoBonus })
    } catch {}
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Perícias</p>
      </div>
      {pericias.length === 0 ? (
        <p className="px-4 py-4 text-purple-500 text-xs">Nenhuma perícia definida no sistema.</p>
      ) : (
        <div className="divide-y divide-purple-900/40 max-h-96 overflow-y-auto">
          {pericias.map(pericia => {
            const pf = getPericiaFicha(pericia.id)
            const atributoVal = getAtributoValor(pericia.atributo_base_id)
            const bonusDisplay = pf.bonus >= 0 ? `+${pf.bonus}` : String(pf.bonus)

            return (
              <div key={pericia.id} className="flex items-center gap-2 px-3 py-2">
                {isDono ? (
                  <button
                    onClick={() => toggleProficiente(pericia.id)}
                    className={`w-4 h-4 rounded-full shrink-0 border-2 transition-colors ${
                      pf.proficiente
                        ? 'bg-amber-500 border-amber-400'
                        : 'bg-transparent border-slate-500 hover:border-purple-400'
                    }`}
                    title={pf.proficiente ? 'Proficiente (clique para remover)' : 'Não proficiente (clique para marcar)'}
                  />
                ) : (
                  <div
                    className={`w-4 h-4 rounded-full shrink-0 border-2 ${
                      pf.proficiente ? 'bg-amber-500 border-amber-400' : 'bg-transparent border-slate-600'
                    }`}
                  />
                )}

                <span className="text-white text-sm flex-1 truncate">{pericia.nome}</span>

                {atributoVal !== null && (
                  <span className="text-purple-500 text-xs shrink-0">({atributoVal})</span>
                )}

                {isDono ? (
                  <input
                    type="number"
                    value={localBonus[pericia.id] ?? pf.bonus ?? 0}
                    onChange={e =>
                      setLocalBonus(prev => ({ ...prev, [pericia.id]: e.target.value }))
                    }
                    onBlur={e => handleBonusBlur(pericia.id, e.target.value)}
                    className="w-12 px-1 py-0.5 bg-purple-950 border border-purple-700 text-white text-center rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 shrink-0"
                  />
                ) : (
                  <span className="text-white text-sm font-semibold w-8 text-right shrink-0">
                    {bonusDisplay}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

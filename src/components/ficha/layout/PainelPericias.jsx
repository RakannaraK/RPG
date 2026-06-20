import { useState, useEffect } from 'react'
import { usePericiasFicha } from '../../../hooks/usePericiasFicha'
import { useRolagem } from '../../../hooks/useRolagem'
import { tocarSomDado, estimarNumDados } from '../../../lib/diceSounds'
import { usePreferencias } from '../../../context/PreferenciasContext'
import Dice3D from '../../dados/Dice3D'

function buildNotacao(bonusPericia, atributoBaseValor, dadoPadrao) {
  const lados = dadoPadrao && dadoPadrao >= 2 ? dadoPadrao : 20
  const total = (bonusPericia || 0) + (atributoBaseValor || 0)
  if (total === 0) return `1d${lados}`
  if (total > 0) return `1d${lados}+${total}`
  return `1d${lados}${total}`
}

export default function PainelPericias({
  pericias,
  fichaId,
  isDono,
  valoresAtributos,
  mesaId,
  dadoPadrao,
}) {
  const { periciasFicha, savePericia } = usePericiasFicha(fichaId)
  const { registrarRolagem } = useRolagem()
  const { preferencias } = usePreferencias()
  const [localBonus, setLocalBonus] = useState({})
  const [rollAtivo, setRollAtivo] = useState(null)
  const [rolando, setRolando] = useState(false)

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

  async function handleRolar(pericia) {
    if (rolando) return
    const pf = getPericiaFicha(pericia.id)
    const atributoVal = getAtributoValor(pericia.atributo_base_id)
    const notacao = buildNotacao(pf.bonus, atributoVal, dadoPadrao)

    setRolando(true)
    setRollAtivo({ periciaId: pericia.id, resultado: null, rolando: true })
    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo,
      volume: preferencias.som_volume,
      numDados: estimarNumDados(notacao),
    })

    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: `Teste de ${pericia.nome}`,
        notacao,
      })
      setRollAtivo({ periciaId: pericia.id, resultado: res, rolando: false })
    } catch {
      setRollAtivo(null)
    } finally {
      setRolando(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Perícias</p>
      </div>

      {pericias.length === 0 ? (
        <p className="px-4 py-4 text-purple-500 text-xs">Nenhuma perícia definida no sistema.</p>
      ) : (
        <div className="divide-y divide-purple-900/40 max-h-[28rem] overflow-y-auto">
          {pericias.map(pericia => {
            const pf = getPericiaFicha(pericia.id)
            const atributoVal = getAtributoValor(pericia.atributo_base_id)
            const bonusDisplay = pf.bonus >= 0 ? `+${pf.bonus}` : String(pf.bonus)
            const esteRoll = rollAtivo?.periciaId === pericia.id

            return (
              <div key={pericia.id}>
                <div className="flex items-center gap-2 px-3 py-2">

                  {/* Indicador de proficiência */}
                  {isDono ? (
                    <button
                      onClick={() => toggleProficiente(pericia.id)}
                      className={`w-4 h-4 rounded-full shrink-0 border-2 transition-colors ${
                        pf.proficiente
                          ? 'bg-amber-500 border-amber-400'
                          : 'bg-transparent border-slate-500 hover:border-purple-400'
                      }`}
                      title={pf.proficiente ? 'Proficiente' : 'Não proficiente'}
                    />
                  ) : (
                    <div
                      className={`w-4 h-4 rounded-full shrink-0 border-2 ${
                        pf.proficiente
                          ? 'bg-amber-500 border-amber-400'
                          : 'bg-transparent border-slate-600'
                      }`}
                    />
                  )}

                  {/* Nome */}
                  <span className="text-white text-sm flex-1 truncate">{pericia.nome}</span>

                  {/* Valor do atributo base */}
                  {atributoVal !== null && (
                    <span className="text-purple-500 text-xs shrink-0">({atributoVal})</span>
                  )}

                  {/* Bônus */}
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

                  {/* Botão rolar — sempre visível quando há mesa */}
                  {mesaId && (
                    <button
                      onClick={() => handleRolar(pericia)}
                      disabled={rolando}
                      title={`Teste de ${pericia.nome}`}
                      className="text-amber-500 hover:text-amber-300 disabled:opacity-40 transition-colors shrink-0 text-base leading-none"
                    >
                      🎲
                    </button>
                  )}
                </div>

                {/* Resultado inline */}
                {esteRoll && rollAtivo?.resultado && (
                  <div className="mx-3 mb-2 bg-slate-700/70 border border-purple-700/50 rounded-lg px-2 py-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-purple-400 font-mono text-xs">
                        {rollAtivo.resultado.notacao}
                      </span>
                      <button
                        onClick={() => setRollAtivo(null)}
                        className="text-purple-600 hover:text-purple-400 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {rollAtivo.resultado.dados.map((d, i) => (
                        <Dice3D
                          key={i}
                          lados={d.lados}
                          resultado={d.valor}
                          rolando={rollAtivo.rolando}
                          descartado={d.descartado}
                          skin={preferencias.dado_skin}
                        />
                      ))}
                      <span className="text-white font-bold text-lg leading-none ml-1">
                        {rollAtivo.resultado.total}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

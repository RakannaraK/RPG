import { useState } from 'react'
import { useItens } from '../../../hooks/useItens'
import { useRolagem } from '../../../hooks/useRolagem'
import { validarNotacao } from '../../../lib/diceNotation'
import { playDiceRoll } from '../../../lib/diceSound'
import Dice3D from '../../dados/Dice3D'

function RollCompact({ label, resultado, rolando, onClose }) {
  return (
    <div className="bg-slate-800 rounded-lg px-2 py-1.5 flex items-center gap-2 flex-wrap">
      <span className="text-purple-400 text-xs">{label}:</span>
      <span className="text-purple-300 font-mono text-xs">{resultado.notacao}</span>
      {resultado.dados.map((d, i) => (
        <Dice3D key={i} lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} />
      ))}
      <span className="text-white font-bold text-sm">{resultado.total}</span>
      <button
        onClick={onClose}
        className="text-purple-600 hover:text-purple-400 text-xs ml-auto transition-colors"
      >
        ✕
      </button>
    </div>
  )
}

export default function AcoesTab({ fichaId, isDono, mesaId }) {
  const { itens } = useItens(fichaId)
  const { registrarRolagem } = useRolagem()
  const [rollState, setRollState] = useState({})

  const armas = itens.filter(
    i => i.tipo === 'arma' || i.atributos_extras?.ataque || i.atributos_extras?.dano
  )

  async function handleRolar(item, campo) {
    const notacao = item.atributos_extras?.[campo]
    if (!validarNotacao(notacao)) return

    playDiceRoll()
    const key = `${item.id}_${campo}`
    setRollState(prev => ({ ...prev, [key]: { resultado: null, rolando: true } }))

    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: `${item.nome} — ${campo === 'ataque' ? 'Ataque' : 'Dano'}`,
        notacao,
      })
      setRollState(prev => ({ ...prev, [key]: { resultado: res, rolando: false } }))
    } catch {
      setRollState(prev => {
        const n = { ...prev }
        delete n[key]
        return n
      })
    }
  }

  function clearRoll(key) {
    setRollState(prev => {
      const n = { ...prev }
      delete n[key]
      return n
    })
  }

  if (armas.length === 0) {
    return (
      <div className="text-center py-10 text-purple-500 text-sm">
        Nenhuma arma ou ação disponível.
        <p className="text-xs mt-1 text-purple-600">
          Em Inventário, adicione itens com as chaves <span className="font-mono">ataque</span> ou{' '}
          <span className="font-mono">dano</span> em atributos extras.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {armas.map(item => {
        const ataqueKey = `${item.id}_ataque`
        const danoKey = `${item.id}_dano`
        const ataqueState = rollState[ataqueKey]
        const danoState = rollState[danoKey]
        const temAtaque = item.atributos_extras?.ataque && validarNotacao(item.atributos_extras.ataque)
        const temDano = item.atributos_extras?.dano && validarNotacao(item.atributos_extras.dano)

        return (
          <div
            key={item.id}
            className="bg-slate-700/60 border border-purple-800/50 rounded-xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white font-medium text-sm">{item.nome}</p>
                {item.descricao && (
                  <p className="text-purple-400 text-xs truncate">{item.descricao}</p>
                )}
              </div>
              {mesaId && (temAtaque || temDano) && (
                <div className="flex gap-1.5 shrink-0">
                  {temAtaque && (
                    <button
                      onClick={() => handleRolar(item, 'ataque')}
                      disabled={ataqueState?.rolando}
                      className="px-2 py-1 text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      🎲 {item.atributos_extras.ataque}
                    </button>
                  )}
                  {temDano && (
                    <button
                      onClick={() => handleRolar(item, 'dano')}
                      disabled={danoState?.rolando}
                      className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      💥 {item.atributos_extras.dano}
                    </button>
                  )}
                </div>
              )}
            </div>

            {ataqueState?.resultado && (
              <RollCompact
                label="Ataque"
                resultado={ataqueState.resultado}
                rolando={ataqueState.rolando}
                onClose={() => clearRoll(ataqueKey)}
              />
            )}
            {danoState?.resultado && (
              <RollCompact
                label="Dano"
                resultado={danoState.resultado}
                rolando={danoState.rolando}
                onClose={() => clearRoll(danoKey)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

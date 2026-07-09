import { useState } from 'react'
import { useItens } from '../../../hooks/useItens'
import { useRolagem } from '../../../hooks/useRolagem'
import { validarNotacao, resolverNotacao } from '../../../lib/diceNotation'
import { montarNotacaoComModificadores } from '../../../lib/rollModifiers'
import { tocarSomDado, estimarNumDados } from '../../../lib/diceSounds'
import { usePreferencias } from '../../../context/PreferenciasContext'
import Dice3D from '../../dados/Dice3D'

// Resumo legível das parcelas que vieram de modificadores (Fase 12.2)
function DetalheModificadores({ detalhamento }) {
  const extras = (detalhamento || []).filter(d => d.fonte)
  if (extras.length === 0) return null
  return (
    <p className="text-purple-500 text-[10px] leading-tight">
      {extras.map((d, i) => (
        <span key={i}>
          {i > 0 && ' · '}
          {d.fonte}: {d.tipo === 'dados' ? d.valor : (d.valor > 0 ? `+${d.valor}` : d.valor)}
          {d.escopo ? ` (${d.escopo})` : ''}
        </span>
      ))}
    </p>
  )
}

function RollCompact({ label, resultado, rolando, onClose, skin, detalhamento }) {
  return (
    <div className="bg-slate-800 rounded-lg px-2 py-1.5 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-purple-400 text-xs">{label}:</span>
        <span className="text-purple-300 font-mono text-xs">{resultado.notacao}</span>
        {resultado.dados.map((d, i) => (
          <Dice3D key={i} lados={d.lados} resultado={d.valor} rolando={rolando} descartado={d.descartado} skin={skin} />
        ))}
        <span className="text-white font-bold text-sm">{resultado.total}</span>
        <button
          onClick={onClose}
          className="text-purple-600 hover:text-purple-400 text-xs ml-auto transition-colors"
        >
          ✕
        </button>
      </div>
      <DetalheModificadores detalhamento={detalhamento} />
    </div>
  )
}

export default function AcoesTab({ fichaId, isDono, mesaId, valoresFinais = {}, modificadoresAtivos = [] }) {
  const { itens } = useItens(fichaId)
  const { registrarRolagem } = useRolagem()
  const { preferencias } = usePreferencias()
  const [rollState, setRollState] = useState({})

  const armas = itens.filter(
    i => i.tipo === 'arma' || i.atributos_extras?.ataque || i.atributos_extras?.dano
  )

  // Monta a notação final de um ataque/dano aplicando os modificadores de
  // acerto/dano ativos (globais + os da categoria da arma). Fase 12.2.
  function notacaoComMods(item, campo, notacaoBase) {
    const tipo = campo === 'ataque' ? 'acerto' : 'dano'
    return montarNotacaoComModificadores({
      tipo,
      notacaoBase,
      categoria: item.atributos_extras?.categoria || null,
      modificadoresAtivos,
    })
  }

  async function handleRolar(item, campo) {
    const rawNotacao = item.atributos_extras?.[campo]
    const notacaoBase = resolverNotacao(rawNotacao, valoresFinais)
    if (!validarNotacao(notacaoBase)) return

    const { notacaoFinal, detalhamento, percentual } = notacaoComMods(item, campo, notacaoBase)

    tocarSomDado(preferencias.dado_skin, {
      ativo: preferencias.som_ativo,
      volume: preferencias.som_volume,
      numDados: estimarNumDados(notacaoFinal),
    })
    const key = `${item.id}_${campo}`
    setRollState(prev => ({ ...prev, [key]: { resultado: null, rolando: true, detalhamento } }))

    try {
      const res = await registrarRolagem({
        mesaId,
        fichaId,
        rotulo: `${item.nome} — ${campo === 'ataque' ? 'Ataque' : 'Dano'}`,
        notacao: notacaoFinal,
        percentual,
      })
      setRollState(prev => ({ ...prev, [key]: { resultado: res, rolando: false, detalhamento } }))
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
        const ataqueRaw = item.atributos_extras?.ataque
        const danoRaw   = item.atributos_extras?.dano
        const ataqueResolvido = resolverNotacao(ataqueRaw, valoresFinais)
        const danoResolvido   = resolverNotacao(danoRaw,   valoresFinais)
        const temAtaque = ataqueRaw && validarNotacao(ataqueResolvido)
        const temDano   = danoRaw   && validarNotacao(danoResolvido)
        // Notação final exibida nos botões já com os modificadores ativos
        const ataqueLabel = temAtaque ? notacaoComMods(item, 'ataque', ataqueResolvido).notacaoFinal : ataqueResolvido
        const danoLabel   = temDano   ? notacaoComMods(item, 'dano',   danoResolvido).notacaoFinal   : danoResolvido

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
                      🎲 {ataqueLabel}
                    </button>
                  )}
                  {temDano && (
                    <button
                      onClick={() => handleRolar(item, 'dano')}
                      disabled={danoState?.rolando}
                      className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      💥 {danoLabel}
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
                skin={preferencias.dado_skin}
                detalhamento={ataqueState.detalhamento}
              />
            )}
            {danoState?.resultado && (
              <RollCompact
                label="Dano"
                resultado={danoState.resultado}
                rolando={danoState.rolando}
                onClose={() => clearRoll(danoKey)}
                skin={preferencias.dado_skin}
                detalhamento={danoState.detalhamento}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useItens } from '../../hooks/useItens'
import { useRolagem } from '../../hooks/useRolagem'
import { validarNotacao, resolverNotacao } from '../../lib/diceNotation'
import { montarNotacaoComModificadores } from '../../lib/rollModifiers'
import { calcularValoresFinais } from '../../lib/modifierEngine'

/**
 * Fase 14.6 — ações/ataques do personagem ativo, dentro do combate.
 * Reusa itens (Fase 6), rolagem/feed (Fase 7) e modificadores de acerto/dano
 * (Fase 12). Ataques já saem com os buffs ativos (fúria etc.). Opcional: aplicar
 * o dano rolado direto no HP de um alvo selecionado.
 */
export default function AcoesCombate({
  fichaId, nome, modificadoresAtivos = [], combateFinais = {}, hpMax = 0,
  mesaId, sessaoId, combatentes = [], onAplicarHp,
}) {
  const { itens } = useItens(fichaId)
  const { registrarRolagem } = useRolagem()
  const [baseAttrs, setBaseAttrs] = useState({})
  const [alvoId, setAlvoId] = useState('')
  const [ultimo, setUltimo] = useState(null)

  useEffect(() => {
    let ativo = true
    supabase
      .from('valores_atributos')
      .select('atributo_id, valor')
      .eq('ficha_id', fichaId)
      .then(({ data }) => {
        if (!ativo) return
        const m = {}
        for (const v of data || []) m[v.atributo_id] = v.valor ?? 0
        setBaseAttrs(m)
      })
    return () => { ativo = false }
  }, [fichaId])

  // Atributos finais (base + mods) para resolver @tokens; combate vem do card
  const finais = calcularValoresFinais({ atributos: baseAttrs, vida_max: 0, combate: {} }, modificadoresAtivos)
  const valoresFinais = { atributos: finais.atributos, combate: combateFinais, vida_max: hpMax }

  const armas = itens.filter(i => i.tipo === 'arma' || i.atributos_extras?.ataque || i.atributos_extras?.dano)

  async function rolar(item, campo) {
    const raw = item.atributos_extras?.[campo]
    const base = resolverNotacao(raw, valoresFinais)
    if (!validarNotacao(base)) return
    const { notacaoFinal, percentual } = montarNotacaoComModificadores({
      tipo: campo === 'ataque' ? 'acerto' : 'dano',
      notacaoBase: base,
      categoria: item.atributos_extras?.categoria || null,
      modificadoresAtivos,
    })
    const res = await registrarRolagem({
      mesaId, sessaoId, fichaId,
      rotulo: `${item.nome} — ${campo === 'ataque' ? 'Ataque' : 'Dano'}`,
      notacao: notacaoFinal,
      percentual,
    })
    if (campo === 'dano' && alvoId && onAplicarHp) {
      const alvo = combatentes.find(c => c.id === alvoId)
      if (alvo) {
        await onAplicarHp(alvo, -res.total)
        setUltimo({ alvo: alvo.nome, total: res.total })
      }
    }
  }

  if (armas.length === 0) {
    return (
      <p className="text-purple-600 text-xs">
        {nome} não tem armas/ações cadastradas (adicione itens com <span className="font-mono">ataque</span>/<span className="font-mono">dano</span>).
      </p>
    )
  }

  const alvos = combatentes.filter(c => c.id !== undefined)

  return (
    <div className="space-y-2">
      {/* Alvo para o dano */}
      <div className="flex items-center gap-2">
        <span className="text-purple-400 text-xs">Alvo do dano:</span>
        <select
          value={alvoId}
          onChange={e => setAlvoId(e.target.value)}
          className="flex-1 px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          <option value="">Nenhum (só rolar)</option>
          {alvos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {armas.map(item => {
        const temAtaque = item.atributos_extras?.ataque
        const temDano = item.atributos_extras?.dano
        return (
          <div key={item.id} className="flex items-center gap-2 flex-wrap">
            <span className="text-white text-sm flex-1 min-w-0 truncate">{item.nome}</span>
            {temAtaque && (
              <button onClick={() => rolar(item, 'ataque')} className="px-2 py-1 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-lg transition-colors">🎲 Ataque</button>
            )}
            {temDano && (
              <button onClick={() => rolar(item, 'dano')} className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors">💥 Dano</button>
            )}
          </div>
        )
      })}

      {ultimo && (
        <p className="text-red-300 text-xs">
          {ultimo.total} de dano aplicado em <span className="font-semibold">{ultimo.alvo}</span>.
        </p>
      )}
    </div>
  )
}

import { useState } from 'react'
import { totalConsolidado, saldoDe, ajustar, converter, denominacaoBase } from '../../lib/moedasEngine'

const fmt = n => Number(n || 0).toLocaleString('pt-BR')

/**
 * Fase 21.6 — carteira da ficha (adaptativo: some se o sistema não tem moedas).
 * Quantidade por denominação (+/- e transação rápida), total consolidado e
 * conversor. Não trava: saldo pode ir a negativo, só avisa.
 */
export default function PainelCarteira({ moedas, carteira = {}, isDono, onSalvar }) {
  const [gasto, setGasto] = useState({}) // por denom: valor da transação rápida
  const [conv, setConv] = useState({ de: '', para: '', qtd: '' })
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)

  if (!moedas?.ativo) return null
  const denom = [...(moedas.denominacoes || [])].sort((a, b) => a.valor - b.valor)
  if (denom.length === 0) return null

  const base = denominacaoBase(denom)
  const total = totalConsolidado(carteira, denom)

  async function aplicar(nova, aviso) {
    setOcupado(true); setMsg('')
    try {
      await onSalvar(nova)
      if (aviso) setMsg(aviso)
    } catch (e) {
      setMsg(e.message || 'Erro ao salvar carteira.')
    } finally { setOcupado(false) }
  }

  function transacao(id, delta) {
    const nova = ajustar(carteira, id, delta)
    const aviso = nova[id] < 0 ? `Saldo de ${denom.find(d => d.id === id)?.sigla || id} ficou negativo.` : ''
    aplicar(nova, aviso)
  }

  function converterMoeda() {
    setMsg('')
    if (!conv.de || !conv.para || conv.de === conv.para) { setMsg('Escolha duas moedas diferentes.'); return }
    const q = Math.floor(Number(conv.qtd) || 0)
    if (q <= 0) { setMsg('Quantidade inválida.'); return }
    if (saldoDe(carteira, conv.de) < q) { setMsg('Saldo insuficiente para converter.'); return }
    const { carteira: nova, recebido, sobra } = converter(carteira, conv.de, conv.para, q, denom)
    const sd = denom.find(d => d.id === conv.de)?.sigla
    const sp = denom.find(d => d.id === conv.para)?.sigla
    aplicar(nova, `${q} ${sd} → ${recebido} ${sp}${sobra > 0 ? ` (+${sobra} ${base?.sigla})` : ''}`)
    setConv({ de: '', para: '', qtd: '' })
  }

  const selCls = 'px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500'

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-purple-200 text-sm font-semibold">Carteira</p>
        <span className="text-purple-500 text-xs">
          Total: <span className="text-amber-300 font-mono">{fmt(total)}</span> {base?.sigla}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {denom.map(d => {
          const q = saldoDe(carteira, d.id)
          return (
            <div key={d.id} className="flex items-center gap-2 bg-purple-950/40 border border-purple-800 rounded-xl px-3 py-2">
              <span className="text-purple-300 text-xs w-14 shrink-0">
                {d.sigla || d.nome}
                <span className="text-purple-600 text-[10px] block">×{d.valor}</span>
              </span>
              <span className={`text-lg font-bold font-mono flex-1 ${q < 0 ? 'text-red-400' : 'text-white'}`}>{fmt(q)}</span>
              {isDono && (
                <span className="flex items-center gap-1 shrink-0">
                  <input type="number" value={gasto[d.id] ?? ''} onChange={e => setGasto({ ...gasto, [d.id]: e.target.value })}
                    placeholder="qtd"
                    className="w-14 px-1.5 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-[11px] text-center placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  <button onClick={() => { transacao(d.id, -(Number(gasto[d.id]) || 1)); setGasto({ ...gasto, [d.id]: '' }) }}
                    disabled={ocupado} className="w-6 h-6 flex items-center justify-center rounded-lg border border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-40" title="Gastar">−</button>
                  <button onClick={() => { transacao(d.id, +(Number(gasto[d.id]) || 1)); setGasto({ ...gasto, [d.id]: '' }) }}
                    disabled={ocupado} className="w-6 h-6 flex items-center justify-center rounded-lg border border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-40" title="Ganhar">+</button>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Conversor */}
      {isDono && denom.length > 1 && (
        <div className="flex items-center gap-1.5 flex-wrap border-t border-purple-900/50 pt-2">
          <span className="text-purple-400 text-[11px]">Converter</span>
          <input type="number" value={conv.qtd} onChange={e => setConv({ ...conv, qtd: e.target.value })}
            placeholder="qtd" className="w-14 px-1.5 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-[11px] text-center placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
          <select value={conv.de} onChange={e => setConv({ ...conv, de: e.target.value })} className={selCls}>
            <option value="">de…</option>
            {denom.map(d => <option key={d.id} value={d.id}>{d.sigla || d.nome}</option>)}
          </select>
          <span className="text-purple-500 text-[11px]">→</span>
          <select value={conv.para} onChange={e => setConv({ ...conv, para: e.target.value })} className={selCls}>
            <option value="">para…</option>
            {denom.map(d => <option key={d.id} value={d.id}>{d.sigla || d.nome}</option>)}
          </select>
          <button onClick={converterMoeda} disabled={ocupado}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-40">
            Converter
          </button>
        </div>
      )}

      {msg && <p className="text-amber-400 text-xs">{msg}</p>}
    </div>
  )
}

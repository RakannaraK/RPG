import { useState } from 'react'
import { validarDistribuicao } from '../../lib/pontosEngine'

const fmtTipo = {
  ganho_inicial: 'Inicial',
  ganho_nivel: 'Nível',
  gasto: 'Distribuído',
  ajuste: 'Ajuste (mestre)',
}

/** Tela de distribuição: +/- por atributo, contador de restantes, teto. */
function Distribuir({ atributos, disponiveis, config, onConfirmar, onCancelar }) {
  const [dist, setDist] = useState({})
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const valoresBase = Object.fromEntries(atributos.map(a => [a.id, a.valor]))
  const check = validarDistribuicao({
    distribuicao: dist,
    disponiveis,
    custo_por_ponto: config.custo_por_ponto || 1,
    valoresBase,
    maximo_por_atributo: config.maximo_por_atributo ?? null,
  })

  function mudar(id, delta) {
    setDist(prev => {
      const atual = Math.max(0, (prev[id] || 0) + delta)
      return { ...prev, [id]: atual }
    })
  }

  async function confirmar() {
    setErro('')
    if (!check.valido) { setErro(check.erro); return }
    const gastos = Object.entries(dist).filter(([, d]) => d > 0)
    if (gastos.length === 0) { setErro('Nada a distribuir.'); return }
    setSalvando(true)
    try {
      await onConfirmar(dist, check.custo)
    } catch (e) {
      setErro(e.message || 'Erro ao distribuir.')
    } finally {
      setSalvando(false)
    }
  }

  const btn = 'w-6 h-6 flex items-center justify-center rounded-lg border border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 transition-colors disabled:opacity-30'

  return (
    <div className="border-t border-purple-900 pt-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-purple-300 text-xs font-medium">Distribuir pontos</p>
        <span className={`text-xs font-mono ${check.valido ? 'text-amber-300' : 'text-red-400'}`}>
          restam {check.restante}
        </span>
      </div>
      <div className="space-y-1">
        {atributos.map(a => {
          const d = dist[a.id] || 0
          return (
            <div key={a.id} className="flex items-center gap-2">
              <span className="text-purple-300 text-xs flex-1 min-w-0 truncate">{a.nome}</span>
              <span className="text-purple-500 text-xs font-mono">{a.valor}{d > 0 && <span className="text-green-400"> +{d}</span>}</span>
              <button onClick={() => mudar(a.id, -1)} disabled={d <= 0} className={btn}>−</button>
              <button onClick={() => mudar(a.id, +1)} disabled={(config.custo_por_ponto || 1) > check.restante} className={btn}>+</button>
            </div>
          )
        })}
      </div>
      {erro && <p className="text-red-400 text-[11px]">{erro}</p>}
      <p className="text-purple-600 text-[11px]">O gasto é definitivo — só o mestre corrige depois (ajuste).</p>
      <div className="flex gap-2">
        <button onClick={confirmar} disabled={salvando || !check.valido}
          className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded-lg transition-colors">
          {salvando ? '...' : 'Confirmar'}
        </button>
        <button onClick={onCancelar} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors">
          Cancelar
        </button>
      </div>
    </div>
  )
}

/**
 * Fase 22.2 — painel de pontos de status (adaptativo: some se o modo pontos
 * está desativado). Receber inicial, distribuir, histórico e ajuste do mestre.
 */
export default function PainelPontos({
  config, atributos = [], disponiveis = 0, log = [], jaRecebeuInicial,
  isDono, isMestre, inicialResolvido,
  onReceberInicial, onDistribuir, onAjustar,
}) {
  const [distribuindo, setDistribuindo] = useState(false)
  const [ajuste, setAjuste] = useState({ q: '', motivo: '' })
  const [showAjuste, setShowAjuste] = useState(false)
  const [msg, setMsg] = useState('')

  if (!config?.ativo) return null
  const rotulo = config.rotulo || 'Pontos de Status'

  async function receber() {
    setMsg('')
    try { await onReceberInicial() } catch (e) { setMsg(e.message || 'Erro.') }
  }
  async function aplicarAjuste() {
    setMsg('')
    const q = Math.trunc(Number(ajuste.q) || 0)
    if (!q) { setMsg('Informe a quantidade do ajuste.'); return }
    try {
      await onAjustar(q, ajuste.motivo)
      setAjuste({ q: '', motivo: '' }); setShowAjuste(false)
    } catch (e) { setMsg(e.message || 'Erro.') }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-4 space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-purple-200 text-sm font-semibold">{rotulo}</p>
        <span className="text-amber-300 text-sm font-mono">{disponiveis} a distribuir</span>
      </div>

      {isDono && !jaRecebeuInicial && (
        <button onClick={receber}
          className="w-full py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium transition-colors">
          Receber pontos iniciais{inicialResolvido != null && ` (${inicialResolvido})`}
        </button>
      )}

      {isDono && jaRecebeuInicial && !distribuindo && (
        <div className="flex gap-2">
          <button onClick={() => setDistribuindo(true)} disabled={disponiveis <= 0}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs rounded-lg transition-colors">
            Distribuir {disponiveis > 0 ? `(${disponiveis})` : ''}
          </button>
        </div>
      )}

      {distribuindo && (
        <Distribuir
          atributos={atributos}
          disponiveis={disponiveis}
          config={config}
          onConfirmar={async (dist, custo) => { await onDistribuir(dist, custo); setDistribuindo(false) }}
          onCancelar={() => setDistribuindo(false)}
        />
      )}

      {/* Ajuste do mestre */}
      {isMestre && (
        showAjuste ? (
          <div className="flex items-center gap-1.5 flex-wrap border-t border-purple-900/50 pt-2">
            <input type="number" value={ajuste.q} onChange={e => setAjuste({ ...ajuste, q: e.target.value })}
              placeholder="±" className="w-16 px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-purple-500" />
            <input type="text" value={ajuste.motivo} onChange={e => setAjuste({ ...ajuste, motivo: e.target.value })}
              placeholder="motivo" className="flex-1 min-w-[8rem] px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500" />
            <button onClick={aplicarAjuste} className="px-2.5 py-1 text-xs rounded-lg bg-purple-700 hover:bg-purple-600 text-white transition-colors">Ajustar</button>
            <button onClick={() => setShowAjuste(false)} className="text-purple-500 hover:text-white text-xs">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowAjuste(true)} className="text-purple-500 hover:text-white text-[11px] border-t border-purple-900/50 pt-2 w-full text-left">
            + Ajuste do mestre
          </button>
        )
      )}

      {/* Histórico */}
      {log.length > 0 && (
        <details className="text-[11px]">
          <summary className="text-purple-500 cursor-pointer hover:text-purple-300">Histórico ({log.length})</summary>
          <div className="mt-1.5 space-y-0.5 max-h-40 overflow-y-auto">
            {log.map(l => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-purple-500">
                <span>
                  {fmtTipo[l.tipo] || l.tipo}
                  {l.detalhe?.rolagem && <span className="font-mono text-purple-600"> ({l.detalhe.rolagem})</span>}
                  {l.detalhe?.motivo && <span className="text-purple-600"> — {l.detalhe.motivo}</span>}
                </span>
                <span className={`font-mono ${l.quantidade >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {l.quantidade >= 0 ? '+' : ''}{l.quantidade}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {msg && <p className="text-red-400 text-xs">{msg}</p>}
    </div>
  )
}

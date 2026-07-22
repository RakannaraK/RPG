import { useState } from 'react'
import { useRolagem } from '../../hooks/useRolagem'
import { descreverResultado } from '../../lib/resolutionEngine'

/**
 * Fase 23.4 — rerolagem gastando recurso (Força de Vontade do WoD). O jogador
 * seleciona dados da parada ORIGINAL clicando, confirma, DEBITA o pool ANTES e
 * re-resolve o contrato inteiro (sucessos recontados). Só o autor, UMA vez por
 * rolagem. Aparece apenas no modo sucessos e quando há pool com saldo.
 */
export default function RerolagemBox({ resultado, rerolagem, mesaId, fichaId, sessaoId, rotulo, onRerolado }) {
  const { rerolarResolvida, rolando } = useRolagem()
  const [sel, setSel] = useState(new Set())
  const [usado, setUsado] = useState(false)
  const [erro, setErro] = useState('')

  const params = resultado?.paramsOriginais
  const modo = resultado?.modo
  // Só sucessos por ora (o caso real do WoD); precisa da parada original e de config
  if (!rerolagem?.config?.ativo || modo !== 'sucessos' || !params?.dados?.length || usado) return null

  const custo = Math.max(0, Number(rerolagem.config.custo) || 1)
  const maxDados = Math.max(1, Number(rerolagem.config.max_dados) || 3)
  const semSaldo = (rerolagem.atual ?? 0) < custo
  const nomePool = rerolagem.pool?.nome || 'recurso'
  const parada = params.dados

  function toggle(i) {
    setSel(prev => {
      const n = new Set(prev)
      if (n.has(i)) n.delete(i)
      else if (n.size < maxDados) n.add(i)
      return n
    })
  }

  async function confirmar() {
    if (sel.size === 0 || semSaldo || rolando) return
    setErro('')
    const indices = [...sel].sort((a, b) => a - b)
    try {
      // DEBITA ANTES de rerolar (contrato 23.4)
      await rerolagem.gastar(custo)
    } catch (e) {
      setErro(e.message || 'Não foi possível gastar o recurso.')
      return
    }
    try {
      const novo = await rerolarResolvida({ mesaId, fichaId, sessaoId, rotulo, paramsOriginais: params, indices })
      setUsado(true)
      onRerolado?.(novo)
    } catch (e) {
      setErro(e.message || 'Erro ao rerolar.')
    }
  }

  const faces = params.faces
  const dif = params.dificuldade

  return (
    <div className="mt-2 rounded-lg border border-temp/50 bg-temp/30 p-2 space-y-2">
      <p className="text-temp text-[11px]">
        Rerolar até {maxDados} dado(s) gastando <span className="font-semibold">{custo} {nomePool}</span>
        {rerolagem.atual != null && <span className="text-temp"> (tem {rerolagem.atual})</span>} — clique nos dados:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {parada.map((v, i) => {
          const pontuou = v >= dif
          const escolhido = sel.has(i)
          return (
            <button key={i} onClick={() => toggle(i)}
              className={`w-8 h-8 rounded-lg border text-sm font-bold transition-colors ${
                escolhido ? 'bg-temp border-temp text-ink ring-2 ring-temp/50'
                  : pontuou ? 'bg-ok/60 border-ok/50 text-green-200'
                  : 'bg-raised border-border text-ink-dim hover:border-temp'
              }`}
              title={pontuou ? 'sucesso' : 'falha'}>
              {v}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={confirmar} disabled={sel.size === 0 || semSaldo || rolando}
          className="px-2.5 py-1 text-xs bg-temp/80 hover:bg-temp disabled:opacity-40 text-ink rounded-lg transition-colors">
          {rolando ? '🎲…' : `Rerolar ${sel.size || ''}`}
        </button>
        {semSaldo && <span className="text-dice-400 text-[11px]">Sem {nomePool} suficiente.</span>}
        {erro && <span className="text-harm text-[11px]">{erro}</span>}
      </div>
    </div>
  )
}

/** Resumo compacto do resultado rerolado, para exibir no lugar do original. */
export function ResumoRerolado({ resultado }) {
  const desc = descreverResultado(resultado?.estruturado)
  if (!desc) return null
  return <p className="text-temp text-xs mt-1">↻ {desc.texto}</p>
}

import { useState } from 'react'
import { useRelogios } from '../../hooks/useRelogios'
import Botao from '../ui/Botao'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-white text-sm placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-purple-500'

/** Segmentos do relógio: preenchidos à esquerda, vazios à direita. */
function Segmentos({ preenchido, segmentos }) {
  const total = Math.max(0, Number(segmentos) || 0)
  const cheio = Math.max(0, Math.min(total, Number(preenchido) || 0))
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-4 h-4 rounded-lg border transition-colors ${
            i < cheio ? 'bg-amber-500 border-amber-400' : 'bg-slate-900 border-purple-800'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Relógios de campanha — progresso compartilhado da mesa, que o mestre avança
 * entre sessões. Com sessões mensais, é o que dá continuidade: o mundo se move
 * mesmo quando o grupo não está jogando.
 *
 * Some por completo se a tabela ainda não existir no banco.
 */
export default function PainelRelogios({ mesaId, isGestor }) {
  const { relogios, loading, indisponivel, criar, avancar, remover } = useRelogios(mesaId)
  const [nome, setNome] = useState('')
  const [segmentos, setSegmentos] = useState(6)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  if (loading || indisponivel) return null

  async function handleCriar() {
    if (!nome.trim()) { setErro('Dê um nome ao relógio.'); return }
    setCriando(true); setErro('')
    try {
      await criar({ nome, segmentos })
      setNome(''); setSegmentos(6)
    } catch (e) {
      setErro(e.message || 'Erro ao criar o relógio.')
    } finally {
      setCriando(false)
    }
  }

  if (relogios.length === 0 && !isGestor) return null

  return (
    <div className="space-y-3">
      <div>
        <p className="text-purple-200 font-medium text-sm">Relógios da campanha</p>
        <p className="text-accent-300 text-xs mt-0.5">
          O que está em andamento no mundo, entre uma sessão e outra.
        </p>
      </div>

      {relogios.length === 0 && (
        <p className="text-accent-300 text-xs italic">Nenhum relógio ainda.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {relogios.map(r => (
          <div
            key={r.id}
            className={`rounded-xl border p-3 space-y-2 ${
              r.concluido ? 'bg-amber-950/30 border-amber-700/60' : 'bg-slate-800 border-purple-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{r.nome}</p>
                {r.descricao && <p className="text-accent-300 text-xs mt-0.5">{r.descricao}</p>}
              </div>
              <span className="text-amber-400 font-mono text-sm shrink-0">
                {r.preenchido}/{r.segmentos}
              </span>
            </div>

            <Segmentos preenchido={r.preenchido} segmentos={r.segmentos} />

            {r.concluido && (
              <p className="text-amber-300 text-xs font-semibold">✓ Completo</p>
            )}

            {isGestor && (
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button" onClick={() => avancar(r, -1)}
                  className="w-7 h-7 rounded-lg border border-purple-700 text-purple-300 hover:text-white transition-colors"
                >−</button>
                <button
                  type="button" onClick={() => avancar(r, +1)}
                  className="w-7 h-7 rounded-lg bg-amber-800 hover:bg-amber-700 text-white transition-colors"
                >+</button>
                <button
                  type="button" onClick={() => remover(r.id)}
                  className="ml-auto text-red-800 hover:text-red-500 transition-colors px-1 text-sm"
                  title="Remover relógio"
                >✕</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isGestor && (
        <div className="flex gap-2 flex-wrap items-center border-t border-purple-900/60 pt-3">
          <input
            type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Novo relógio (ex: Investigação do Inquisidor)"
            className={`${INP} flex-1 min-w-[12rem]`}
          />
          <input
            type="number" min={1} max={24} value={segmentos}
            onChange={e => setSegmentos(Number(e.target.value) || 6)}
            className={`${INP} w-16 text-center`} title="Segmentos"
          />
          <Botao variante="primario" tamanho="sm"
            type="button" onClick={handleCriar} disabled={criando}>
            {criando ? '...' : '+ Criar'}
          </Botao>
          {erro && <p className="text-red-400 text-xs w-full">{erro}</p>}
        </div>
      )}
    </div>
  )
}

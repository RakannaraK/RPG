import { useState } from 'react'
import { useProjetos } from '../../hooks/useProjetos'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-xs placeholder-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

/**
 * Projetos de downtime — o que o personagem faz nas semanas ENTRE as sessões
 * (treinar, pesquisar, forjar, cultivar contatos). Com sessões mensais, é o
 * que mantém a campanha viva fora da mesa.
 *
 * Some por completo se a tabela ainda não existir no banco.
 */
export default function PainelProjetos({ fichaId, isDono }) {
  const { projetos, loading, indisponivel, criar, progredir, remover } = useProjetos(fichaId)
  const [nome, setNome] = useState('')
  const [meta, setMeta] = useState(4)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  if (loading || indisponivel) return null
  if (projetos.length === 0 && !isDono) return null

  async function handleCriar() {
    if (!nome.trim()) { setErro('Dê um nome ao projeto.'); return }
    setCriando(true); setErro('')
    try {
      await criar({ nome, meta })
      setNome(''); setMeta(4)
    } catch (e) {
      setErro(e.message || 'Erro ao criar o projeto.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="bg-raised border border-border rounded-xl p-4 space-y-3">
      <div>
        <p className="text-ink-dim text-xs font-medium uppercase tracking-[.12em] pb-1.5 border-b border-border">
          Projetos
        </p>
        <p className="text-ink-dim text-xs mt-1.5">
          O que este personagem toca entre as sessões.
        </p>
      </div>

      {projetos.length === 0 && (
        <p className="text-ink-dim text-xs italic">Nenhum projeto em andamento.</p>
      )}

      <div className="space-y-2">
        {projetos.map(p => {
          const meta_ = Math.max(1, Number(p.meta) || 1)
          const pct = Math.min(100, ((Number(p.progresso) || 0) / meta_) * 100)
          return (
            <div
              key={p.id}
              className={`rounded-lg border p-2.5 space-y-1.5 ${
                p.concluido ? 'border-ok/50 bg-ok/10' : 'border-border bg-void/40'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-medium truncate ${p.concluido ? 'text-ok' : 'text-ink'}`}>
                  {p.concluido && '✓ '}{p.nome}
                </p>
                <span className="text-ink-dim font-mono text-xs shrink-0">
                  {p.progresso}/{p.meta}
                </span>
              </div>

              <div className="h-1.5 bg-void rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${p.concluido ? 'bg-ok' : 'bg-accent-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isDono && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button" onClick={() => progredir(p, -1)}
                    className="w-6 h-6 rounded-lg border border-border text-ink-dim hover:text-ink transition-colors text-xs"
                  >−</button>
                  <button
                    type="button" onClick={() => progredir(p, +1)}
                    className="w-6 h-6 rounded-lg bg-accent-700 hover:bg-accent-600 text-ink transition-colors text-xs"
                  >+</button>
                  <button
                    type="button" onClick={() => remover(p.id)}
                    className="ml-auto text-harm/70 hover:text-harm transition-colors px-1 text-xs"
                    title="Remover projeto"
                  >✕</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {isDono && (
        <div className="flex gap-1.5 flex-wrap items-center border-t border-border pt-2.5">
          <input
            type="text" value={nome} onChange={e => setNome(e.target.value)}
            placeholder="Novo projeto (ex: Forjar a lâmina)"
            className={`${INP} flex-1 min-w-[9rem]`}
          />
          <input
            type="number" min={1} max={99} value={meta}
            onChange={e => setMeta(Number(e.target.value) || 4)}
            className={`${INP} w-14 text-center`} title="Etapas até concluir"
          />
          <button
            type="button" onClick={handleCriar} disabled={criando}
            className="px-2.5 py-1.5 text-xs bg-accent-700 hover:bg-accent-600 disabled:opacity-50 text-ink rounded-lg transition-colors"
          >
            {criando ? '...' : '+ Criar'}
          </button>
          {erro && <p className="text-harm text-xs w-full">{erro}</p>}
        </div>
      )}
    </div>
  )
}

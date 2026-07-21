import { useState } from 'react'
import { useLinhasPoder } from '../../hooks/useLinhasPoder'

const INP = 'px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs placeholder-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500'

/**
 * Fase 25.3 — CRUD das linhas de poder do sistema.
 * Uma linha tem rating próprio (ex: uma disciplina) — cada nível do rating
 * desbloqueia os poderes daquele nível.
 */
export default function LinhasPoderEditor({ sistemaId }) {
  const { linhas, criarLinha, atualizarLinha, removerLinha } = useLinhasPoder(sistemaId)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (!sistemaId) return null

  async function handleAdicionar() {
    setErro('')
    setSalvando(true)
    try {
      await criarLinha({ nome: '', maximo: 5, auto_conceder: false })
    } catch (e) {
      setErro(e.message || 'Erro ao criar linha.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-700 rounded-xl p-4 space-y-3">
      <p className="text-purple-200 text-sm font-semibold">Linhas de poder</p>
      <p className="text-purple-500 text-xs">
        Linhas com rating próprio (ex: uma disciplina). Cada nível do rating desbloqueia os poderes daquele nível.
      </p>

      {linhas.length > 0 && (
        <div className="space-y-1.5">
          {linhas.map(l => (
            <div key={l.id} className="bg-purple-950/40 border border-purple-800 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center gap-2">
              <input
                type="text"
                defaultValue={l.nome}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v !== l.nome) atualizarLinha(l.id, { nome: v }).catch(err => setErro(err.message))
                }}
                placeholder="Nome da linha"
                className={`${INP} flex-1 min-w-[8rem]`}
              />
              <input
                type="text"
                defaultValue={l.descricao || ''}
                onBlur={e => {
                  const v = e.target.value.trim()
                  if (v !== (l.descricao || '')) atualizarLinha(l.id, { descricao: v || null }).catch(err => setErro(err.message))
                }}
                placeholder="Descrição"
                className={`${INP} flex-1 min-w-[10rem]`}
              />
              <input
                type="number"
                min={1}
                value={l.maximo ?? 5}
                onChange={e => atualizarLinha(l.id, { maximo: Number(e.target.value) || 1 }).catch(err => setErro(err.message))}
                className={`${INP} w-16 text-center`}
                title="Rating máximo"
              />
              <label className="text-purple-400 text-[11px] flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!l.auto_conceder}
                  onChange={e => atualizarLinha(l.id, { auto_conceder: e.target.checked }).catch(err => setErro(err.message))}
                  className="accent-purple-500"
                />
                conceder automaticamente os poderes do nível atingido
              </label>
              <button
                onClick={() => removerLinha(l.id).catch(err => setErro(err.message))}
                className="w-5 h-5 flex items-center justify-center text-purple-500 hover:text-red-400 transition-colors shrink-0"
                title="Remover linha"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleAdicionar}
        disabled={salvando}
        className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-purple-700 text-purple-300 hover:text-white hover:border-purple-500 disabled:opacity-50 transition-colors"
      >
        + Adicionar linha
      </button>

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

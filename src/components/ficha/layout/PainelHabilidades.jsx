import { useState } from 'react'

function Toggle({ ativa, onChange }) {
  return (
    <button
      onClick={() => onChange(!ativa)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        ativa ? 'bg-purple-600' : 'bg-slate-600'
      }`}
      title={ativa ? 'Desativar' : 'Ativar'}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        ativa ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function RecursoCounter({ hf, onAjustar, isDono }) {
  const hab = hf.habilidade
  if (!hab?.recurso_nome) return null
  const atual = hf.recurso_atual ?? hab.recurso_max
  const max = hab.recurso_max

  if (!isDono) {
    return (
      <p className="text-purple-400 text-xs mt-1">
        {hab.recurso_nome}: {atual}/{max}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-purple-400 text-xs">{hab.recurso_nome}:</span>
      <button
        onClick={() => onAjustar(hf.id, -1)}
        disabled={atual <= 0}
        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-xs flex items-center justify-center transition-colors"
      >−</button>
      <span className="text-white text-sm font-mono min-w-[2.5rem] text-center">{atual}/{max}</span>
      <button
        onClick={() => onAjustar(hf.id, +1)}
        disabled={atual >= max}
        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-xs flex items-center justify-center transition-colors"
      >+</button>
    </div>
  )
}

function OrigemBadge({ origem }) {
  if (origem === 'raca')   return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 border border-purple-700/60 text-purple-400">Raça</span>
  if (origem === 'classe') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 border border-blue-700/60 text-blue-400">Classe</span>
  return null
}

export default function PainelHabilidades({
  habilidades = [],
  habilidadesFicha = [],
  isDono,
  onToggle,
  onAdicionar,
  onRemover,
  onAjustarRecurso,
}) {
  const [selecionada, setSelecionada] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [addErro, setAddErro] = useState('')

  const passivas  = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'passiva')
  const ativaveis = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'ativavel')

  const fichaIds    = new Set(habilidadesFicha.map(hf => hf.habilidade_id))
  const disponíveis = habilidades.filter(h => !fichaIds.has(h.id))

  async function handleAdicionar() {
    if (!selecionada) { setAddErro('Selecione uma habilidade.'); return }
    setAdicionando(true)
    setAddErro('')
    try {
      await onAdicionar(selecionada)
      setSelecionada('')
    } catch (err) {
      setAddErro(err.message || 'Erro ao adicionar.')
    } finally {
      setAdicionando(false)
    }
  }

  if (habilidadesFicha.length === 0 && habilidades.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-purple-500 text-sm">Nenhuma habilidade configurada no sistema.</p>
        <p className="text-purple-600 text-xs mt-1">
          Configure habilidades em Sistema → Raças & Classes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Ativáveis */}
      {ativaveis.length > 0 && (
        <div className="space-y-2">
          <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Ativáveis</p>
          {ativaveis.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div
                key={hf.id}
                className={`rounded-xl border px-4 py-3 transition-colors duration-200 ${
                  hf.ativa
                    ? 'bg-slate-800 border-purple-600/70'
                    : 'bg-slate-900/40 border-purple-900/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isDono && (
                    <div className="pt-0.5">
                      <Toggle ativa={hf.ativa} onChange={novoEstado => onToggle(hf.id, novoEstado)} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${hf.ativa ? 'text-white' : 'text-purple-400'}`}>
                        {hab.nome}
                      </p>
                      <OrigemBadge origem={hf.origem} />
                      {!isDono && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          hf.ativa
                            ? 'bg-green-900/60 border border-green-700/60 text-green-300'
                            : 'bg-slate-700 border border-slate-600 text-slate-400'
                        }`}>
                          {hf.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      )}
                    </div>
                    {hab.descricao && (
                      <p className="text-purple-500 text-xs mt-0.5">{hab.descricao}</p>
                    )}
                    <RecursoCounter hf={hf} onAjustar={onAjustarRecurso} isDono={isDono} />
                  </div>
                  {isDono && hf.origem === 'manual' && (
                    <button
                      onClick={() => onRemover(hf.id)}
                      className="p-1 text-red-800 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                      title="Remover"
                    >✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Passivas */}
      {passivas.length > 0 && (
        <div className="space-y-2">
          <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Passivas</p>
          {passivas.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div key={hf.id} className="bg-slate-800/50 border border-purple-900/50 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-purple-200 font-medium text-sm">{hab.nome}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900/60 border border-green-700/60 text-green-300">
                        Sempre ativa
                      </span>
                      <OrigemBadge origem={hf.origem} />
                    </div>
                    {hab.descricao && (
                      <p className="text-purple-500 text-xs mt-0.5">{hab.descricao}</p>
                    )}
                  </div>
                  {isDono && hf.origem === 'manual' && (
                    <button
                      onClick={() => onRemover(hf.id)}
                      className="p-1 text-red-800 hover:text-red-500 transition-colors shrink-0"
                      title="Remover"
                    >✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Estado vazio */}
      {habilidadesFicha.length === 0 && (
        <div className="text-center py-5 border border-dashed border-purple-900 rounded-xl">
          <p className="text-purple-600 text-sm">Nenhuma habilidade nesta ficha.</p>
          {isDono && disponíveis.length > 0 && (
            <p className="text-purple-700 text-xs mt-1">Adicione uma abaixo.</p>
          )}
        </div>
      )}

      {/* Adicionar habilidade */}
      {isDono && disponíveis.length > 0 && (
        <div className="border-t border-purple-900/60 pt-4 space-y-2">
          <p className="text-purple-500 text-xs font-medium uppercase tracking-wider">Adicionar habilidade</p>
          <div className="flex gap-2">
            <select
              value={selecionada}
              onChange={e => { setSelecionada(e.target.value); setAddErro('') }}
              className="flex-1 px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Selecionar habilidade...</option>
              {disponíveis.map(h => (
                <option key={h.id} value={h.id}>
                  {h.nome} — {h.tipo === 'passiva' ? 'Passiva' : 'Ativável'}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdicionar}
              disabled={adicionando || !selecionada}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
            >
              {adicionando ? '...' : '+ Adicionar'}
            </button>
          </div>
          {addErro && <p className="text-red-400 text-xs">{addErro}</p>}
        </div>
      )}
    </div>
  )
}

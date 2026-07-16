import { useState } from 'react'
import RegraRolagem from './RegraRolagem'

export default function AtributoEditor({ atributo, onChange, onRemove, index }) {
  const [expanded, setExpanded] = useState(!atributo.nome)

  function updateField(campo, valor) {
    onChange({ ...atributo, [campo]: valor })
  }

  const isNew = !atributo.id || atributo.id.startsWith('temp_')

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      {/* Cabeçalho colapsável */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-purple-500 text-xs font-mono w-5 text-center">{index + 1}</span>
        <input
          type="text"
          placeholder="Nome do atributo (ex: Força)"
          value={atributo.nome}
          onChange={e => updateField('nome', e.target.value)}
          className="flex-1 bg-transparent text-white placeholder-purple-500 font-medium focus:outline-none text-sm"
          onClick={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-2">
          {isNew && (
            <span className="text-xs bg-purple-900 text-purple-400 px-2 py-0.5 rounded-full">novo</span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="text-purple-400 hover:text-white text-xs px-2 py-1 rounded transition-colors"
          >
            {expanded ? '▲ Fechar' : '▼ Editar'}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-red-500 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors"
            title="Remover atributo"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-purple-900 px-4 py-4 space-y-4">
          {/* 24.3 — override de exibição (NULL = padrão do sistema, aba Layout) */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-purple-300">Exibição:</label>
            <select
              value={atributo.exibicao || ''}
              onChange={e => updateField('exibicao', e.target.value || null)}
              className="px-2 py-1 rounded-lg bg-purple-950 border border-purple-700 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Padrão do sistema</option>
              <option value="numero">Número</option>
              <option value="dots">Dots (bolinhas)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-purple-300 mb-1">Descrição (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Mede a força física do personagem"
              value={atributo.descricao || ''}
              onChange={e => updateField('descricao', e.target.value)}
              className="w-full px-3 py-2 bg-purple-950 border border-purple-700 text-white placeholder-purple-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <p className="text-xs text-purple-300 font-medium mb-3">Regra de rolagem</p>
            <RegraRolagem
              value={atributo.regra_rolagem}
              onChange={regra => updateField('regra_rolagem', regra)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

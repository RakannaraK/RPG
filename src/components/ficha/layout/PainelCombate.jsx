import { useState } from 'react'
import { useValoresCombate } from '../../../hooks/useValoresCombate'

export default function PainelCombate({ campos, fichaId, isDono }) {
  const { valoresCombate, saveValor } = useValoresCombate(fichaId)
  const [editando, setEditando] = useState({})
  const [erros, setErros] = useState({})

  function getValor(campoId) {
    return valoresCombate.find(v => v.campo_id === campoId)?.valor ?? ''
  }

  async function handleBlur(campoId) {
    if (editando[campoId] === undefined) return
    try {
      await saveValor(campoId, editando[campoId])
      setEditando(prev => { const n = { ...prev }; delete n[campoId]; return n })
      setErros(prev => { const n = { ...prev }; delete n[campoId]; return n })
    } catch (err) {
      setErros(prev => ({ ...prev, [campoId]: err.message || 'Erro' }))
    }
  }

  if (campos.length === 0) return null

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Combate</p>
      </div>
      <div className="divide-y divide-purple-900/40">
        {campos.map(campo => (
          <div key={campo.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
            <span className="text-purple-300 text-sm truncate">{campo.nome}</span>
            {isDono ? (
              <div className="flex flex-col items-end gap-0.5">
                <input
                  type="text"
                  value={editando[campo.id] !== undefined ? editando[campo.id] : getValor(campo.id)}
                  onChange={e =>
                    setEditando(prev => ({ ...prev, [campo.id]: e.target.value }))
                  }
                  onBlur={() => handleBlur(campo.id)}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  placeholder="—"
                  className="w-16 px-2 py-1 bg-purple-950 border border-purple-700 text-white text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 shrink-0"
                />
                {erros[campo.id] && (
                  <span className="text-red-400 text-[10px]">{erros[campo.id]}</span>
                )}
              </div>
            ) : (
              <span className="text-white font-semibold text-sm">{getValor(campo.id) || '—'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

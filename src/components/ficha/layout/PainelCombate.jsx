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
      <div className="grid grid-cols-2 gap-px bg-purple-900/30 p-px">
        {campos.map(campo => {
          const val = editando[campo.id] !== undefined ? editando[campo.id] : getValor(campo.id)

          return (
            <div
              key={campo.id}
              className="bg-slate-800 flex flex-col items-center justify-center py-3 px-2 gap-1"
            >
              {isDono ? (
                <input
                  type="text"
                  value={val}
                  onChange={e => setEditando(prev => ({ ...prev, [campo.id]: e.target.value }))}
                  onBlur={() => handleBlur(campo.id)}
                  onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                  placeholder="—"
                  className="w-full text-center text-white font-bold text-2xl leading-none bg-transparent border-b border-purple-700 focus:border-purple-400 focus:outline-none pb-0.5"
                />
              ) : (
                <p className="text-white font-bold text-2xl leading-none">
                  {getValor(campo.id) || '—'}
                </p>
              )}
              <p className="text-purple-400 text-[11px] text-center leading-tight">{campo.nome}</p>
              {erros[campo.id] && (
                <p className="text-red-400 text-[10px]">{erros[campo.id]}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

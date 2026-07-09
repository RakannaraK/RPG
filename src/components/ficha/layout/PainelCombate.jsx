import { useState } from 'react'
import { useValoresCombate } from '../../../hooks/useValoresCombate'
import { avaliarFormula } from '../../../lib/formulaEngine'

// 17.4 — valor de um campo calculado (read-only). Falha alto e claro: "—" + erro no tooltip
function calcularCampo(campo, contextoFormula) {
  try {
    return { ok: true, valor: avaliarFormula(campo.formula, contextoFormula || {}) }
  } catch (e) {
    return { ok: false, erro: e.message }
  }
}

export default function PainelCombate({ campos, fichaId, isDono, contextoFormula = null }) {
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
          // 17.4 — campo calculado: read-only, valor via fórmula, tooltip com a conta
          if (campo.tipo === 'calculado') {
            const r = calcularCampo(campo, contextoFormula)
            return (
              <div key={campo.id} className="bg-slate-800 flex flex-col items-center justify-center py-3 px-2 gap-1 relative group/calc">
                <p className={`font-bold text-2xl leading-none ${r.ok ? 'text-purple-200' : 'text-red-400'}`}>
                  {r.ok ? r.valor : '—'}
                </p>
                <p className="text-purple-400 text-[11px] text-center leading-tight">
                  {campo.nome} <span className="text-purple-600">ƒ</span>
                </p>
                {/* Tooltip com a fórmula/erro */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 pointer-events-none
                                opacity-0 group-hover/calc:opacity-100 transition-opacity
                                bg-slate-900 border border-purple-600/80 rounded-lg px-2.5 py-1.5 shadow-2xl w-max max-w-[16rem]">
                  <p className="text-purple-300 text-[10px] font-mono break-all">{campo.formula}</p>
                  <p className={`text-[10px] mt-0.5 ${r.ok ? 'text-green-300' : 'text-red-400'}`}>
                    {r.ok ? `= ${r.valor}` : r.erro}
                  </p>
                </div>
              </div>
            )
          }

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

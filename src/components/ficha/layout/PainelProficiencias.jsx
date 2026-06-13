import { useState } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'

export default function PainelProficiencias({ ficha, isDono, onRefetch }) {
  const [valor, setValor] = useState(ficha.proficiencias || '')
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState('')
  const { updateFicha } = useUpdateFicha()

  async function handleSalvar() {
    setErro('')
    try {
      await updateFicha(ficha.id, { proficiencias: valor })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
      onRefetch()
    } catch (err) {
      setErro(err.message || 'Erro ao salvar.')
    }
  }

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-900">
        <p className="text-purple-200 text-sm font-semibold">Proficiências</p>
        {isDono && (
          <button
            onClick={handleSalvar}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              salvo
                ? 'bg-green-700 text-green-100'
                : 'bg-purple-800 hover:bg-purple-700 text-white'
            }`}
          >
            {salvo ? '✓' : 'Salvar'}
          </button>
        )}
      </div>
      <div className="p-3">
        {isDono ? (
          <textarea
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="Linguagens, armas, armaduras, ferramentas..."
            rows={4}
            className="w-full px-3 py-2 bg-purple-950 border border-purple-800 text-white placeholder-purple-500 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
          />
        ) : valor ? (
          <p className="text-white text-sm whitespace-pre-wrap">{valor}</p>
        ) : (
          <p className="text-purple-500 text-sm italic">Sem proficiências.</p>
        )}
        {erro && <p className="text-red-400 text-xs mt-1">{erro}</p>}
      </div>
    </div>
  )
}

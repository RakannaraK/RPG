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
    <div className="bg-raised border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-ink text-sm font-semibold">Proficiências</p>
        {isDono && (
          <button
            onClick={handleSalvar}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              salvo
                ? 'bg-ok text-green-100'
                : 'bg-hover hover:bg-accent-700 text-ink'
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
            className="w-full px-3 py-2 bg-void border border-border text-ink placeholder-accent-500 text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
          />
        ) : valor ? (
          <p className="text-ink text-sm whitespace-pre-wrap">{valor}</p>
        ) : (
          <p className="text-ink-dim text-sm italic">Sem proficiências.</p>
        )}
        {erro && <p className="text-harm text-xs mt-1">{erro}</p>}
      </div>
    </div>
  )
}

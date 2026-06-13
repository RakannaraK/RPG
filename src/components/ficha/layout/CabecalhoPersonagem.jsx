import { useState } from 'react'
import { useUpdateFicha } from '../../../hooks/useFicha'

export default function CabecalhoPersonagem({ ficha, rotuloVida, isDono, onRefetch }) {
  const { updateFicha } = useUpdateFicha()
  const [hpAtual, setHpAtual] = useState(ficha.hp_atual ?? '')
  const [hpMaximo, setHpMaximo] = useState(ficha.hp_maximo ?? '')
  const [hpSalvo, setHpSalvo] = useState(false)
  const [hpErro, setHpErro] = useState('')

  async function salvarHP() {
    setHpErro('')
    try {
      await updateFicha(ficha.id, {
        hp_atual: hpAtual !== '' ? Number(hpAtual) : null,
        hp_maximo: hpMaximo !== '' ? Number(hpMaximo) : null,
      })
      setHpSalvo(true)
      setTimeout(() => setHpSalvo(false), 2000)
      onRefetch()
    } catch (err) {
      setHpErro(err.message || 'Erro ao salvar.')
    }
  }

  const hpPercent =
    hpMaximo && Number(hpMaximo) > 0
      ? Math.min(100, Math.max(0, (Number(hpAtual || 0) / Number(hpMaximo)) * 100))
      : 0
  const hpColor =
    hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  const subtitulo = [
    ficha.raca,
    ficha.classe,
    ficha.nivel ? `Nível ${ficha.nivel}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="bg-slate-800 border border-purple-800 rounded-2xl p-5">
      <div className="flex gap-5 items-start">
        {ficha.imagem_url && (
          <img
            src={ficha.imagem_url}
            alt={ficha.nome_personagem}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0 border border-purple-700"
          />
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-white leading-tight">{ficha.nome_personagem}</h2>
          {subtitulo && <p className="text-purple-400 text-sm mt-0.5">{subtitulo}</p>}

          <div className="mt-3">
            <p className="text-purple-400 text-xs mb-1.5">{rotuloVida}</p>
            {isDono ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="number"
                  value={hpAtual}
                  onChange={e => setHpAtual(e.target.value)}
                  className="w-16 px-2 py-1 bg-purple-950 border border-purple-700 text-white text-center rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-purple-600">/</span>
                <input
                  type="number"
                  value={hpMaximo}
                  onChange={e => setHpMaximo(e.target.value)}
                  className="w-16 px-2 py-1 bg-purple-950 border border-purple-700 text-white text-center rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={salvarHP}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    hpSalvo
                      ? 'bg-green-700 text-green-100'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  {hpSalvo ? '✓' : 'Salvar'}
                </button>
              </div>
            ) : (
              <p className="text-white text-lg font-semibold">
                {ficha.hp_atual ?? '?'} / {ficha.hp_maximo ?? '?'}
              </p>
            )}
            {hpErro && <p className="text-red-400 text-xs mt-1">{hpErro}</p>}
            {hpMaximo && Number(hpMaximo) > 0 && (
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden w-48 max-w-full">
                <div
                  className={`h-full rounded-full transition-all ${hpColor}`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

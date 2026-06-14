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

  const hpNum = Number(hpAtual || 0)
  const hpMax = Number(hpMaximo || 0)
  const hpPercent = hpMax > 0 ? Math.min(100, Math.max(0, (hpNum / hpMax) * 100)) : 0
  const hpColor = hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

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

        {/* Avatar / retrato */}
        {ficha.imagem_url ? (
          <img
            src={ficha.imagem_url}
            alt={ficha.nome_personagem}
            className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl shrink-0 border-2 border-purple-700"
          />
        ) : (
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl shrink-0 border-2 border-purple-800 bg-purple-950 flex items-center justify-center">
            <span className="text-3xl sm:text-4xl select-none">🧙</span>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-3">
          {/* Nome e sub-info */}
          <div>
            <h2 className="text-2xl font-bold text-white leading-tight">{ficha.nome_personagem}</h2>
            {subtitulo ? (
              <p className="text-purple-400 text-sm mt-0.5">{subtitulo}</p>
            ) : (
              <p className="text-purple-600 text-sm mt-0.5 italic">Sem raça ou classe definida</p>
            )}
          </div>

          {/* HP */}
          <div>
            <p className="text-purple-400 text-xs font-medium uppercase tracking-wider mb-1.5">
              {rotuloVida}
            </p>

            {isDono ? (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-purple-950 border border-purple-700 rounded-lg px-2 py-1">
                  <input
                    type="number"
                    value={hpAtual}
                    onChange={e => setHpAtual(e.target.value)}
                    className="w-14 bg-transparent text-white text-center text-sm font-semibold focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-purple-600 text-sm">/</span>
                  <input
                    type="number"
                    value={hpMaximo}
                    onChange={e => setHpMaximo(e.target.value)}
                    className="w-14 bg-transparent text-white text-center text-sm focus:outline-none"
                    placeholder="max"
                  />
                </div>
                <button
                  onClick={salvarHP}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    hpSalvo
                      ? 'bg-green-700 text-green-100'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  {hpSalvo ? '✓ Salvo' : 'Salvar'}
                </button>
              </div>
            ) : (
              <p className="text-white text-lg font-semibold">
                {ficha.hp_atual ?? '?'}
                <span className="text-purple-500 font-normal text-sm"> / {ficha.hp_maximo ?? '?'}</span>
              </p>
            )}

            {hpErro && <p className="text-red-400 text-xs mt-1">{hpErro}</p>}

            {/* Barra de HP */}
            {hpMax > 0 && (
              <div className="mt-2 h-2.5 bg-slate-700 rounded-full overflow-hidden max-w-xs">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${hpColor}`}
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

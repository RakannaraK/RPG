import { useState } from 'react'
import { useUpdateFicha } from '../../hooks/useFicha'
import { useRolagem } from '../../hooks/useRolagem'
import AtributoCard from './AtributoCard'

export default function FichaView({ ficha, valoresAtributos, refetch, isDono, mesaId, fichaId }) {
  const { updateFicha, updateValorAtributo, loading: salvando } = useUpdateFicha()
  const { registrarRolagem } = useRolagem()

  const [hpAtual, setHpAtual] = useState(ficha.hp_atual ?? '')
  const [hpMaximo, setHpMaximo] = useState(ficha.hp_maximo ?? '')
  const [notas, setNotas] = useState(ficha.notas || '')
  const [hpSalvo, setHpSalvo] = useState(false)
  const [notasSalvas, setNotasSalvas] = useState(false)
  const [hpErro, setHpErro] = useState('')
  const [notasErro, setNotasErro] = useState('')

  async function salvarHP() {
    setHpErro('')
    try {
      await updateFicha(ficha.id, {
        hp_atual: hpAtual !== '' ? Number(hpAtual) : null,
        hp_maximo: hpMaximo !== '' ? Number(hpMaximo) : null,
      })
      setHpSalvo(true)
      setTimeout(() => setHpSalvo(false), 2000)
      refetch()
    } catch (err) {
      setHpErro(err.message || 'Erro ao salvar HP.')
    }
  }

  async function salvarNotas() {
    setNotasErro('')
    try {
      await updateFicha(ficha.id, { notas })
      setNotasSalvas(true)
      setTimeout(() => setNotasSalvas(false), 2000)
    } catch (err) {
      setNotasErro(err.message || 'Erro ao salvar notas.')
    }
  }

  async function handleSaveValor(atributoId, valor, dadosRolados) {
    await updateValorAtributo(ficha.id, atributoId, valor, dadosRolados)
    refetch()
  }

  const hpPercent =
    hpMaximo && Number(hpMaximo) > 0
      ? Math.min(100, Math.max(0, (Number(hpAtual || 0) / Number(hpMaximo)) * 100))
      : 0

  const hpColor =
    hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="space-y-6">
      {/* Informações básicas */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-purple-400 text-xs mb-1">Nome</p>
            <p className="text-white font-semibold">{ficha.nome_personagem}</p>
          </div>
          {ficha.raca && (
            <div>
              <p className="text-purple-400 text-xs mb-1">Raça</p>
              <p className="text-white">{ficha.raca}</p>
            </div>
          )}
          {ficha.classe && (
            <div>
              <p className="text-purple-400 text-xs mb-1">Classe</p>
              <p className="text-white">{ficha.classe}</p>
            </div>
          )}
          <div>
            <p className="text-purple-400 text-xs mb-1">Nível</p>
            <p className="text-white font-semibold">Nível {ficha.nivel || 1}</p>
          </div>
        </div>
      </div>

      {/* HP */}
      <div className="bg-slate-800 border border-purple-800 rounded-xl p-5">
        <p className="text-purple-200 font-medium text-sm mb-3">Pontos de vida</p>
        {isDono ? (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-sm">Atual</span>
                <input
                  type="number"
                  value={hpAtual}
                  onChange={e => setHpAtual(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-purple-950 border border-purple-700 text-white text-center rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <span className="text-purple-600 text-lg">/</span>
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-sm">Máximo</span>
                <input
                  type="number"
                  value={hpMaximo}
                  onChange={e => setHpMaximo(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-purple-950 border border-purple-700 text-white text-center rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                onClick={salvarHP}
                disabled={salvando}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  hpSalvo
                    ? 'bg-green-700 text-green-100'
                    : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                {hpSalvo ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
            {hpErro && <p className="mt-2 text-red-400 text-xs">{hpErro}</p>}
          </>
        ) : (
          <p className="text-white text-lg font-semibold">
            {ficha.hp_atual ?? '?'} / {ficha.hp_maximo ?? '?'}
          </p>
        )}

        {hpMaximo && Number(hpMaximo) > 0 && (
          <div className="mt-3 h-2.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${hpColor}`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Atributos */}
      {valoresAtributos.length > 0 && (
        <div>
          <p className="text-purple-200 font-medium text-sm mb-3">
            Atributos ({valoresAtributos.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {valoresAtributos.map(va => (
              <AtributoCard
                key={va.id}
                atributo={va.atributo}
                valorAtributo={va}
                onSave={handleSaveValor}
                canEdit={isDono}
                mesaId={mesaId}
                fichaId={fichaId}
                registrarRolagem={registrarRolagem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Notas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-purple-200 font-medium text-sm">Notas</p>
          {isDono && (
            <button
              onClick={salvarNotas}
              disabled={salvando}
              className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                notasSalvas
                  ? 'bg-green-700 text-green-100'
                  : 'bg-purple-800 hover:bg-purple-700 text-white'
              }`}
            >
              {notasSalvas ? '✓ Salvo' : 'Salvar'}
            </button>
          )}
        </div>
        {isDono ? (
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Histórico, personalidade, segredos, equipamentos, anotações..."
            rows={6}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-purple-800 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        ) : (
          <div className="px-4 py-3 rounded-xl bg-slate-800 border border-purple-800 min-h-[6rem]">
            {notas ? (
              <p className="text-white text-sm whitespace-pre-wrap">{notas}</p>
            ) : (
              <p className="text-purple-500 text-sm italic">Sem notas.</p>
            )}
          </div>
        )}
        {notasErro && <p className="mt-2 text-red-400 text-xs">{notasErro}</p>}
      </div>
    </div>
  )
}

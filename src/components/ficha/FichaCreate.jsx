import { useState } from 'react'
import { useSistema } from '../../hooks/useSistema'
import { useCreateFicha } from '../../hooks/useFicha'
import { useAuth } from '../../context/AuthContext'
import DiceRoller from './DiceRoller'

export default function FichaCreate({ mesaId, onCriada, onFechar }) {
  const { session } = useAuth()
  const { sistema, atributos, loading: loadingSistema } = useSistema(mesaId)
  const { createFicha, loading: criando } = useCreateFicha()

  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({
    nome_personagem: '',
    raca: '',
    classe: '',
    nivel: 1,
    hp_maximo: '',
  })
  const [valores, setValores] = useState({})
  const [pontosValues, setPontosValues] = useState({})
  const [erro, setErro] = useState('')

  function setInfoField(campo, valor) {
    setInfo(prev => ({ ...prev, [campo]: valor }))
  }

  function confirmarAtributo(atributoId, resultado) {
    setValores(prev => ({
      ...prev,
      [atributoId]: {
        valor: resultado.valor,
        dados_rolados:
          resultado.resultados?.length > 0
            ? {
                resultados: resultado.resultados,
                mantidos: resultado.mantidos,
                descartados: resultado.descartados,
              }
            : null,
        confirmado: true,
      },
    }))
  }

  function confirmarPontos(atributoId) {
    setValores(prev => ({
      ...prev,
      [atributoId]: {
        valor: Number(pontosValues[atributoId] || 0),
        dados_rolados: null,
        confirmado: true,
      },
    }))
  }

  function irParaStep1() {
    setErro('')
    if (!info.nome_personagem.trim()) {
      setErro('O nome do personagem é obrigatório.')
      return
    }
    setStep(1)
  }

  async function handleSalvar() {
    setErro('')

    const semConfirmar = atributos.filter(a => !valores[a.id]?.confirmado)
    if (semConfirmar.length > 0) {
      setErro(`Confirme o valor de: ${semConfirmar.map(a => a.nome).join(', ')}`)
      return
    }

    try {
      const valoresParaSalvar = atributos.map(a => ({
        atributo_id: a.id,
        valor: valores[a.id]?.valor ?? 0,
        dados_rolados: valores[a.id]?.dados_rolados || null,
      }))

      const ficha = await createFicha({
        mesaId,
        sistemaId: sistema?.id || null,
        donoId: session.user.id,
        infoBasica: {
          nome_personagem: info.nome_personagem.trim(),
          raca: info.raca.trim() || null,
          classe: info.classe.trim() || null,
          nivel: Number(info.nivel) || 1,
          hp_maximo: info.hp_maximo !== '' ? info.hp_maximo : null,
        },
        valoresAtributos: valoresParaSalvar,
      })
      onCriada(ficha)
    } catch (err) {
      setErro(err.message || 'Erro ao criar ficha.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Nova ficha de personagem</h2>
            <p className="text-purple-400 text-xs mt-0.5">
              {step === 0 ? 'Passo 1 de 2 — Informações básicas' : 'Passo 2 de 2 — Atributos'}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-purple-400 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">
                  Nome do personagem *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aldric, o Valoroso"
                  value={info.nome_personagem}
                  onChange={e => setInfoField('nome_personagem', e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Raça</label>
                  <input
                    type="text"
                    placeholder="Ex: Elfo, Humano"
                    value={info.raca}
                    onChange={e => setInfoField('raca', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Classe</label>
                  <input
                    type="text"
                    placeholder="Ex: Guerreiro, Mago"
                    value={info.classe}
                    onChange={e => setInfoField('classe', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Nível</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={info.nivel}
                    onChange={e => setInfoField('nivel', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">
                    HP máximo
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ex: 45"
                    value={info.hp_maximo}
                    onChange={e => setInfoField('hp_maximo', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {loadingSistema ? (
                <div className="py-8 text-center text-purple-400">Carregando sistema...</div>
              ) : atributos.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-purple-800 rounded-xl">
                  <p className="text-purple-300 text-sm">
                    {sistema
                      ? 'O sistema desta mesa não tem atributos definidos.'
                      : 'Esta mesa não tem sistema configurado.'}
                  </p>
                  <p className="text-purple-500 text-xs mt-1">
                    A ficha será criada sem atributos.
                  </p>
                </div>
              ) : (
                atributos.map(a => {
                  const confirmado = valores[a.id]?.confirmado
                  const isPontos = a.regra_rolagem?.tipo === 'pontos'

                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border p-4 space-y-3 transition-colors ${
                        confirmado
                          ? 'border-green-800 bg-green-950/20'
                          : 'border-purple-800 bg-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white font-semibold">{a.nome}</p>
                          {a.descricao && (
                            <p className="text-purple-400 text-xs mt-0.5">{a.descricao}</p>
                          )}
                        </div>
                        {confirmado && (
                          <div className="text-right shrink-0">
                            <p className="text-green-400 text-xs">✓ confirmado</p>
                            <p className="text-white font-bold text-xl">
                              {valores[a.id]?.valor}
                            </p>
                          </div>
                        )}
                      </div>

                      {!confirmado && isPontos && (
                        <div className="space-y-2">
                          <p className="text-purple-400 text-xs">
                            Sistema de pontos — pool:{' '}
                            <span className="text-amber-400 font-bold">
                              {a.regra_rolagem.pool_total || 27}
                            </span>{' '}
                            pts
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min={0}
                              placeholder="0"
                              value={pontosValues[a.id] ?? ''}
                              onChange={e =>
                                setPontosValues(prev => ({ ...prev, [a.id]: e.target.value }))
                              }
                              className="flex-1 px-3 py-2 bg-purple-950 border border-purple-700 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => confirmarPontos(a.id)}
                              className="px-4 py-2 text-sm bg-green-700 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
                            >
                              ✓ Confirmar
                            </button>
                          </div>
                        </div>
                      )}

                      {!confirmado && !isPontos && (
                        <DiceRoller
                          regra={a.regra_rolagem}
                          onConfirmar={resultado => confirmarAtributo(a.id, resultado)}
                        />
                      )}

                      {confirmado && (
                        <button
                          type="button"
                          onClick={() =>
                            setValores(prev => ({
                              ...prev,
                              [a.id]: { ...prev[a.id], confirmado: false },
                            }))
                          }
                          className="text-xs text-purple-400 hover:text-purple-200 transition-colors"
                        >
                          Rolar novamente
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {erro && <p className="mt-4 text-red-400 text-sm">{erro}</p>}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-purple-900 flex justify-between gap-3 shrink-0">
          {step === 0 ? (
            <>
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 text-purple-400 hover:text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={irParaStep1}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                Próximo →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setErro(''); setStep(0) }}
                className="px-4 py-2 text-purple-400 hover:text-white text-sm transition-colors"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={criando}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
              >
                {criando ? 'Salvando...' : 'Salvar ficha'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

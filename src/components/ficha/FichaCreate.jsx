import { useState } from 'react'
import { useSistema } from '../../hooks/useSistema'
import { useCreateFicha } from '../../hooks/useFicha'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import DiceRoller from './DiceRoller'
import FichaCreatePrioridades from './FichaCreatePrioridades'
import { mergeConfigLayout } from '../../lib/sistemaDefaults'

export default function FichaCreate({ mesaId, onCriada, onFechar }) {
  const { session } = useAuth()
  const { sistema, atributos, racas, classes, habilidades, loading: loadingSistema } = useSistema(mesaId)
  const { createFicha, loading: criando } = useCreateFicha()

  const [step, setStep] = useState(0)
  const [info, setInfo] = useState({
    nome_personagem: '',
    raca: '',
    classe: '',
    raca_id: null,
    classe_id: null,
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
          raca_id: info.raca_id || null,
          classe_id: info.classe_id || null,
          nivel: Number(info.nivel) || 1,
          hp_maximo: info.hp_maximo !== '' ? info.hp_maximo : null,
        },
        valoresAtributos: valoresParaSalvar,
      })

      // Auto-conceder habilidades da raça/classe selecionada (10.4)
      const habsParaAdicionar = habilidades.filter(h =>
        (info.raca_id && h.raca_id === info.raca_id) ||
        (info.classe_id && h.classe_id === info.classe_id)
      )
      if (habsParaAdicionar.length > 0) {
        try {
          await supabase.from('habilidades_ficha').insert(
            habsParaAdicionar.map(hab => ({
              ficha_id: ficha.id,
              habilidade_id: hab.id,
              ativa: hab.tipo === 'passiva',
              recurso_atual: hab.recurso_max ?? null,
              origem: hab.raca_id === info.raca_id ? 'raca' : 'classe',
            }))
          )
        } catch {}
      }

      onCriada(ficha)
    } catch (err) {
      setErro(err.message || 'Erro ao criar ficha.')
    }
  }

  // 25.4c — modo prioridades substitui a UI por completo (os hooks acima já
  // rodaram nesta renderização — isto só troca o QUE é renderizado, não pula
  // hooks; Rules of Hooks preservadas).
  if (!loadingSistema && mergeConfigLayout(sistema?.config_layout).criacao_prioridades?.ativo) {
    return <FichaCreatePrioridades mesaId={mesaId} onCriada={onCriada} onFechar={onFechar} />
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-void border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-ink font-bold text-lg">Nova ficha de personagem</h2>
            <p className="text-ink-dim text-xs mt-0.5">
              {step === 0 ? 'Passo 1 de 2 — Informações básicas' : 'Passo 2 de 2 — Atributos'}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="text-ink-dim hover:text-ink text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Nome do personagem *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aldric, o Valoroso"
                  value={info.nome_personagem}
                  onChange={e => setInfoField('nome_personagem', e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Raça</label>
                  {racas.length > 0 ? (
                    <select
                      value={info.raca_id ?? ''}
                      onChange={e => {
                        const id = e.target.value || null
                        const obj = racas.find(r => r.id === id)
                        setInfo(prev => ({ ...prev, raca_id: id, raca: obj?.nome || '' }))
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="">Nenhuma</option>
                      {racas.map(r => (
                        <option key={r.id} value={r.id}>{r.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Elfo, Humano"
                      value={info.raca}
                      onChange={e => setInfoField('raca', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Classe</label>
                  {classes.length > 0 ? (
                    <select
                      value={info.classe_id ?? ''}
                      onChange={e => {
                        const id = e.target.value || null
                        const obj = classes.find(c => c.id === id)
                        setInfo(prev => ({ ...prev, classe_id: id, classe: obj?.nome || '' }))
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    >
                      <option value="">Nenhuma</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Guerreiro, Mago"
                      value={info.classe}
                      onChange={e => setInfoField('classe', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Nível</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={info.nivel}
                    onChange={e => setInfoField('nivel', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    HP máximo
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ex: 45"
                    value={info.hp_maximo}
                    onChange={e => setInfoField('hp_maximo', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-void border border-border text-ink placeholder-accent-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {loadingSistema ? (
                <div className="py-8 text-center text-ink-dim">Carregando sistema...</div>
              ) : atributos.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border rounded-xl">
                  <p className="text-accent-300 text-sm">
                    {sistema
                      ? 'O sistema desta mesa não tem atributos definidos.'
                      : 'Esta mesa não tem sistema configurado.'}
                  </p>
                  <p className="text-ink-dim text-xs mt-1">
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
                          ? 'border-ok bg-ok/20'
                          : 'border-border bg-raised'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-ink font-semibold">{a.nome}</p>
                          {a.descricao && (
                            <p className="text-ink-dim text-xs mt-0.5">{a.descricao}</p>
                          )}
                        </div>
                        {confirmado && (
                          <div className="text-right shrink-0">
                            <p className="text-ok text-xs">✓ confirmado</p>
                            <p className="text-ink font-bold text-xl">
                              {valores[a.id]?.valor}
                            </p>
                          </div>
                        )}
                      </div>

                      {!confirmado && isPontos && (
                        <div className="space-y-2">
                          <p className="text-ink-dim text-xs">
                            Sistema de pontos — pool:{' '}
                            <span className="text-dice-400 font-bold">
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
                              className="flex-1 px-3 py-2 bg-void border border-border text-ink rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                            />
                            <button
                              type="button"
                              onClick={() => confirmarPontos(a.id)}
                              className="px-4 py-2 text-sm bg-ok/80 hover:bg-ok text-ink font-semibold rounded-lg transition-colors"
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
                          className="text-xs text-ink-dim hover:text-ink transition-colors"
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

          {erro && <p className="mt-4 text-harm text-sm">{erro}</p>}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-border flex justify-between gap-3 shrink-0">
          {step === 0 ? (
            <>
              <button
                type="button"
                onClick={onFechar}
                className="px-4 py-2 text-ink-dim hover:text-ink text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={irParaStep1}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-ink font-semibold rounded-lg text-sm transition-colors"
              >
                Próximo →
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setErro(''); setStep(0) }}
                className="px-4 py-2 text-ink-dim hover:text-ink text-sm transition-colors"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={handleSalvar}
                disabled={criando}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-ink font-semibold rounded-lg text-sm transition-colors"
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

import { useState } from 'react'
import { useSistema } from '../../hooks/useSistema'
import { useCreateFicha } from '../../hooks/useFicha'
import { useLinhasPoder } from '../../hooks/useLinhasPoder'
import { useRolagem } from '../../hooks/useRolagem'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { mergeConfigLayout } from '../../lib/sistemaDefaults'
import {
  prioridadeDoGrupo, validarOrdemGrupos, valorFinalMembro,
  validarDistribuicaoGrupo, validarPontosLivres,
} from '../../lib/prioridadesEngine'

const INP = 'w-full px-3 py-2 rounded-lg bg-purple-950 border border-purple-700 text-white placeholder-purple-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500'

/**
 * Fase 25.4c — assistente de criação por PRIORIDADES (WoD-like). Substitui o
 * FichaCreate normal quando config_layout.criacao_prioridades.ativo. Etapas
 * configuráveis pelo mestre (25.4b); validação exata via prioridadesEngine
 * (25.4a). Finalizar cria a ficha já completa (atributos/perícias/linhas).
 */
export default function FichaCreatePrioridades({ mesaId, onCriada, onFechar }) {
  const { session } = useAuth()
  const { sistema, atributos, pericias, racas, classes, loading: loadingSistema } = useSistema(mesaId)
  const { createFicha, loading: criando } = useCreateFicha()
  const { linhas: linhasPoder } = useLinhasPoder(sistema?.id)
  const { registrarEvento } = useRolagem()

  const cfg = mergeConfigLayout(sistema?.config_layout)
  const etapas = cfg.criacao_prioridades?.etapas || []

  const [fase, setFase] = useState(0) // 0 = info; 1..etapas.length = etapas; +1 = revisão
  const [info, setInfo] = useState({ nome_personagem: '', raca_id: null, classe_id: null, nivel: 1, hp_maximo: '' })
  const [estadoEtapas, setEstadoEtapas] = useState({})
  const [erro, setErro] = useState('')

  const totalFases = 1 + etapas.length + 1
  const etapaAtual = fase >= 1 && fase <= etapas.length ? etapas[fase - 1] : null

  const racaEscolhida = racas.find(r => r.id === info.raca_id) || null
  const classeEscolhida = classes.find(c => c.id === info.classe_id) || null

  function estadoDe(etapaId) { return estadoEtapas[etapaId] || {} }
  function setEstadoDe(etapaId, patch) {
    setEstadoEtapas(prev => ({ ...prev, [etapaId]: { ...(prev[etapaId] || {}), ...patch } }))
  }

  function itensDaEtapaPontos(etapa) {
    if (etapa.alvo !== 'linha_poder') return []
    if (!etapa.apenas_nativas) return linhasPoder.map(l => l.id)
    const nativas = new Set([...(racaEscolhida?.linhas_nativas || []), ...(classeEscolhida?.linhas_nativas || [])])
    return linhasPoder.filter(l => nativas.has(l.id)).map(l => l.id)
  }

  function validarEtapaAtual() {
    if (!etapaAtual) return { valido: true }
    const est = estadoDe(etapaAtual.id)
    if (etapaAtual.tipo === 'texto_guia') return { valido: true }

    if (etapaAtual.tipo === 'prioridade_grupos') {
      const ordem = est.ordem || []
      const ordemOk = validarOrdemGrupos(etapaAtual.grupos, ordem)
      if (!ordemOk.valido) return ordemOk
      for (const grupo of etapaAtual.grupos) {
        const prioridade = prioridadeDoGrupo(ordem, etapaAtual.valores_prioridade, grupo.id)
        const alocacao = (est.alocacoes || {})[grupo.id] || {}
        const r = validarDistribuicaoGrupo({
          membros: grupo.membros, prioridade, alocacao,
          basePorMembro: etapaAtual.base_por_membro, maximoPorMembro: etapaAtual.maximo_por_membro,
        })
        if (!r.valido) return { valido: false, erro: `${grupo.nome}: ${r.erro}` }
      }
      return { valido: true }
    }

    if (etapaAtual.tipo === 'pontos_livres') {
      const itens = itensDaEtapaPontos(etapaAtual)
      return validarPontosLivres({
        itens, pontos: etapaAtual.pontos, alocacao: est.alocacao || {}, maximoPorItem: etapaAtual.maximo_por_item,
      })
    }
    return { valido: true }
  }

  function irProxima() {
    setErro('')
    if (fase === 0) {
      if (!info.nome_personagem.trim()) { setErro('O nome do personagem é obrigatório.'); return }
    } else if (etapaAtual) {
      const v = validarEtapaAtual()
      if (!v.valido) { setErro(v.erro || 'Distribuição incompleta.'); return }
    }
    setFase(f => Math.min(totalFases - 1, f + 1))
  }
  function irAnterior() {
    setErro('')
    setFase(f => Math.max(0, f - 1))
  }

  function valoresAtributosFinais() {
    const out = {}
    for (const etapa of etapas) {
      if (etapa.tipo !== 'prioridade_grupos' || etapa.alvo !== 'atributo') continue
      const est = estadoDe(etapa.id)
      for (const grupo of etapa.grupos) {
        const alocacao = (est.alocacoes || {})[grupo.id] || {}
        for (const m of grupo.membros) out[m] = valorFinalMembro(etapa.base_por_membro, alocacao[m])
      }
    }
    return out
  }
  function periciasFinais() {
    const out = {}
    for (const etapa of etapas) {
      if (etapa.tipo !== 'prioridade_grupos' || etapa.alvo !== 'pericia') continue
      const est = estadoDe(etapa.id)
      for (const grupo of etapa.grupos) {
        const alocacao = (est.alocacoes || {})[grupo.id] || {}
        for (const m of grupo.membros) out[m] = valorFinalMembro(etapa.base_por_membro, alocacao[m])
      }
    }
    return out
  }
  function linhasFinais() {
    const out = {}
    for (const etapa of etapas) {
      if (etapa.tipo !== 'pontos_livres' || etapa.alvo !== 'linha_poder') continue
      const est = estadoDe(etapa.id)
      for (const [id, v] of Object.entries(est.alocacao || {})) {
        if (Number(v) > 0) out[id] = (out[id] || 0) + Number(v)
      }
    }
    return out
  }

  async function finalizar() {
    setErro('')
    try {
      const valAtr = valoresAtributosFinais()
      const ficha = await createFicha({
        mesaId,
        sistemaId: sistema?.id || null,
        donoId: session.user.id,
        infoBasica: {
          nome_personagem: info.nome_personagem.trim(),
          raca: racaEscolhida?.nome || null,
          classe: classeEscolhida?.nome || null,
          raca_id: info.raca_id || null,
          classe_id: info.classe_id || null,
          nivel: Number(info.nivel) || 1,
          hp_maximo: info.hp_maximo !== '' ? info.hp_maximo : null,
        },
        valoresAtributos: Object.entries(valAtr).map(([atributo_id, valor]) => ({ atributo_id, valor, dados_rolados: null })),
      })

      const per = periciasFinais()
      for (const [pericia_id, bonus] of Object.entries(per)) {
        try {
          await supabase.from('pericias_ficha').upsert(
            { ficha_id: ficha.id, pericia_id, proficiente: false, bonus },
            { onConflict: 'ficha_id,pericia_id' }
          )
        } catch { /* segue */ }
      }

      const linhas = linhasFinais()
      for (const [linha_id, rating] of Object.entries(linhas)) {
        try {
          await supabase.from('linhas_ficha').upsert(
            { ficha_id: ficha.id, linha_id, rating },
            { onConflict: 'ficha_id,linha_id' }
          )
        } catch { /* segue */ }
      }

      try {
        await registrarEvento({
          mesaId, fichaId: ficha.id,
          rotulo: `${ficha.nome_personagem} foi criado por prioridades`,
          notacao: '', total: 0, dados: [],
        })
      } catch { /* log é best-effort */ }

      onCriada(ficha)
    } catch (err) {
      setErro(err.message || 'Erro ao criar ficha.')
    }
  }

  if (loadingSistema) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="text-purple-300">Carregando sistema...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-purple-800 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-purple-900 shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg">Nova ficha — criação por prioridades</h2>
            <p className="text-purple-400 text-xs mt-0.5">Passo {fase + 1} de {totalFases}</p>
          </div>
          <button onClick={onFechar} className="text-purple-400 hover:text-white text-xl leading-none transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {fase === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">Nome do personagem *</label>
                <input type="text" placeholder="Ex: Aldric, o Valoroso" value={info.nome_personagem} autoFocus
                  onChange={e => setInfo(prev => ({ ...prev, nome_personagem: e.target.value }))} className={INP} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Raça</label>
                  <select value={info.raca_id ?? ''} onChange={e => setInfo(prev => ({ ...prev, raca_id: e.target.value || null }))} className={INP}>
                    <option value="">Nenhuma</option>
                    {racas.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Classe</label>
                  <select value={info.classe_id ?? ''} onChange={e => setInfo(prev => ({ ...prev, classe_id: e.target.value || null }))} className={INP}>
                    <option value="">Nenhuma</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">Nível</label>
                  <input type="number" min={1} value={info.nivel} onChange={e => setInfo(prev => ({ ...prev, nivel: e.target.value }))} className={INP} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-1">HP máximo</label>
                  <input type="number" min={1} placeholder="Ex: 45" value={info.hp_maximo} onChange={e => setInfo(prev => ({ ...prev, hp_maximo: e.target.value }))} className={INP} />
                </div>
              </div>
            </div>
          )}

          {etapaAtual?.tipo === 'prioridade_grupos' && (() => {
            const est = estadoDe(etapaAtual.id)
            const ordem = est.ordem || []
            const catalogo = etapaAtual.alvo === 'pericia' ? pericias : atributos
            const nomePorId = Object.fromEntries(catalogo.map(x => [x.id, x.nome]))
            return (
              <div className="space-y-4">
                <p className="text-white font-semibold">{etapaAtual.nome || 'Prioridades'}</p>
                <div>
                  <p className="text-purple-400 text-xs mb-1.5">Clique nos grupos na ordem de prioridade (1º = maior valor):</p>
                  <div className="flex flex-wrap gap-2">
                    {etapaAtual.grupos.map(g => {
                      const pos = ordem.indexOf(g.id)
                      return (
                        <button key={g.id} type="button"
                          onClick={() => setEstadoDe(etapaAtual.id, { ordem: pos === -1 ? [...ordem, g.id] : ordem.filter(x => x !== g.id) })}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            pos !== -1 ? 'bg-purple-700 border-purple-500 text-white' : 'bg-purple-950 border-purple-800 text-purple-300 hover:border-purple-600'
                          }`}>
                          {pos !== -1 && <span className="font-mono mr-1">{pos + 1}º</span>}{g.nome}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {ordem.length === etapaAtual.grupos.length && etapaAtual.grupos.map(grupo => {
                  const prioridade = prioridadeDoGrupo(ordem, etapaAtual.valores_prioridade, grupo.id)
                  const alocacao = (est.alocacoes || {})[grupo.id] || {}
                  const gasto = grupo.membros.reduce((s, m) => s + (Number(alocacao[m]) || 0), 0)
                  function setPonto(membroId, valor) {
                    setEstadoDe(etapaAtual.id, {
                      alocacoes: { ...(est.alocacoes || {}), [grupo.id]: { ...alocacao, [membroId]: Math.max(0, Number(valor) || 0) } },
                    })
                  }
                  return (
                    <div key={grupo.id} className="rounded-xl border border-purple-800 bg-slate-800 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-sm font-medium">{grupo.nome}</p>
                        <p className={`text-xs font-mono ${gasto === prioridade ? 'text-green-400' : 'text-amber-400'}`}>{gasto} / {prioridade}</p>
                      </div>
                      <div className="space-y-1.5">
                        {grupo.membros.map(m => (
                          <div key={m} className="flex items-center gap-2">
                            <span className="text-purple-300 text-xs flex-1">{nomePorId[m] || m}</span>
                            <span className="text-purple-600 text-[11px]">{valorFinalMembro(etapaAtual.base_por_membro, alocacao[m])}</span>
                            <input type="number" min={0} value={alocacao[m] ?? 0} onChange={e => setPonto(m, e.target.value)}
                              className="w-16 px-2 py-1 bg-purple-950 border border-purple-700 text-white text-center rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {etapaAtual?.tipo === 'pontos_livres' && (() => {
            const est = estadoDe(etapaAtual.id)
            const alocacao = est.alocacao || {}
            const itensIds = itensDaEtapaPontos(etapaAtual)
            const nomePorId = Object.fromEntries(linhasPoder.map(l => [l.id, l.nome]))
            const gasto = itensIds.reduce((s, id) => s + (Number(alocacao[id]) || 0), 0)
            function setPonto(id, valor) {
              setEstadoDe(etapaAtual.id, { alocacao: { ...alocacao, [id]: Math.max(0, Number(valor) || 0) } })
            }
            return (
              <div className="space-y-3">
                <p className="text-white font-semibold">{etapaAtual.nome || 'Pontos livres'}</p>
                <p className={`text-xs font-mono ${gasto === etapaAtual.pontos ? 'text-green-400' : 'text-amber-400'}`}>{gasto} / {etapaAtual.pontos} pontos</p>
                {itensIds.length === 0 ? (
                  <p className="text-purple-600 text-xs">Nenhum item disponível (confira as linhas nativas da raça/classe escolhida).</p>
                ) : itensIds.map(id => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-purple-300 text-sm flex-1">{nomePorId[id] || id}</span>
                    <input type="number" min={0} value={alocacao[id] ?? 0} onChange={e => setPonto(id, e.target.value)}
                      className="w-16 px-2 py-1 bg-purple-950 border border-purple-700 text-white text-center rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                ))}
              </div>
            )
          })()}

          {etapaAtual?.tipo === 'texto_guia' && (
            <div className="space-y-2">
              <p className="text-white font-semibold">{etapaAtual.nome || 'Toques finais'}</p>
              <p className="text-purple-300 text-sm whitespace-pre-wrap">{etapaAtual.descricao}</p>
            </div>
          )}

          {fase === totalFases - 1 && (
            <div className="space-y-3">
              <p className="text-white font-semibold">Revisão</p>
              <div className="rounded-xl border border-purple-800 bg-slate-800 p-3 space-y-1">
                <p className="text-purple-300 text-sm"><span className="text-purple-500">Nome:</span> {info.nome_personagem}</p>
                {racaEscolhida && <p className="text-purple-300 text-sm"><span className="text-purple-500">Raça:</span> {racaEscolhida.nome}</p>}
                {classeEscolhida && <p className="text-purple-300 text-sm"><span className="text-purple-500">Classe:</span> {classeEscolhida.nome}</p>}
              </div>
              {Object.keys(valoresAtributosFinais()).length > 0 && (
                <div className="rounded-xl border border-purple-800 bg-slate-800 p-3">
                  <p className="text-purple-400 text-xs mb-1">Atributos</p>
                  {Object.entries(valoresAtributosFinais()).map(([id, v]) => (
                    <p key={id} className="text-purple-200 text-xs">{(atributos.find(a => a.id === id)?.nome) || id}: <span className="text-white font-bold">{v}</span></p>
                  ))}
                </div>
              )}
              {Object.keys(periciasFinais()).length > 0 && (
                <div className="rounded-xl border border-purple-800 bg-slate-800 p-3">
                  <p className="text-purple-400 text-xs mb-1">Perícias</p>
                  {Object.entries(periciasFinais()).map(([id, v]) => (
                    <p key={id} className="text-purple-200 text-xs">{(pericias.find(p => p.id === id)?.nome) || id}: <span className="text-white font-bold">{v}</span></p>
                  ))}
                </div>
              )}
              {Object.keys(linhasFinais()).length > 0 && (
                <div className="rounded-xl border border-purple-800 bg-slate-800 p-3">
                  <p className="text-purple-400 text-xs mb-1">Linhas de poder</p>
                  {Object.entries(linhasFinais()).map(([id, v]) => (
                    <p key={id} className="text-purple-200 text-xs">{(linhasPoder.find(l => l.id === id)?.nome) || id}: <span className="text-white font-bold">{v}</span></p>
                  ))}
                </div>
              )}
            </div>
          )}

          {erro && <p className="text-red-400 text-sm">{erro}</p>}
        </div>

        <div className="px-6 py-4 border-t border-purple-900 flex justify-between gap-3 shrink-0">
          {fase === 0 ? (
            <button type="button" onClick={onFechar} className="px-4 py-2 text-purple-400 hover:text-white text-sm transition-colors">Cancelar</button>
          ) : (
            <button type="button" onClick={irAnterior} className="px-4 py-2 text-purple-400 hover:text-white text-sm transition-colors">← Voltar</button>
          )}
          {fase === totalFases - 1 ? (
            <button type="button" onClick={finalizar} disabled={criando}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors">
              {criando ? 'Salvando...' : 'Finalizar'}
            </button>
          ) : (
            <button type="button" onClick={irProxima}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm transition-colors">
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

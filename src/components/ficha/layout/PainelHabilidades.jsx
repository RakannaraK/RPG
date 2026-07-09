import { useState } from 'react'

function Toggle({ ativa, onChange }) {
  return (
    <button
      onClick={() => onChange(!ativa)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        ativa ? 'bg-purple-600' : 'bg-slate-600'
      }`}
      title={ativa ? 'Desativar' : 'Ativar'}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        ativa ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  )
}

function RecursoCounter({ hf, onAjustar, isDono }) {
  const hab = hf.habilidade
  if (!hab?.recurso_nome) return null
  const atual = hf.recurso_atual ?? hab.recurso_max
  const max = hab.recurso_max

  if (!isDono) {
    return (
      <p className="text-purple-400 text-xs mt-1">
        {hab.recurso_nome}: {atual}/{max}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-purple-400 text-xs">{hab.recurso_nome}:</span>
      <button
        onClick={() => onAjustar(hf.id, -1)}
        disabled={atual <= 0}
        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-xs flex items-center justify-center transition-colors"
      >−</button>
      <span className="text-white text-sm font-mono min-w-[2.5rem] text-center">{atual}/{max}</span>
      <button
        onClick={() => onAjustar(hf.id, +1)}
        disabled={atual >= max}
        className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-xs flex items-center justify-center transition-colors"
      >+</button>
    </div>
  )
}

function OrigemBadge({ origem }) {
  if (origem === 'raca')   return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 border border-purple-700/60 text-purple-400">Raça</span>
  if (origem === 'classe') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 border border-blue-700/60 text-blue-400">Classe</span>
  return null
}

// Botões de efeitos pontuais (cura / vida temporária) da habilidade — Fase 12.4
function AcoesPontuais({ hf, onUsarAcao, isDono }) {
  if (!isDono || !onUsarAcao) return null
  const mods = (hf.habilidade?.modificadores || []).filter(
    m => (m.tipo === 'cura' || m.tipo === 'vida_temp_acao') && m.operacao !== 'continua'
  )
  if (mods.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {mods.map(m => {
        const ehCura = m.tipo === 'cura'
        const valor = (m.valor ?? '').toString().trim() || '0'
        return (
          <button
            key={m.id}
            onClick={() => onUsarAcao(m, hf.habilidade.nome)}
            className={`px-2 py-1 text-xs rounded-lg text-white transition-colors ${
              ehCura ? 'bg-green-700 hover:bg-green-600' : 'bg-sky-700 hover:bg-sky-600'
            }`}
          >
            {ehCura ? `💚 Curar ${valor}` : `🛡 +${valor} vida temp`}
          </button>
        )
      })}
    </div>
  )
}

// 19.4 — rastreabilidade: qual faixa está valendo agora. Ex: "(faixa 11–16, nível 13)"
function rotuloFaixa(m, nomes = {}) {
  if (m._faixaErro) return ' (fora das faixas)'
  const fa = m._faixaAtiva
  if (!fa) return ''
  const intervalo = fa.ate == null ? `${fa.de}+` : `${fa.de}–${fa.ate}`
  const v = String(fa.variavel || 'nivel')
  const escala = v.startsWith('nivel:')
    ? `nível de ${nomes[v.slice('nivel:'.length)] || v.slice('nivel:'.length)}`
    : 'nível'
  return ` (faixa ${intervalo}, ${escala} ${fa.valorVariavel})`
}

// Descrição curta e legível do efeito de um modificador (Fase 12.7). Resolve o
// alvo (id de atributo/perícia/combate) para nome via `nomes` quando possível.
function descreverEfeito(m, nomes = {}) {
  const faixaTxt = rotuloFaixa(m, nomes)
  const perc = m.operacao === 'percentual'
  const sinal = perc ? '' : m.operacao === 'multiplicar' ? '×' : m.operacao === 'definir' ? '=' : '+'
  const v = (m.valor ?? '').toString().trim()
  const suf = perc ? '%' : '' // Fase 18 — percentual leva sufixo %
  const sinalPre = perc ? (v.startsWith('-') ? '' : '+') : sinal
  const extra = (m.dados_extras ?? '').toString().trim()
  const alvoTxt = (m.alvo ?? '').toString().trim()
  const nomeAlvo = nomes[m.alvo] || alvoTxt
  // acerto/dano: valor é bônus fixo, dados_extras são dados adicionais — ambos somam
  const comSinal = n => (n.startsWith('-') || n.startsWith('+') ? n : `+${n}`)
  const acDano = [v && comSinal(v), extra && comSinal(extra), m.percentual_rolagem && `+${m.percentual_rolagem}%`].filter(Boolean).join(' ')
  const base = (() => {
    switch (m.tipo) {
      case 'acerto':          return `Acerto ${acDano}`.trim()
      case 'dano':            return `Dano ${acDano}`.trim()
      case 'resistencia':     return `Resistência: ${alvoTxt || v}`
      case 'imunidade':       return `Imunidade: ${alvoTxt || v}`
      case 'vulnerabilidade': return `Vulnerabilidade: ${alvoTxt || v}`
      case 'vantagem':        return `Vantagem${nomeAlvo ? ` em ${nomeAlvo}` : ''}`
      case 'desvantagem':     return `Desvantagem${nomeAlvo ? ` em ${nomeAlvo}` : ''}`
      case 'vida_max':        return `Vida máx ${sinalPre}${v}${suf}`
      case 'vida_temp':       return `Vida temp +${v}`
      case 'cura':            return `Cura ${v}`
      case 'vida_temp_acao':  return `Vida temp ${v}`
      case 'atributo':        return `${nomeAlvo || 'Atributo'} ${sinalPre}${v}${suf}`
      case 'combate':         return `${nomeAlvo || 'Combate'} ${sinalPre}${v}${suf}`
      default:                return m.tipo
    }
  })()
  return base + faixaTxt
}

// Texto curto da condição de um modificador (auto/manual), ou null se incondicional.
function descreverCondicao(m) {
  if (m.condicao_tipo === 'manual') return (m.condicao_config?.rotulo || '').trim() || 'manual'
  if (m.condicao_tipo === 'auto') {
    const c = m.condicao_config || {}
    if (c.metrica === 'vida_percent')    return `se vida ${c.operador || ''} ${c.valor}%`
    if (c.metrica === 'nivel')           return `se nível ${c.operador || ''} ${c.valor}`
    if (c.metrica === 'habilidade_ativa') return 'se habilidade ativa'
    return 'condicional'
  }
  return null
}

// Resumo legível dos efeitos de uma habilidade na ficha (Fase 12.7). Efeitos
// condicionais ganham um ponto verde (condição satisfeita agora) ou cinza
// (suprimido), dando feedback quando um bônus entra/sai sozinho.
function ResumoEfeitos({ modificadores = [], idsAtivos, nomes = {}, emJogo }) {
  if (!modificadores || modificadores.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {modificadores.map(m => {
        const cond = descreverCondicao(m)
        const ativo = emJogo && idsAtivos?.has(m.id)
        const base = cond
          ? (ativo
              ? 'bg-green-900/30 border-green-700/60 text-green-300'
              : 'bg-slate-800 border-purple-900/60 text-purple-500')
          : 'bg-slate-700/50 border-purple-800/50 text-purple-300'
        return (
          <span
            key={m.id}
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${base}`}
            title={cond ? (ativo ? 'Ativo agora' : 'Inativo — condição não satisfeita') : undefined}
          >
            {cond && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ativo ? 'bg-green-400' : 'bg-slate-500'}`} />
            )}
            {descreverEfeito(m, nomes)}
            {cond && <span className="text-purple-600">· {cond}</span>}
          </span>
        )
      })}
    </div>
  )
}

// Fase 12.6 — interruptores situacionais (modificadores com condição manual)
function CondicoesManuais({ condicoes, estado, onToggle, isDono, nomes = {} }) {
  if (!condicoes || condicoes.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Condições situacionais</p>
      {condicoes.map(m => {
        const ativa = estado?.[m.id] === true
        const rotulo = (m.condicao_config?.rotulo || '').trim() || 'Condição'
        return (
          <div
            key={m.id}
            className={`rounded-xl border px-4 py-2.5 transition-colors duration-200 ${
              ativa ? 'bg-slate-800 border-amber-600/70' : 'bg-slate-900/40 border-purple-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {isDono ? (
                <Toggle ativa={ativa} onChange={novo => onToggle(m.id, novo)} />
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                  ativa
                    ? 'bg-green-900/60 border border-green-700/60 text-green-300'
                    : 'bg-slate-700 border border-slate-600 text-slate-400'
                }`}>
                  {ativa ? 'Ativa' : 'Inativa'}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${ativa ? 'text-amber-200' : 'text-purple-400'}`}>{rotulo}</p>
                <p className="text-purple-500 text-xs mt-0.5 truncate">
                  {descreverEfeito(m, nomes)}
                  {m._fonte && <span className="text-purple-700"> · {m._fonte}</span>}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PainelHabilidades({
  habilidades = [],
  habilidadesFicha = [],
  isDono,
  onToggle,
  onAdicionar,
  onRemover,
  onAjustarRecurso,
  onRecuperarRecursos,
  onUsarAcao,
  condicoesManuais = {},
  condicoesManuaisDisponiveis = [],
  onToggleCondicao,
  modificadoresAtivos = [],
  nomesAlvos = {},
  habilidadesBloqueadas = [], // 19.5 — visíveis, mas inativas até o nível
}) {
  const [selecionada, setSelecionada] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [addErro, setAddErro] = useState('')
  const [avisos, setAvisos] = useState({}) // 15.5 — aviso de recurso zerado

  // 15.5 — ativar consome recurso (no hook); aqui só avisamos se ativou sem usos
  function handleToggle(hf, novoEstado) {
    const hab = hf.habilidade
    const semRecurso = novoEstado && hab?.recurso_max != null && (hf.recurso_atual ?? hab.recurso_max) <= 0
    setAvisos(prev => {
      const n = { ...prev }
      if (semRecurso) n[hf.id] = `Sem ${hab.recurso_nome || 'usos'} disponíveis — ativada mesmo assim.`
      else delete n[hf.id]
      return n
    })
    if (semRecurso) setTimeout(() => setAvisos(prev => { const n = { ...prev }; delete n[hf.id]; return n }), 4000)
    onToggle(hf.id, novoEstado)
  }

  // 12.7 — ids dos modificadores atualmente em vigor (pós-filtro de condição),
  // para marcar quais efeitos condicionais estão ativos agora.
  const idsAtivos = new Set(modificadoresAtivos.map(m => m.id))

  const passivas   = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'passiva')
  const ativaveis  = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'ativavel')
  const temRecurso = ativaveis.some(hf => hf.habilidade?.recurso_nome)

  const fichaIds    = new Set(habilidadesFicha.map(hf => hf.habilidade_id))
  const disponíveis = habilidades.filter(h => !fichaIds.has(h.id))

  async function handleAdicionar() {
    if (!selecionada) { setAddErro('Selecione uma habilidade.'); return }
    setAdicionando(true)
    setAddErro('')
    try {
      await onAdicionar(selecionada)
      setSelecionada('')
    } catch (err) {
      setAddErro(err.message || 'Erro ao adicionar.')
    } finally {
      setAdicionando(false)
    }
  }

  if (habilidadesFicha.length === 0 && habilidades.length === 0 && condicoesManuaisDisponiveis.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-purple-500 text-sm">Nenhuma habilidade configurada no sistema.</p>
        <p className="text-purple-600 text-xs mt-1">
          Configure habilidades em Sistema → Raças & Classes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Ativáveis */}
      {ativaveis.length > 0 && (
        <div className="space-y-2">
          <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Ativáveis</p>
          {ativaveis.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div
                key={hf.id}
                className={`rounded-xl border px-4 py-3 transition-colors duration-200 ${
                  hf.ativa
                    ? 'bg-slate-800 border-purple-600/70'
                    : 'bg-slate-900/40 border-purple-900/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isDono && (
                    <div className="pt-0.5">
                      <Toggle ativa={hf.ativa} onChange={novoEstado => handleToggle(hf, novoEstado)} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-medium text-sm ${hf.ativa ? 'text-white' : 'text-purple-400'}`}>
                        {hab.nome}
                      </p>
                      <OrigemBadge origem={hf.origem} />
                      {!isDono && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          hf.ativa
                            ? 'bg-green-900/60 border border-green-700/60 text-green-300'
                            : 'bg-slate-700 border border-slate-600 text-slate-400'
                        }`}>
                          {hf.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      )}
                    </div>
                    {hab.descricao && (
                      <p className="text-purple-500 text-xs mt-0.5">{hab.descricao}</p>
                    )}
                    <RecursoCounter hf={hf} onAjustar={onAjustarRecurso} isDono={isDono} />
                    {avisos[hf.id] && <p className="text-amber-400 text-xs mt-1">⚠ {avisos[hf.id]}</p>}
                    <ResumoEfeitos
                      modificadores={hab.modificadores}
                      idsAtivos={idsAtivos}
                      nomes={nomesAlvos}
                      emJogo={hf.ativa}
                    />
                    <AcoesPontuais hf={hf} onUsarAcao={onUsarAcao} isDono={isDono} />
                  </div>
                  {isDono && hf.origem === 'manual' && (
                    <button
                      onClick={() => onRemover(hf.id)}
                      className="p-1 text-red-800 hover:text-red-500 transition-colors shrink-0 mt-0.5"
                      title="Remover"
                    >✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Passivas */}
      {passivas.length > 0 && (
        <div className="space-y-2">
          <p className="text-purple-400 text-xs font-medium uppercase tracking-wider">Passivas</p>
          {passivas.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div key={hf.id} className="bg-slate-800/50 border border-purple-900/50 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-purple-200 font-medium text-sm">{hab.nome}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-900/60 border border-green-700/60 text-green-300">
                        Sempre ativa
                      </span>
                      <OrigemBadge origem={hf.origem} />
                    </div>
                    {hab.descricao && (
                      <p className="text-purple-500 text-xs mt-0.5">{hab.descricao}</p>
                    )}
                    <ResumoEfeitos
                      modificadores={hab.modificadores}
                      idsAtivos={idsAtivos}
                      nomes={nomesAlvos}
                      emJogo={true}
                    />
                    <AcoesPontuais hf={hf} onUsarAcao={onUsarAcao} isDono={isDono} />
                  </div>
                  {isDono && hf.origem === 'manual' && (
                    <button
                      onClick={() => onRemover(hf.id)}
                      className="p-1 text-red-800 hover:text-red-500 transition-colors shrink-0"
                      title="Remover"
                    >✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Condições situacionais (Fase 12.6) */}
      <CondicoesManuais
        condicoes={condicoesManuaisDisponiveis}
        estado={condicoesManuais}
        onToggle={onToggleCondicao}
        isDono={isDono}
        nomes={nomesAlvos}
      />

      {/* Estado vazio */}
      {habilidadesFicha.length === 0 && condicoesManuaisDisponiveis.length === 0 && (
        <div className="text-center py-5 border border-dashed border-purple-900 rounded-xl">
          <p className="text-purple-600 text-sm">Nenhuma habilidade nesta ficha.</p>
          {isDono && disponíveis.length > 0 && (
            <p className="text-purple-700 text-xs mt-1">Adicione uma abaixo.</p>
          )}
        </div>
      )}

      {/* Recuperar recursos */}
      {isDono && temRecurso && onRecuperarRecursos && (
        <div className="border-t border-purple-900/60 pt-3">
          <button
            onClick={onRecuperarRecursos}
            className="w-full py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-purple-300 hover:text-white rounded-lg transition-colors"
          >
            ♻ Recuperar todos os recursos
          </button>
        </div>
      )}

      {/* Adicionar habilidade */}
      {isDono && disponíveis.length > 0 && (
        <div className="border-t border-purple-900/60 pt-4 space-y-2">
          <p className="text-purple-500 text-xs font-medium uppercase tracking-wider">Adicionar habilidade</p>
          <div className="flex gap-2">
            <select
              value={selecionada}
              onChange={e => { setSelecionada(e.target.value); setAddErro('') }}
              className="flex-1 px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Selecionar habilidade...</option>
              {disponíveis.map(h => (
                <option key={h.id} value={h.id}>
                  {h.nome} — {h.tipo === 'passiva' ? 'Passiva' : 'Ativável'}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdicionar}
              disabled={adicionando || !selecionada}
              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0"
            >
              {adicionando ? '...' : '+ Adicionar'}
            </button>
          </div>
          {addErro && <p className="text-red-400 text-xs">{addErro}</p>}
        </div>
      )}

      {/* 19.5 — habilidades futuras da classe: visíveis para planejar, inativas */}
      {habilidadesBloqueadas.length > 0 && (
        <div className="border-t border-purple-900 pt-3 mt-3 space-y-1.5">
          <p className="text-purple-500 text-xs font-medium">Ainda bloqueadas</p>
          {habilidadesBloqueadas.map(h => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-2 bg-slate-800/40 border border-purple-900/50 rounded-lg px-2.5 py-1.5 opacity-60"
              title={`Disponível ao atingir o nível ${h.nivel_minimo}`}
            >
              <span className="text-purple-300 text-sm truncate">🔒 {h.nome}</span>
              <span className="text-amber-500/80 text-[11px] font-mono shrink-0">nv {h.nivel_minimo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

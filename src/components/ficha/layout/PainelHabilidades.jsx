import { useState } from 'react'
import { custosDeTurno, descreverCustoTurno } from '../../../lib/custoHabilidade'

function Toggle({ ativa, onChange }) {
  return (
    <button
      onClick={() => onChange(!ativa)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        ativa ? 'bg-accent-600' : 'bg-hover'
      }`}
      title={ativa ? 'Desativar' : 'Ativar'}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-ink shadow-sm transition-transform duration-200 ${
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
      <p className="text-ink-dim text-xs mt-1">
        {hab.recurso_nome}: {atual}/{max}
      </p>
    )
  }

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-ink-dim text-xs">{hab.recurso_nome}:</span>
      <button
        onClick={() => onAjustar(hf.id, -1)}
        disabled={atual <= 0}
        className="w-5 h-5 rounded bg-hover hover:bg-border disabled:opacity-30 text-ink text-xs flex items-center justify-center transition-colors"
      >−</button>
      <span className="text-ink text-sm font-mono min-w-[2.5rem] text-center">{atual}/{max}</span>
      <button
        onClick={() => onAjustar(hf.id, +1)}
        disabled={atual >= max}
        className="w-5 h-5 rounded bg-hover hover:bg-border disabled:opacity-30 text-ink text-xs flex items-center justify-center transition-colors"
      >+</button>
    </div>
  )
}

function OrigemBadge({ origem }) {
  if (origem === 'raca')   return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-hover border border-accent-700/60 text-accent-400">Raça</span>
  if (origem === 'classe') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-hover border border-temp/50 text-temp">Classe</span>
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
            onClick={() => onUsarAcao(m, hf.habilidade.nome, hf.habilidade.som_preset)}
            className={`px-2 py-1 text-xs rounded-lg text-ink transition-colors ${
              ehCura ? 'bg-ok/80 hover:bg-ok' : 'bg-temp/80 hover:bg-temp'
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
              ? 'bg-ok/15 border-ok/50 text-ok'
              : 'bg-void border-border text-ink-dim')
          : 'bg-hover/50 border-border/50 text-accent-300'
        return (
          <span
            key={m.id}
            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${base}`}
            title={cond ? (ativo ? 'Ativo agora' : 'Inativo — condição não satisfeita') : undefined}
          >
            {cond && (
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ativo ? 'bg-ok' : 'bg-border'}`} />
            )}
            {descreverEfeito(m, nomes)}
            {cond && <span className="text-ink-dim">· {cond}</span>}
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
      <p className="text-ink-dim text-xs font-medium uppercase tracking-[.12em]">Condições situacionais</p>
      {condicoes.map(m => {
        const ativa = estado?.[m.id] === true
        const rotulo = (m.condicao_config?.rotulo || '').trim() || 'Condição'
        return (
          <div
            key={m.id}
            className={`rounded-xl border px-4 py-2.5 transition-colors duration-200 ${
              ativa ? 'bg-dice-700/10 border-dice-500/70' : 'bg-void/40 border-border/50'
            }`}
          >
            <div className="flex items-center gap-3">
              {isDono ? (
                <Toggle ativa={ativa} onChange={novo => onToggle(m.id, novo)} />
              ) : (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                  ativa
                    ? 'bg-ok/15 border border-ok/50 text-ok'
                    : 'bg-hover border border-border text-ink-dim'
                }`}>
                  {ativa ? 'Ativa' : 'Inativa'}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${ativa ? 'text-dice-400' : 'text-ink-dim'}`}>{rotulo}</p>
                <p className="text-ink-dim text-xs mt-0.5 truncate">
                  {descreverEfeito(m, nomes)}
                  {m._fonte && <span className="text-ink-dim"> · {m._fonte}</span>}
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
  poolsPorId = {}, onPagarTurno, // 20.5
}) {
  const [pagando, setPagando] = useState(false)
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
    // 20.5 — ativar pode falhar por falta de recurso (pool): o motivo vira aviso
    Promise.resolve(onToggle(hf.id, novoEstado)).catch(e => {
      setAvisos(prev => ({ ...prev, [hf.id]: e.message || 'Não foi possível ativar.' }))
      setTimeout(() => setAvisos(prev => { const n = { ...prev }; delete n[hf.id]; return n }), 5000)
    })
  }

  // 12.7 — ids dos modificadores atualmente em vigor (pós-filtro de condição),
  // para marcar quais efeitos condicionais estão ativos agora.
  const idsAtivos = new Set(modificadoresAtivos.map(m => m.id))

  const passivas   = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'passiva')
  const ativaveis  = habilidadesFicha.filter(hf => hf.habilidade?.tipo === 'ativavel')
  const temRecurso = ativaveis.some(hf => hf.habilidade?.recurso_nome)

  // 20.5 — habilidades ativas com custo recorrente (transformações)
  const comCustoTurno = habilidadesFicha.filter(
    hf => hf.ativa === true && custosDeTurno(hf.habilidade).length > 0
  )

  async function handlePagarTurno() {
    setPagando(true)
    try { await onPagarTurno?.() } catch { /* o plano já avisa no feed */ }
    finally { setPagando(false) }
  }

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
        <p className="text-ink-dim text-sm">Nenhuma habilidade configurada no sistema.</p>
        <p className="text-ink-dim text-xs mt-1">
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
          <p className="text-ink-dim text-xs font-medium uppercase tracking-[.12em]">Ativáveis</p>
          {ativaveis.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div
                key={hf.id}
                className={`rounded-xl border px-4 py-3 transition-colors duration-200 ${
                  hf.ativa
                    ? 'bg-accent-600/10 border-accent-500'
                    : 'bg-void/40 border-border/50'
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
                      <p className={`font-medium text-sm ${hf.ativa ? 'text-ink' : 'text-ink-dim'}`}>
                        {hab.nome}
                      </p>
                      <OrigemBadge origem={hf.origem} />
                      {!isDono && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          hf.ativa
                            ? 'bg-ok/15 border border-ok/50 text-ok'
                            : 'bg-hover border border-border text-ink-dim'
                        }`}>
                          {hf.ativa ? 'Ativa' : 'Inativa'}
                        </span>
                      )}
                    </div>
                    {hab.descricao && (
                      <p className="text-ink-dim text-xs mt-0.5">{hab.descricao}</p>
                    )}
                    <RecursoCounter hf={hf} onAjustar={onAjustarRecurso} isDono={isDono} />
                    {avisos[hf.id] && <p className="text-dice-400 text-xs mt-1">⚠ {avisos[hf.id]}</p>}
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
                      className="p-1 text-harm/70 hover:text-harm transition-colors shrink-0 mt-0.5"
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
          <p className="text-ink-dim text-xs font-medium uppercase tracking-[.12em]">Passivas</p>
          {passivas.map(hf => {
            const hab = hf.habilidade
            if (!hab) return null
            return (
              <div key={hf.id} className="bg-raised/50 border border-border/50 rounded-xl px-4 py-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-ink font-medium text-sm">{hab.nome}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ok/15 border border-ok/50 text-ok">
                        Sempre ativa
                      </span>
                      <OrigemBadge origem={hf.origem} />
                    </div>
                    {hab.descricao && (
                      <p className="text-ink-dim text-xs mt-0.5">{hab.descricao}</p>
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
                      className="p-1 text-harm/70 hover:text-harm transition-colors shrink-0"
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
        <div className="text-center py-5 border border-dashed border-border rounded-xl">
          <p className="text-ink-dim text-sm">Nenhuma habilidade nesta ficha.</p>
          {isDono && disponíveis.length > 0 && (
            <p className="text-ink-dim text-xs mt-1">Adicione uma abaixo.</p>
          )}
        </div>
      )}

      {/* Recuperar recursos */}
      {isDono && temRecurso && onRecuperarRecursos && (
        <div className="border-t border-border/60 pt-3">
          <button
            onClick={onRecuperarRecursos}
            className="w-full py-1.5 text-xs bg-hover hover:bg-border text-accent-300 hover:text-ink rounded-lg transition-colors"
          >
            ♻ Recuperar todos os recursos
          </button>
        </div>
      )}

      {/* Adicionar habilidade */}
      {isDono && disponíveis.length > 0 && (
        <div className="border-t border-border/60 pt-4 space-y-2">
          <p className="text-ink-dim text-xs font-medium uppercase tracking-[.12em]">Adicionar habilidade</p>
          <div className="flex gap-2">
            <select
              value={selecionada}
              onChange={e => { setSelecionada(e.target.value); setAddErro('') }}
              className="flex-1 px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none focus:ring-1 focus:ring-accent-500"
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
              className="px-3 py-1.5 bg-accent-700 hover:bg-accent-600 disabled:opacity-50 text-ink text-sm rounded-lg transition-colors shrink-0"
            >
              {adicionando ? '...' : '+ Adicionar'}
            </button>
          </div>
          {addErro && <p className="text-harm text-xs">{addErro}</p>}
        </div>
      )}

      {/* 20.5 — custo recorrente das habilidades ativas; em combate a sessão cobra sozinha */}
      {comCustoTurno.length > 0 && (
        <div className="border-t border-border pt-3 mt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-dice-400 text-xs font-medium">Custo por turno</p>
            {isDono && onPagarTurno && (
              <button
                onClick={handlePagarTurno}
                disabled={pagando}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-dice-700 hover:bg-dice-500 text-ink transition-colors disabled:opacity-50"
                title="Fora de combate. Dentro do combate, a sessão cobra ao avançar o turno."
              >
                {pagando ? '...' : 'Pagar turno'}
              </button>
            )}
          </div>
          {comCustoTurno.map(hf => (
            <div key={hf.id} className="flex justify-between gap-2 text-[11px]">
              <span className="text-accent-300 truncate">{hf.habilidade.nome}</span>
              <span className="text-dice-500/90 font-mono shrink-0">
                {descreverCustoTurno(hf.habilidade, poolsPorId)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 19.5 — habilidades futuras da classe: visíveis para planejar, inativas */}
      {habilidadesBloqueadas.length > 0 && (
        <div className="border-t border-border pt-3 mt-3 space-y-1.5">
          <p className="text-ink-dim text-xs font-medium">Ainda bloqueadas</p>
          {habilidadesBloqueadas.map(h => (
            <div
              key={h.id}
              className="flex items-center justify-between gap-2 bg-void/40 border border-border/50 rounded-lg px-2.5 py-1.5 opacity-60"
              title={`Disponível ao atingir o nível ${h.nivel_minimo}`}
            >
              <span className="text-accent-300 text-sm truncate">🔒 {h.nome}</span>
              <span className="text-dice-500/80 text-[11px] font-mono shrink-0">nv {h.nivel_minimo}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

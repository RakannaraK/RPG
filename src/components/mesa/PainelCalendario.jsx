import { useState } from 'react'
import { useCalendario } from '../../hooks/useCalendario'
import { useRolagem } from '../../hooks/useRolagem'
import {
  PRESETS_CALENDARIO, avancarDias, eventosDoDia, formatarData, gradeDoMes, limitarData,
  normalizarCalendario, proximosEventos, textoPassagem,
} from '../../lib/calendarioEngine'

const INP = 'px-2 py-1.5 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const BTN = 'px-2.5 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50'
// "Dia da Lua" → "Lua", "Domingo" → "Dom"
const abreviar = nome => nome.split(' ').at(-1).slice(0, 3)
const mesmoDia = (a, b) => a && b && a.ano === b.ano && a.mes === b.mes && a.dia === b.dia

/** Mestre: criar o calendário a partir de um modelo. */
function CriarCalendario({ onCriar }) {
  const [modelo, setModelo] = useState('fantasia')
  const [ano, setAno] = useState(1)
  const [erro, setErro] = useState('')
  return (
    <div className="space-y-2">
      <p className="text-ink-dim text-sm">Esta mesa ainda não tem calendário. Comece por um modelo e ajuste meses e dias depois.</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={modelo} onChange={e => setModelo(e.target.value)} className={INP} aria-label="Modelo">
          {Object.entries(PRESETS_CALENDARIO).map(([id, p]) => <option key={id} value={id}>{p.nome}</option>)}
        </select>
        <label className="text-ink-dim text-sm flex items-center gap-1.5">Ano inicial
          <input type="number" value={ano} onChange={e => setAno(e.target.value)} className={`${INP} w-24`} />
        </label>
        <button
          type="button"
          onClick={() => onCriar({ config: PRESETS_CALENDARIO[modelo], ano: Math.trunc(Number(ano)) || 1, mes: 1, dia: 1 }).catch(e => setErro(e.message))}
          className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white font-semibold`}
        >Criar calendário</button>
      </div>
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

/** Mestre: nome, meses, semana, data. Tudo sem limite de quantidade. */
function EditorCalendario({ cal, hoje, onSalvar }) {
  const [nome, setNome] = useState(cal.nome)
  const [sufixo, setSufixo] = useState(cal.sufixo_ano)
  const [meses, setMeses] = useState(cal.meses)
  const [semana, setSemana] = useState(cal.dias_semana.join(', '))
  const [deslocamento, setDeslocamento] = useState(cal.deslocamento)
  const [data, setData] = useState(hoje)
  const [estado, setEstado] = useState('')

  function usarModelo(id) {
    const p = PRESETS_CALENDARIO[id]
    setNome(p.nome); setSufixo(p.sufixo_ano); setMeses(p.meses); setSemana(p.dias_semana.join(', ')); setDeslocamento(p.deslocamento)
  }

  async function salvar() {
    const config = normalizarCalendario({
      nome, sufixo_ano: sufixo, meses, deslocamento,
      dias_semana: semana.split(',').map(s => s.trim()).filter(Boolean),
    })
    setEstado('Salvando…')
    try {
      await onSalvar({ config, ...limitarData(data, config) })
      setEstado('✓ Salvo')
    } catch (e) { setEstado(e.message) }
  }

  const diasSemana = semana.split(',').map(s => s.trim()).filter(Boolean)
  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap gap-2 items-center text-xs text-ink-dim">
        Modelos:
        {Object.entries(PRESETS_CALENDARIO).map(([id, p]) => (
          <button key={id} type="button" onClick={() => usarModelo(id)} className={`${BTN} bg-hover text-ink hover:bg-border text-xs`}>{p.nome}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="text-ink-dim text-xs space-y-1">Nome<input value={nome} onChange={e => setNome(e.target.value)} className={`${INP} w-full`} /></label>
        <label className="text-ink-dim text-xs space-y-1">Depois do ano (ex.: DR, d.C.)<input value={sufixo} onChange={e => setSufixo(e.target.value)} className={`${INP} w-full`} /></label>
      </div>

      <div className="space-y-1">
        <p className="text-ink-dim text-xs">Meses ({meses.length})</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {meses.map((m, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <span className="text-ink-dim text-xs w-5 text-right">{i + 1}</span>
              <input value={m.nome} onChange={e => setMeses(ms => ms.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))} className={`${INP} flex-1 min-w-0`} aria-label={`Nome do mês ${i + 1}`} />
              <input type="number" min={1} value={m.dias} onChange={e => setMeses(ms => ms.map((x, j) => (j === i ? { ...x, dias: e.target.value } : x)))} className={`${INP} w-16`} aria-label={`Dias do mês ${i + 1}`} />
              <button type="button" onClick={() => setMeses(ms => ms.filter((_, j) => j !== i))} disabled={meses.length <= 1} className="text-ink-dim hover:text-red-400 px-1 disabled:opacity-30" aria-label={`Remover mês ${i + 1}`}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setMeses(ms => [...ms, { nome: `Mês ${ms.length + 1}`, dias: 30 }])} className={`${BTN} bg-hover text-ink hover:bg-border text-xs`}>+ Mês</button>
      </div>

      <label className="block text-ink-dim text-xs space-y-1">Dias da semana, separados por vírgula (vazio = sem semana)
        <input value={semana} onChange={e => setSemana(e.target.value)} className={`${INP} w-full`} />
      </label>
      {diasSemana.length > 0 && (
        <label className="block text-ink-dim text-xs space-y-1">O dia 1 do mês 1 do ano 1 cai em
          <select value={deslocamento} onChange={e => setDeslocamento(Number(e.target.value))} className={`${INP} w-full`}>
            {diasSemana.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        <span className="text-ink-dim text-xs w-full">Data atual da campanha</span>
        <input type="number" value={data.dia} onChange={e => setData(d => ({ ...d, dia: e.target.value }))} className={`${INP} w-16`} aria-label="Dia" />
        <select value={data.mes} onChange={e => setData(d => ({ ...d, mes: Number(e.target.value) }))} className={INP} aria-label="Mês">
          {meses.map((m, i) => <option key={i} value={i + 1}>{m.nome || `Mês ${i + 1}`}</option>)}
        </select>
        <input type="number" value={data.ano} onChange={e => setData(d => ({ ...d, ano: e.target.value }))} className={`${INP} w-24`} aria-label="Ano" />
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={salvar} className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white font-semibold`}>Salvar calendário</button>
        <span className="text-ink-dim text-xs" aria-live="polite">{estado}</span>
      </div>
    </div>
  )
}

/** Eventos do dia escolhido + (mestre) adicionar/apagar. */
function DiaEscolhido({ dia, cal, eventos, isGestor, ehHoje, onTornarHoje, onCriar, onApagar }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [anual, setAnual] = useState(false)
  const [secreto, setSecreto] = useState(false)
  const [erro, setErro] = useState('')
  const doDia = eventosDoDia(eventos, dia)

  async function adicionar() {
    if (!titulo.trim()) { setErro('Dê um título ao evento.'); return }
    setErro('')
    try {
      await onCriar({ ano: anual ? null : dia.ano, mes: dia.mes, dia: dia.dia, titulo: titulo.trim(), descricao: descricao.trim() || null, secreto })
      setTitulo(''); setDescricao('')
    } catch (e) { setErro(e.message) }
  }

  return (
    <div className="rounded-xl border border-border bg-void p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-ink text-sm font-semibold flex-1">{formatarData(dia, cal)}</p>
        {isGestor && !ehHoje && (
          <button type="button" onClick={onTornarHoje} className={`${BTN} bg-hover text-ink hover:bg-border text-xs`}>Tornar hoje</button>
        )}
      </div>
      {doDia.length === 0 && <p className="text-ink-dim text-xs italic">Nada marcado neste dia.</p>}
      <ul className="space-y-1.5">
        {doDia.map(e => (
          <li key={e.id} className="text-sm">
            <div className="flex items-start gap-2">
              <span className="text-ink font-medium flex-1">
                {e.secreto && <span title="Só mestres veem">🔒 </span>}{e.titulo}
                {e.ano == null && <span className="text-ink-dim text-xs font-normal"> · todo ano</span>}
              </span>
              {isGestor && <button type="button" onClick={() => onApagar(e.id)} className="text-ink-dim hover:text-red-400 text-xs" aria-label={`Apagar ${e.titulo}`}>✕</button>}
            </div>
            {e.descricao && <p className="text-ink-dim text-xs whitespace-pre-wrap">{e.descricao}</p>}
          </li>
        ))}
      </ul>
      {isGestor && (
        <div className="space-y-1.5 border-t border-border pt-2">
          <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={200} placeholder="Novo evento (ex.: Festival da Colheita)" className={`${INP} w-full`} />
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} maxLength={5000} placeholder="Descrição (opcional)" className={`${INP} w-full resize-y`} />
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-dim">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={anual} onChange={e => setAnual(e.target.checked)} /> Repete todo ano</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={secreto} onChange={e => setSecreto(e.target.checked)} /> Secreto (só mestres)</label>
            <button type="button" onClick={adicionar} className={`${BTN} ml-auto bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold`}>Adicionar</button>
          </div>
          {erro && <p className="text-red-400 text-xs">{erro}</p>}
        </div>
      )}
    </div>
  )
}

/**
 * Fase 29.4 — calendário do mundo. Todos veem a data e os eventos não
 * secretos; o mestre passa o tempo (vai ao feed), marca eventos e configura.
 * `recolhivel`: vira um <details> com a data no título (página da sessão).
 */
export default function PainelCalendario({ mesaId, isGestor, sessaoId = null, recolhivel = false }) {
  const { existe, cal, hoje, eventos, carregado, indisponivel, salvar, criarEvento, apagarEvento } = useCalendario(mesaId)
  const { registrarEvento } = useRolagem()
  const [vista, setVista] = useState(null) // { ano, mes } exibido; null = mês de hoje
  const [escolhido, setEscolhido] = useState(null)
  const [nDias, setNDias] = useState(3)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  if (!carregado) return null
  if (indisponivel) return isGestor ? <p className="text-ink-dim text-sm italic">Calendário ainda não ativado neste banco (sql/fase29_chat_notas_calendario.sql).</p> : null
  if (!existe && !isGestor) return null

  const envolver = conteudo => (recolhivel ? (
    <details className="mb-6 rounded-xl border border-purple-900 bg-slate-900/60">
      <summary className="cursor-pointer px-4 py-3 text-purple-200 text-sm font-medium">📅 {existe ? formatarData(hoje, cal) : 'Calendário'}</summary>
      <div className="px-4 pb-4">{conteudo}</div>
    </details>
  ) : conteudo)

  if (!existe) return envolver(<CriarCalendario onCriar={salvar} />)

  async function irPara(novo, rotulo) {
    setOcupado(true); setErro('')
    try {
      await salvar(novo)
      setVista(null); setEscolhido(null)
      const hojeTem = eventosDoDia(eventos.filter(e => !e.secreto), novo).map(e => e.titulo)
      await registrarEvento({
        mesaId, sessaoId, notacao: '', total: 0, dados: [],
        rotulo: `📅 ${rotulo} — ${formatarData(novo, cal)}${hojeTem.length ? ` · ${hojeTem.join(', ')}` : ''}`,
      })
    } catch (e) { setErro(e.message) } finally { setOcupado(false) }
  }

  const passar = n => n && irPara(avancarDias(hoje, n, cal), textoPassagem(n))

  const mostrado = vista || { ano: hoje.ano, mes: hoje.mes }
  const mudarMes = delta => {
    const m = mostrado.mes - 1 + delta
    const anos = Math.floor(m / cal.meses.length)
    setVista({ ano: mostrado.ano + anos, mes: m - anos * cal.meses.length + 1 })
  }
  const semanas = gradeDoMes(mostrado.ano, mostrado.mes, cal)
  const proximos = proximosEventos(eventos, hoje, cal)

  return envolver(
    <div className="space-y-4">
      <div>
        {!recolhivel && <p className="text-ink-dim text-xs">{cal.nome}</p>}
        <p className="text-ink text-lg font-semibold">📅 {formatarData(hoje, cal)}</p>
      </div>

      {isGestor && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-ink-dim text-xs mr-1">Passar o tempo:</span>
          {[-1, 1, 7].map(n => (
            <button key={n} type="button" disabled={ocupado} onClick={() => passar(n)} className={`${BTN} bg-hover text-ink hover:bg-border`}>{n > 0 ? `+${n}` : n} {Math.abs(n) === 1 ? 'dia' : 'dias'}</button>
          ))}
          <input type="number" value={nDias} onChange={e => setNDias(e.target.value)} className={`${INP} w-20`} aria-label="Quantos dias" />
          <button type="button" disabled={ocupado} onClick={() => passar(Math.trunc(Number(nDias)) || 0)} className={`${BTN} bg-accent-600 hover:bg-accent-500 text-white`}>Passar</button>
        </div>
      )}
      {erro && <p className="text-red-400 text-xs">{erro}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => mudarMes(-1)} className={`${BTN} text-ink hover:bg-hover`} aria-label="Mês anterior">‹</button>
            <button type="button" onClick={() => setVista(null)} className="text-ink text-sm font-semibold hover:underline" title="Voltar ao mês de hoje">
              {cal.meses[mostrado.mes - 1].nome} de {mostrado.ano}
            </button>
            <button type="button" onClick={() => mudarMes(1)} className={`${BTN} text-ink hover:bg-hover`} aria-label="Próximo mês">›</button>
          </div>
          <table className="w-full table-fixed text-center text-sm">
            {cal.dias_semana.length > 0 && (
              <thead>
                <tr>{cal.dias_semana.map((d, i) => <th key={i} className="text-ink-dim text-xs font-normal pb-1" title={d}>{abreviar(d)}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {semanas.map((s, i) => (
                <tr key={i}>
                  {s.map((dia, j) => {
                    if (!dia) return <td key={j} />
                    const d = { ano: mostrado.ano, mes: mostrado.mes, dia }
                    const temEvento = eventosDoDia(eventos, d).length > 0
                    return (
                      <td key={j} className="p-0.5">
                        <button
                          type="button" onClick={() => setEscolhido(mesmoDia(escolhido, d) ? null : d)}
                          className={`relative w-full aspect-square max-h-10 rounded-lg transition-colors ${
                            mesmoDia(d, hoje) ? 'bg-accent-600 text-white font-bold'
                              : mesmoDia(d, escolhido) ? 'bg-hover text-ink ring-1 ring-accent-500' : 'text-ink hover:bg-hover'
                          }`}
                          aria-label={`${formatarData(d, cal)}${temEvento ? ' — tem evento' : ''}`}
                        >
                          {dia}
                          {temEvento && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {escolhido && (
            <DiaEscolhido
              key={`${escolhido.ano}-${escolhido.mes}-${escolhido.dia}`}
              dia={escolhido} cal={cal} eventos={eventos} isGestor={isGestor}
              ehHoje={mesmoDia(escolhido, hoje)}
              onTornarHoje={() => irPara(escolhido, 'Nova data')}
              onCriar={criarEvento} onApagar={id => apagarEvento(id).catch(e => setErro(e.message))}
            />
          )}
          <div>
            <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider mb-1">Próximos eventos</p>
            {proximos.length === 0 && <p className="text-ink-dim text-xs italic">Nada no próximo ano.</p>}
            <ul className="space-y-1">
              {proximos.map(({ evento, data, emDias }) => (
                <li key={evento.id}>
                  <button type="button" onClick={() => { setVista({ ano: data.ano, mes: data.mes }); setEscolhido(data) }} className="w-full text-left text-sm hover:bg-hover rounded-lg px-2 py-1">
                    <span className="text-ink">{evento.secreto && '🔒 '}{evento.titulo}</span>
                    <span className="text-ink-dim text-xs"> · {emDias === 0 ? 'hoje' : emDias === 1 ? 'amanhã' : `em ${emDias} dias`}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {isGestor && (
        <details className="rounded-xl border border-border px-3 py-2">
          <summary className="cursor-pointer text-ink text-sm">⚙ Configurar calendário</summary>
          <EditorCalendario key={JSON.stringify([cal, hoje])} cal={cal} hoje={hoje} onSalvar={salvar} />
        </details>
      )}
    </div>
  )
}

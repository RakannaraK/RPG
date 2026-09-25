import { useEffect, useState } from 'react'
import { useAgenda } from '../../hooks/useAgenda'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import {
  RECORRENCIAS, chaveOcorrencia, contarRespostas, partesNoFuso, proximaDaMesa,
  textoFalta, textoQuando, validarAgenda,
} from '../../lib/agenda'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

// cada pessoa vê o horário no próprio fuso
// ponytail: a recorrência mensal é calculada no fuso de quem vê; mesas com gente
// em fusos muito diferentes podem discordar no "dia 31". Guardar o fuso da mesa se isso importar.
const FUSO = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
const CAMPO = 'px-2.5 py-1.5 rounded-lg bg-void border border-border text-ink text-sm focus:outline-none'
const DURACOES = [60, 120, 180, 240, 300, 360, 480]
const RESPOSTAS = [
  { id: 'vou', rotulo: 'Vou' },
  { id: 'talvez', rotulo: 'Talvez' },
  { id: 'nao', rotulo: 'Não vou' },
]

/** ISO -> valor do <input type="datetime-local"> no fuso de quem vê. */
function paraCampoLocal(iso) {
  if (!iso) return ''
  const p = partesNoFuso(new Date(iso), FUSO)
  const z = n => String(n).padStart(2, '0')
  return `${p.ano}-${z(p.mes)}-${z(p.dia)}T${z(p.hora)}:${z(p.minuto)}`
}

function FormAgenda({ inicial, onSalvar, onCancelar }) {
  const [v, setV] = useState({
    titulo: inicial?.titulo || '',
    inicio: paraCampoLocal(inicial?.inicio),
    duracao_min: inicial?.duracao_min || 180,
    recorrencia: inicial?.recorrencia || 'semanal',
    ate: inicial?.ate || '',
  })
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const muda = campo => e => setV(x => ({ ...x, [campo]: e.target.value }))

  async function enviar(e) {
    e.preventDefault()
    // o campo datetime-local vem sem fuso: new Date() lê no horário de quem digitou
    const evento = { ...inicial, ...v, inicio: v.inicio ? new Date(v.inicio).toISOString() : '' }
    const c = validarAgenda(evento)
    if (!c.ok) { setErro(c.erro); return }
    setSalvando(true)
    setErro('')
    try { await onSalvar(evento) } catch (err) { setErro(err.message) } finally { setSalvando(false) }
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Dia e hora
          <input type="datetime-local" required value={v.inicio} onChange={muda('inicio')} className={CAMPO} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Duração
          <select value={v.duracao_min} onChange={muda('duracao_min')} className={CAMPO}>
            {DURACOES.map(m => <option key={m} value={m}>{m / 60} h</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Repete
          <select value={v.recorrencia} onChange={muda('recorrencia')} className={CAMPO}>
            {RECORRENCIAS.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </label>
        {v.recorrencia !== 'nenhuma' && (
          <label className="flex flex-col gap-1 text-xs text-ink-dim">
            Até (opcional)
            <input type="date" value={v.ate} onChange={muda('ate')} className={CAMPO} />
          </label>
        )}
      </div>
      <input value={v.titulo} onChange={muda('titulo')} maxLength={80} placeholder="Título (opcional) — ex.: Capítulo 3, a torre" aria-label="Título da sessão" className={`${CAMPO} w-full`} />
      <div className="flex flex-wrap items-center gap-2">
        <Botao type="submit" variante="primario" tamanho="sm" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar e avisar a mesa'}</Botao>
        <Botao variante="fantasma" tamanho="sm" onClick={onCancelar}>Cancelar</Botao>
        {erro && <span className="text-harm text-xs">{erro}</span>}
      </div>
    </form>
  )
}

/**
 * Fase 40 — próxima sessão da mesa, com "vou / talvez / não vou".
 * O calendário da F29 é o do mundo do jogo; este é o da vida real.
 */
export default function AgendaMesa({ mesaId, isGestor }) {
  const { eventos, presencas, indisponivel, salvar, remover, responder, meuId } = useAgenda(mesaId)
  const { nomeDe } = useMembrosMesa(mesaId)
  const [editando, setEditando] = useState(null) // null | 'novo' | evento
  const [verNomes, setVerNomes] = useState(false)
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(() => new Date())

  // "daqui a 40 min" precisa andar sozinho
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60 * 1000)
    return () => clearInterval(t)
  }, [])

  if (indisponivel) return null
  const prox = proximaDaMesa(eventos, agora, FUSO)
  if (!prox && !isGestor) return null

  if (editando) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-raised/60 px-5 py-4 space-y-3" aria-label="Marcar sessão">
        <h2 className="flex items-center gap-2 text-ink text-sm font-semibold">
          <Ilustra nome="calendario" tamanho={18} /> {editando === 'novo' ? 'Marcar sessão' : 'Editar sessão'}
        </h2>
        <FormAgenda
          inicial={editando === 'novo' ? null : editando}
          onSalvar={async ev => { await salvar(ev); setEditando(null) }}
          onCancelar={() => setEditando(null)}
        />
      </section>
    )
  }

  if (!prox) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-border px-5 py-4 flex flex-wrap items-center gap-3">
        <Ilustra nome="calendario" tamanho={22} />
        <p className="text-ink-dim text-sm flex-1 min-w-[12rem]">Nenhuma sessão marcada. Marque a próxima e a mesa recebe o aviso.</p>
        <Botao variante="primario" tamanho="sm" onClick={() => setEditando('novo')}>Marcar sessão</Botao>
      </section>
    )
  }

  const { evento, inicio, fim } = prox
  const chave = chaveOcorrencia(inicio)
  const respostas = presencas.filter(p => p.agenda_id === evento.id && chaveOcorrencia(p.ocorrencia) === chave)
  const minha = respostas.find(p => p.usuario_id === meuId)?.resposta
  const contagem = contarRespostas(presencas.filter(p => p.agenda_id === evento.id), inicio)
  const recorrencia = RECORRENCIAS.find(r => r.id === evento.recorrencia)
  const acontecendo = agora >= inicio && agora < fim

  async function responderComo(resposta) {
    setErro('')
    try { await responder(evento.id, inicio, resposta) } catch (e) { setErro(e.message) }
  }

  async function desmarcar() {
    const repete = evento.recorrencia !== 'nenhuma'
    if (!window.confirm(repete ? 'Desmarcar TODAS as sessões desta agenda?' : 'Desmarcar esta sessão?')) return
    try { await remover(evento.id) } catch (e) { setErro(e.message) }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-raised/60 px-5 py-4 space-y-3" aria-label="Próxima sessão">
      <div className="flex flex-wrap items-start gap-3">
        <Ilustra nome="calendario" tamanho={26} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-[12rem]">
          <p className="text-ink-dim text-xs uppercase tracking-wider font-semibold">
            {acontecendo ? 'Sessão agora' : 'Próxima sessão'}{evento.titulo ? ` · ${evento.titulo}` : ''}
          </p>
          <p className="text-ink text-base font-semibold">{textoQuando(inicio, agora, FUSO)}</p>
          <p className="text-ink-dim text-xs">
            {textoFalta(inicio, fim, agora)}{recorrencia && evento.recorrencia !== 'nenhuma' ? ` · ${recorrencia.nome.toLowerCase()}` : ''}
          </p>
        </div>
        {isGestor && (
          <div className="flex items-center gap-1">
            <Botao variante="fantasma" tamanho="sm" onClick={() => setEditando(evento)}>Editar</Botao>
            <Botao variante="fantasma" tamanho="sm" onClick={() => setEditando('novo')}>+ Outra</Botao>
            <Botao variante="fantasma" tamanho="sm" className="text-red-300 hover:text-white hover:bg-red-950/40" onClick={desmarcar}>Desmarcar</Botao>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Você vai?">
        {RESPOSTAS.map(r => (
          <Botao
            key={r.id} tamanho="sm" variante={minha === r.id ? 'primario' : 'contorno'}
            aria-pressed={minha === r.id} onClick={() => responderComo(r.id)}
          >{r.rotulo}</Botao>
        ))}
        <button
          type="button" onClick={() => setVerNomes(v => !v)}
          className="ml-1 min-h-[24px] px-1 text-xs text-ink-dim hover:text-ink transition-colors"
          aria-expanded={verNomes}
        >
          {contagem.vou} {contagem.vou === 1 ? 'vai' : 'vão'} · {contagem.talvez} talvez · {contagem.nao} não
        </button>
      </div>

      {verNomes && (
        <ul className="grid gap-1 sm:grid-cols-3 text-xs">
          {RESPOSTAS.map(r => (
            <li key={r.id}>
              <span className="text-ink-dim">{r.rotulo}:</span>{' '}
              <span className="text-ink">{respostas.filter(p => p.resposta === r.id).map(p => nomeDe(p.usuario_id)).join(', ') || '—'}</span>
            </li>
          ))}
        </ul>
      )}
      {erro && <p className="text-harm text-xs">{erro}</p>}
    </section>
  )
}

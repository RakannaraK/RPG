import { useEffect, useRef, useState } from 'react'
import { useNotasMesa } from '../../hooks/useNotasMesa'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'

const INP = 'w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const ESPERA_SALVAR = 800 // ms sem digitar até salvar
const TEXTO_ESTADO = { salvo: '✓ Salvo', editando: 'Editando…', salvando: 'Salvando…' }

/** Editor de UMA nota (montado com key = id: trocar de nota começa limpo e salva o pendente). */
function EditorNota({ nota, onSalvar, onApagar }) {
  const [titulo, setTitulo] = useState(nota.titulo)
  const [texto, setTexto] = useState(nota.texto)
  const [estado, setEstado] = useState('salvo')
  const [erro, setErro] = useState('')
  const pendenteRef = useRef(null)
  const timerRef = useRef(null)
  const onSalvarRef = useRef(onSalvar)
  useEffect(() => { onSalvarRef.current = onSalvar }, [onSalvar])

  async function salvarPendente() {
    const patch = pendenteRef.current
    if (!patch) return
    pendenteRef.current = null
    setEstado('salvando')
    try {
      await onSalvarRef.current(patch)
      setEstado(pendenteRef.current ? 'editando' : 'salvo')
      setErro('')
    } catch (e) {
      pendenteRef.current = { ...patch, ...pendenteRef.current } // tenta de novo no próximo toque
      setEstado('editando')
      setErro(e.message || 'Não salvou.')
    }
  }

  function mudar(patch) {
    pendenteRef.current = { ...pendenteRef.current, ...patch }
    setEstado('editando')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(salvarPendente, ESPERA_SALVAR)
  }

  // Saiu da nota (trocou, fechou a aba da mesa) com algo por salvar: salva já
  useEffect(() => () => {
    clearTimeout(timerRef.current)
    if (pendenteRef.current) onSalvarRef.current(pendenteRef.current).catch(() => {})
  }, [])

  async function alternar(campo) {
    try { await onSalvar({ [campo]: !nota[campo] }) } catch (e) { setErro(e.message) }
  }

  return (
    <div className="space-y-2">
      <input
        value={titulo} maxLength={200}
        onChange={e => { setTitulo(e.target.value); mudar({ titulo: e.target.value }) }}
        placeholder="Título" className={`${INP} font-semibold`} aria-label="Título da nota"
      />
      <textarea
        value={texto} maxLength={100000} rows={12}
        onChange={e => { setTexto(e.target.value); mudar({ texto: e.target.value }) }}
        placeholder="Escreva aqui. Salva sozinho."
        className={`${INP} resize-y min-h-[10rem] leading-relaxed`} aria-label="Texto da nota"
      />
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button" onClick={() => alternar('compartilhada')}
          className={`px-2.5 py-1 rounded-lg border transition-colors ${nota.compartilhada ? 'border-emerald-600 bg-emerald-950/60 text-emerald-200' : 'border-border text-ink-dim hover:text-ink'}`}
          title={nota.compartilhada ? 'A mesa toda lê esta nota' : 'Só você lê esta nota'}
        >{nota.compartilhada ? '👥 Compartilhada com a mesa' : '🔒 Privada'}</button>
        <button
          type="button" onClick={() => alternar('fixada')}
          className={`px-2.5 py-1 rounded-lg border transition-colors ${nota.fixada ? 'border-amber-600 bg-amber-950/60 text-amber-200' : 'border-border text-ink-dim hover:text-ink'}`}
        >📌 {nota.fixada ? 'Fixada' : 'Fixar'}</button>
        <span className={`ml-auto ${erro ? 'text-red-400' : 'text-ink-dim'}`} aria-live="polite">{erro || TEXTO_ESTADO[estado]}</span>
        <button
          type="button"
          onClick={() => { if (window.confirm(`Apagar a nota "${titulo || 'sem título'}"? Não dá para desfazer.`)) onApagar() }}
          className="px-2 py-1 text-red-400 hover:text-red-300"
        >Apagar</button>
      </div>
    </div>
  )
}

/**
 * Fase 29.3 — notas da mesa. Privadas por padrão (o mestre anota o plano sem
 * os jogadores verem); um toque compartilha com a mesa (pista, handout, resumo).
 * `estreito` empilha lista e editor (gaveta do mapa, lateral).
 */
export default function PainelNotas({ mesaId, meuId, estreito = false }) {
  const { notas, indisponivel, criar, salvar, apagar } = useNotasMesa(mesaId)
  const { nomeDe } = useMembrosMesa(mesaId)
  const [abertaId, setAbertaId] = useState(null)
  const [erro, setErro] = useState('')

  if (indisponivel) return <p className="text-ink-dim text-sm italic">Notas ainda não ativadas neste banco (sql/fase29_chat_notas_calendario.sql).</p>

  const aberta = notas.find(n => n.id === abertaId) || null
  const minha = aberta?.autor_id === meuId

  async function nova() {
    setErro('')
    try { setAbertaId((await criar()).id) } catch (e) { setErro(e.message) }
  }

  return (
    <div className={estreito ? 'space-y-3' : 'grid grid-cols-1 md:grid-cols-3 gap-4 items-start'}>
      <div className="space-y-2">
        <button
          type="button" onClick={nova}
          className="w-full px-3 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold"
        >+ Nova nota</button>
        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        {notas.length === 0 && <p className="text-ink-dim text-xs italic">Nenhuma nota ainda.</p>}
        <ul className={`space-y-1 ${estreito ? 'max-h-48 overflow-y-auto' : ''}`}>
          {notas.map(n => (
            <li key={n.id}>
              <button
                type="button" onClick={() => setAbertaId(n.id === abertaId ? null : n.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${n.id === abertaId ? 'bg-hover text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'}`}
              >
                <span className="flex items-center gap-1.5">
                  {n.fixada && <span aria-label="fixada">📌</span>}
                  <span className="truncate flex-1 font-medium">{n.titulo || 'Sem título'}</span>
                  <span title={n.compartilhada ? 'Compartilhada' : 'Privada'}>{n.compartilhada ? '👥' : '🔒'}</span>
                </span>
                {n.autor_id !== meuId && <span className="block text-[11px] text-ink-dim">de {nomeDe(n.autor_id)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={estreito ? '' : 'md:col-span-2'}>
        {!aberta ? (
          !estreito && <p className="text-ink-dim text-sm italic">Escolha uma nota ou crie uma nova.</p>
        ) : minha ? (
          <EditorNota key={aberta.id} nota={aberta} onSalvar={patch => salvar(aberta.id, patch)} onApagar={async () => { await apagar(aberta.id); setAbertaId(null) }} />
        ) : (
          <article className="space-y-2">
            <h3 className="text-ink font-semibold">{aberta.titulo || 'Sem título'}</h3>
            <p className="text-ink-dim text-xs">Compartilhada por {nomeDe(aberta.autor_id)} · só o autor edita</p>
            <p className="text-ink text-sm whitespace-pre-wrap break-words leading-relaxed">{aberta.texto || <em className="text-ink-dim">(vazia)</em>}</p>
          </article>
        )}
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { useEnciclopedia } from '../../hooks/useEnciclopedia'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import {
  LIMITES, TIPOS_VERBETE, buscarVerbetes, camposRevelaveis, citadoPor, estadoRevelacao,
  nomeDoCampo, ordenarVerbetes, partesComMencoes, quemSabe, tipoDe, validarVerbete,
} from '../../lib/enciclopedia'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'w-full px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'
const ROTULO = 'flex flex-col gap-1 text-xs text-ink-dim'
const ESTADOS = {
  oculto:   { nome: 'Oculto',   cls: 'bg-slate-700 text-ink-dim' },
  parcial:  { nome: 'Parcial',  cls: 'bg-purple-900 text-purple-200' },
  revelado: { nome: 'Revelado', cls: 'bg-accent-600 text-sobre-acento' },
}
const GESTORES = ['mestre', 'co-mestre']

/** Texto com [[menções]] virando botões que abrem o verbete citado. */
function TextoComMencoes({ texto, verbetes, onAbrir, className = '' }) {
  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {partesComMencoes(texto, verbetes).map((p, i) => p.alvo
        ? <button key={i} type="button" onClick={() => onAbrir(p.alvo.id)} className="text-accent-300 underline decoration-dotted underline-offset-2 hover:text-ink">{p.texto}</button>
        : <span key={i}>{p.texto}</span>)}
    </p>
  )
}

function FormVerbete({ inicial, onSalvar, onCancelar, enviarImagem }) {
  const [v, setV] = useState(() => ({
    tipo: inicial?.tipo || 'npc', titulo: inicial?.titulo || '', resumo: inicial?.resumo || '',
    corpo: inicial?.corpo || '', segredo: inicial?.segredo || '', imagem_url: inicial?.imagem_url || '',
    tags: (inicial?.tags || []).join(', '), campos: { ...(inicial?.campos || {}) },
  }))
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')
  const muda = k => e => setV(x => ({ ...x, [k]: e.target.value }))
  const tipo = tipoDe(v.tipo)

  async function imagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcupado('imagem'); setErro('')
    try { const url = await enviarImagem(file); setV(x => ({ ...x, imagem_url: url })) }
    catch (err) { setErro(err.message) } finally { setOcupado('') }
  }

  async function enviar(e) {
    e.preventDefault()
    const c = validarVerbete(v)
    if (!c.ok) { setErro(c.erro); return }
    setOcupado('salvando'); setErro('')
    try { await onSalvar(c.linha) } catch (err) { setErro(err.message); setOcupado('') }
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <label className={ROTULO}>Tipo
          <select value={v.tipo} onChange={muda('tipo')} className={CAMPO}>
            {TIPOS_VERBETE.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </label>
        <label className={ROTULO}>Nome
          <input value={v.titulo} onChange={muda('titulo')} maxLength={LIMITES.titulo} required className={CAMPO} placeholder="Ex.: Velha Mirta" />
        </label>
      </div>
      <label className={ROTULO}>Resumo
        <textarea value={v.resumo} onChange={muda('resumo')} maxLength={LIMITES.resumo} rows={2} className={CAMPO} placeholder="Uma ou duas frases — o que os jogadores veem primeiro." />
      </label>
      {tipo.campos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tipo.campos.map(c => (
            <label key={c.id} className={ROTULO}>{c.nome}
              <input
                value={v.campos[c.id] || ''} maxLength={LIMITES.campo} className={CAMPO}
                onChange={e => setV(x => ({ ...x, campos: { ...x.campos, [c.id]: e.target.value } }))}
              />
            </label>
          ))}
        </div>
      )}
      <label className={ROTULO}>{v.tipo === 'handout' ? 'Texto do documento' : 'Texto'}
        <textarea value={v.corpo} onChange={muda('corpo')} maxLength={LIMITES.corpo} rows={8} className={CAMPO} aria-describedby="dica-mencao" />
      </label>
      <p id="dica-mencao" className="text-xs text-ink-dim -mt-2">Escreva <code className="text-ink">[[Nome de outro verbete]]</code> para ligar os dois.</p>
      <label className={ROTULO}>
        <span className="flex items-center gap-1.5"><Ilustra nome="cadeado" tamanho={14} /> Notas do mestre — nunca são reveladas</span>
        <textarea value={v.segredo} onChange={muda('segredo')} maxLength={LIMITES.segredo} rows={3} className={CAMPO} placeholder="O que só você sabe." />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 items-start">
        <label className={ROTULO}>Etiquetas (separadas por vírgula)
          <input value={v.tags} onChange={muda('tags')} className={CAMPO} placeholder="aliada, capítulo 2" />
        </label>
        <div className={ROTULO}>Imagem
          <div className="flex flex-wrap items-center gap-2">
            {v.imagem_url && <img src={v.imagem_url} alt="" className="h-12 w-12 rounded-lg object-cover border border-border" />}
            <label className="inline-flex items-center min-h-[36px] px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-purple-100 text-sm cursor-pointer">
              {ocupado === 'imagem' ? 'Enviando…' : v.imagem_url ? 'Trocar' : 'Escolher imagem'}
              <input type="file" accept="image/*" onChange={imagem} disabled={!!ocupado} className="sr-only" />
            </label>
            {v.imagem_url && <Botao variante="fantasma" tamanho="sm" onClick={() => setV(x => ({ ...x, imagem_url: '' }))}>Tirar</Botao>}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Botao type="submit" variante="primario" disabled={!!ocupado}>{ocupado === 'salvando' ? 'Salvando…' : 'Salvar'}</Botao>
        <Botao variante="fantasma" onClick={onCancelar}>Cancelar</Botao>
        {erro && <span className="text-harm text-xs" role="alert">{erro}</span>}
      </div>
    </form>
  )
}

/** F42 — escolher para quem e o quê revelar (ou entregar, se for documento). */
function RevelarVerbete({ verbete, jogadores, onEntregar, onFechar }) {
  const revelaveis = camposRevelaveis(verbete)
  const [paraTodos, setParaTodos] = useState(true)
  const [alvos, setAlvos] = useState([])
  const [campos, setCampos] = useState(revelaveis)
  const [avisar, setAvisar] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const alterna = (lista, set, x) => set(lista.includes(x) ? lista.filter(y => y !== x) : [...lista, x])
  const documento = verbete.tipo === 'handout'

  async function confirmar() {
    if (!campos.length) { setErro('Marque o que revelar.'); return }
    if (!paraTodos && !alvos.length) { setErro('Escolha para quem.'); return }
    setOcupado(true); setErro('')
    try { await onEntregar(paraTodos ? [] : alvos, campos, avisar); onFechar() }
    catch (e) { setErro(e.message); setOcupado(false) }
  }

  return (
    <div className="rounded-xl border border-accent-600/60 bg-void/60 p-4 space-y-3">
      <p className="text-ink text-sm font-semibold">{documento ? 'Entregar documento' : 'Revelar aos jogadores'}</p>
      <fieldset className="space-y-1.5">
        <legend className="text-xs text-ink-dim mb-1">Para quem</legend>
        <label className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
          <input type="radio" checked={paraTodos} onChange={() => setParaTodos(true)} /> A mesa toda
        </label>
        <label className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
          <input type="radio" checked={!paraTodos} onChange={() => setParaTodos(false)} /> Só alguns
        </label>
        {!paraTodos && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6">
            {jogadores.length === 0 && <span className="text-xs text-ink-dim">Ninguém na mesa ainda.</span>}
            {jogadores.map(j => (
              <label key={j.usuario_id} className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
                <input type="checkbox" checked={alvos.includes(j.usuario_id)} onChange={() => alterna(alvos, setAlvos, j.usuario_id)} /> {j.nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset>
        <legend className="text-xs text-ink-dim mb-1">O quê</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {revelaveis.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
              <input type="checkbox" checked={campos.includes(c)} onChange={() => alterna(campos, setCampos, c)} /> {nomeDoCampo(c, verbete.tipo)}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-dim mt-1">As notas do mestre nunca são reveladas.</p>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-ink min-h-[24px]">
        <input type="checkbox" checked={avisar} onChange={e => setAvisar(e.target.checked)} /> Avisar pelo sininho
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Botao variante="primario" onClick={confirmar} disabled={ocupado}>{ocupado ? 'Revelando…' : documento ? 'Entregar' : 'Revelar'}</Botao>
        <Botao variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        {erro && <span className="text-harm text-xs" role="alert">{erro}</span>}
      </div>
    </div>
  )
}

/** F42 — quem sabe o quê. Clicar numa marca esconde de novo; num vazio, revela (sem aviso). */
function MatrizRevelacao({ verbete, revelacoes, jogadores, onEntregar, onEsconder }) {
  const [erro, setErro] = useState('')
  const campos = camposRevelaveis(verbete)
  const { todos } = quemSabe(revelacoes, verbete.id, [])
  const direto = (u, c) => revelacoes.some(r => r.verbete_id === verbete.id && r.usuario_id === u && r.campo === c)
  const acao = fn => async () => { setErro(''); try { await fn() } catch (e) { setErro(e.message) } }
  const cel = 'min-w-[28px] min-h-[28px] rounded-lg text-sm'

  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wider font-semibold text-ink-dim">Quem sabe o quê</p>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-ink-dim">
              <th className="text-left font-normal pr-3 py-1">Campo</th>
              <th className="font-normal px-2 py-1">Mesa toda</th>
              {jogadores.map(j => <th key={j.usuario_id} className="font-normal px-2 py-1 max-w-[7rem] truncate">{j.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {campos.map(c => {
              const nome = nomeDoCampo(c, verbete.tipo)
              return (
                <tr key={c} className="border-t border-border/60">
                  <td className="pr-3 py-1 text-ink-dim">{nome}</td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button" className={`${cel} ${todos.has(c) ? 'bg-accent-600 text-sobre-acento' : 'border border-border text-ink-dim hover:bg-slate-700'}`}
                      aria-label={todos.has(c) ? `Esconder ${nome} da mesa toda` : `Revelar ${nome} à mesa toda`} aria-pressed={todos.has(c)}
                      onClick={acao(() => todos.has(c) ? onEsconder(null, c) : onEntregar([], [c], false))}
                    >{todos.has(c) ? '✓' : '·'}</button>
                  </td>
                  {jogadores.map(j => {
                    const sabe = direto(j.usuario_id, c)
                    if (todos.has(c) && !sabe) return <td key={j.usuario_id} className="px-2 py-1 text-center text-ink-dim" title="Revelado à mesa toda">✓</td>
                    return (
                      <td key={j.usuario_id} className="px-2 py-1 text-center">
                        <button
                          type="button" className={`${cel} ${sabe ? 'bg-purple-700 text-sobre-acento' : 'border border-border text-ink-dim hover:bg-slate-700'}`}
                          aria-label={sabe ? `Esconder ${nome} de ${j.nome}` : `Revelar ${nome} a ${j.nome}`} aria-pressed={sabe}
                          onClick={acao(() => sabe ? onEsconder(j.usuario_id, c) : onEntregar([j.usuario_id], [c], false))}
                        >{sabe ? '✓' : '·'}</button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </div>
  )
}

function DetalheVerbete({ verbete, verbetes, isGestor, onAbrir, children }) {
  const tipo = tipoDe(verbete.tipo)
  const campos = tipo.campos.filter(c => verbete.campos?.[c.id])
  const citam = citadoPor(verbete, verbetes)
  return (
    <article className="space-y-4">
      <header className="flex items-start gap-3">
        <Ilustra nome={tipo.icone} tamanho={40} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider font-semibold text-ink-dim">{tipo.nome}</p>
          <h2 className="text-ink text-xl font-semibold break-words">
            {verbete.titulo || <span className="italic text-ink-dim font-normal">Nome ainda desconhecido</span>}
          </h2>
          {verbete.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {verbete.tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-border text-ink-dim">{t}</span>)}
            </div>
          )}
        </div>
      </header>
      {verbete.imagem_url && <img src={verbete.imagem_url} alt={verbete.titulo || ''} className="max-h-80 rounded-xl border border-border object-contain" />}
      {verbete.resumo && <TextoComMencoes texto={verbete.resumo} verbetes={verbetes} onAbrir={onAbrir} className="text-ink italic" />}
      {campos.length > 0 && (
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
          {campos.map(c => (
            <div key={c.id}>
              <dt className="text-xs text-ink-dim">{c.nome}</dt>
              <dd><TextoComMencoes texto={verbete.campos[c.id]} verbetes={verbetes} onAbrir={onAbrir} className="text-ink text-sm" /></dd>
            </div>
          ))}
        </dl>
      )}
      {verbete.corpo && (
        <TextoComMencoes
          texto={verbete.corpo} verbetes={verbetes} onAbrir={onAbrir}
          className={`text-ink text-sm leading-relaxed ${verbete.tipo === 'handout' ? 'rounded-xl bg-void border border-border p-4' : ''}`}
        />
      )}
      {isGestor && verbete.segredo && (
        <div className="rounded-xl border border-dashed border-accent-600/70 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-300 mb-1"><Ilustra nome="cadeado" tamanho={14} /> Só você vê</p>
          <p className="text-ink text-sm whitespace-pre-wrap">{verbete.segredo}</p>
        </div>
      )}
      {!isGestor && !verbete.resumo && !verbete.corpo && !campos.length && !verbete.imagem_url && (
        <p className="text-ink-dim text-sm">Por enquanto, só isso. O mestre pode revelar mais depois.</p>
      )}
      {citam.length > 0 && (
        <div>
          <p className="text-xs text-ink-dim mb-1">Citado em</p>
          <div className="flex flex-wrap gap-1.5">
            {citam.map(v => <Botao key={v.id} variante="contorno" tamanho="sm" onClick={() => onAbrir(v.id)}>{v.titulo}</Botao>)}
          </div>
        </div>
      )}
      {children}
    </article>
  )
}

/**
 * Fases 41/42 — enciclopédia da mesa: NPCs, lugares, facções, itens e
 * documentos, com revelação campo a campo para cada jogador.
 */
export default function PainelEnciclopedia({ mesaId, meuId, isGestor }) {
  const enc = useEnciclopedia(mesaId, isGestor)
  const { membros } = useMembrosMesa(mesaId)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [abertoId, setAbertoId] = useState(null)
  const [modo, setModo] = useState('ler') // ler | editar | novo | revelar
  const [erro, setErro] = useState('')

  const jogadores = useMemo(() => membros.filter(m => m.usuario_id !== meuId && !GESTORES.includes(m.role)), [membros, meuId])
  const idsJogadores = jogadores.map(j => j.usuario_id)
  const lista = ordenarVerbetes(buscarVerbetes(enc.verbetes, { busca, tipo: tipo || null }))
  const aberto = enc.verbetes.find(v => v.id === abertoId)

  if (enc.indisponivel) return <p className="text-ink-dim text-sm">A enciclopédia ainda não está disponível neste servidor.</p>

  function abrir(id) { setAbertoId(id); setModo('ler'); setErro('') }

  async function apagar() {
    if (!window.confirm(`Apagar "${aberto.titulo}"? Quem já viu deixa de ver.`)) return
    try { await enc.remover(aberto.id); setAbertoId(null) } catch (e) { setErro(e.message) }
  }

  const vazio = !enc.carregando && enc.verbetes.length === 0

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr] items-start">
      <aside className={`space-y-3 ${aberto || modo === 'novo' ? 'hidden lg:block' : ''}`}>
        {isGestor && <Botao variante="primario" className="w-full" onClick={() => { setAbertoId(null); setModo('novo') }}>+ Novo verbete</Botao>}
        <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar na enciclopédia" className={CAMPO} />
        <select value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Filtrar por tipo" className={CAMPO}>
          <option value="">Todos os tipos</option>
          {TIPOS_VERBETE.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <ul className="space-y-1">
          {lista.map(v => {
            const t = tipoDe(v.tipo)
            const estado = isGestor ? ESTADOS[estadoRevelacao(v, enc.revelacoes, idsJogadores)] : null
            return (
              <li key={v.id}>
                <button
                  type="button" onClick={() => abrir(v.id)} aria-current={v.id === abertoId}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm transition-colors ${v.id === abertoId ? 'bg-slate-700 text-ink' : 'text-ink hover:bg-slate-800'}`}
                >
                  <Ilustra nome={t.icone} tamanho={20} className="shrink-0" />
                  <span className={`flex-1 min-w-0 truncate ${v.titulo ? '' : 'italic text-ink-dim'}`}>{v.titulo || `${t.nome} desconhecido`}</span>
                  {estado && <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${estado.cls}`}>{estado.nome}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        {!vazio && lista.length === 0 && <p className="text-ink-dim text-sm">Nada encontrado.</p>}
      </aside>

      <section className="min-w-0 rounded-2xl border border-border bg-raised/60 p-5">
        {(aberto || modo === 'novo') && (
          <Botao variante="fantasma" tamanho="sm" className="lg:hidden mb-3" onClick={() => { setAbertoId(null); setModo('ler') }}>← Voltar à lista</Botao>
        )}
        {modo === 'novo' && (
          <FormVerbete
            enviarImagem={f => enc.enviarImagem(f, meuId)}
            onSalvar={async linha => { const v = await enc.salvar(null, linha); abrir(v.id) }}
            onCancelar={() => setModo('ler')}
          />
        )}
        {modo !== 'novo' && aberto && modo === 'editar' && (
          <FormVerbete
            key={aberto.id} inicial={aberto} enviarImagem={f => enc.enviarImagem(f, meuId)}
            onSalvar={async linha => { await enc.salvar(aberto.id, linha); setModo('ler') }}
            onCancelar={() => setModo('ler')}
          />
        )}
        {modo !== 'novo' && aberto && modo !== 'editar' && (
          <DetalheVerbete verbete={aberto} verbetes={enc.verbetes} isGestor={isGestor} onAbrir={abrir}>
            {isGestor && (
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex flex-wrap gap-2">
                  <Botao variante="primario" tamanho="sm" onClick={() => setModo('revelar')}>{aberto.tipo === 'handout' ? 'Entregar…' : 'Revelar…'}</Botao>
                  <Botao variante="contorno" tamanho="sm" onClick={() => setModo('editar')}>Editar</Botao>
                  <Botao variante="fantasma" tamanho="sm" className="text-red-300 hover:text-white hover:bg-red-950/40" onClick={apagar}>Apagar</Botao>
                </div>
                {modo === 'revelar' && (
                  <RevelarVerbete
                    key={aberto.id} verbete={aberto} jogadores={jogadores}
                    onEntregar={(us, cs, av) => enc.entregar(aberto.id, us, cs, av)}
                    onFechar={() => setModo('ler')}
                  />
                )}
                <MatrizRevelacao
                  verbete={aberto} revelacoes={enc.revelacoes} jogadores={jogadores}
                  onEntregar={(us, cs, av) => enc.entregar(aberto.id, us, cs, av)}
                  onEsconder={(u, c) => enc.esconder(aberto.id, u, c)}
                />
                {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
              </div>
            )}
          </DetalheVerbete>
        )}
        {modo !== 'novo' && !aberto && (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <Ilustra nome="tomo" tamanho={64} />
            {vazio ? (
              <p className="text-ink-dim text-sm max-w-sm">
                {isGestor
                  ? 'Crie NPCs, lugares, facções e documentos. Tudo nasce secreto — você revela campo a campo, para quem quiser.'
                  : 'O mestre ainda não revelou nada. Quando revelar, aparece aqui e você recebe um aviso.'}
              </p>
            ) : (
              <p className="text-ink-dim text-sm">Escolha um verbete na lista.</p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { useEnciclopedia } from '../../hooks/useEnciclopedia'
import { useMembrosMesa } from '../../hooks/useMembrosMesa'
import {
  LIMITES, TIPOS_VERBETE, buscarVerbetes, camposRevelaveis, contarPorTipo, estadoRevelacao,
  indicePorTipo, inserirMencao, nomeDoCampo, ordenarVerbetes, partesComMencoes, quemSabe,
  relacionados, tipoDe, validarVerbete,
} from '../../lib/enciclopedia'
import Botao from '../ui/Botao'
import Icone from '../ui/Icone'
import Abas from '../ui/Abas'
import Modal, { FecharModal } from '../ui/Modal'
import EstadoVazio from '../ui/EstadoVazio'
import Esqueleto from '../ui/Esqueleto'
import CabecalhoSecao from '../ui/CabecalhoSecao'
import Ilustra from '../arte/Ilustra'
import GeradorNpc from './GeradorNpc'
import PainelAtlas from './PainelAtlas'
import { useConfirmar } from '../ui/Confirmar'
import { useToast } from '../ui/Toast'

// estado de revelação: ícone + texto + forma (não depende só da cor)
const ESTADOS = {
  oculto:   { nome: 'Oculto',   icone: 'cadeado', cls: 'border-border text-ink-dim bg-void/60' },
  parcial:  { nome: 'Parcial',  icone: 'olho',    cls: 'border-accent-500/60 text-accent-300 bg-accent-800/20' },
  revelado: { nome: 'Revelado', icone: 'check',   cls: 'border-ok/50 text-ok bg-ok/10' },
}
const GESTORES = ['mestre', 'co-mestre']
const PLURAL = { npc: 'NPCs', local: 'Locais', faccao: 'Facções', divindade: 'Divindades', item: 'Itens', lore: 'História', handout: 'Documentos', outro: 'Outros' }

function SeloEstado({ estado }) {
  const e = ESTADOS[estado]
  return (
    <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border ${e.cls}`}>
      <Icone nome={e.icone} tamanho={12} espessura={2} /> {e.nome}
    </span>
  )
}

/** Texto com [[menções]] virando links que abrem o verbete citado. */
function TextoComMencoes({ texto, verbetes, onAbrir, className = '', como: Tag = 'p' }) {
  return (
    <Tag className={`whitespace-pre-wrap ${className}`}>
      {partesComMencoes(texto, verbetes).map((p, i) => p.alvo
        ? <button key={i} type="button" onClick={() => onAbrir(p.alvo.id)} className="link-wiki">{p.texto}</button>
        : <span key={i}>{p.texto}</span>)}
    </Tag>
  )
}

/** Editor do verbete em seções: básico, detalhes do tipo, texto, notas do mestre, imagem e etiquetas. */
function FormVerbete({ inicial, verbetes = [], onSalvar, onCancelar, enviarImagem }) {
  const [v, setV] = useState(() => ({
    tipo: inicial?.tipo || 'npc', titulo: inicial?.titulo || '', resumo: inicial?.resumo || '',
    corpo: inicial?.corpo || '', segredo: inicial?.segredo || '', imagem_url: inicial?.imagem_url || '',
    tags: (inicial?.tags || []).join(', '), campos: { ...(inicial?.campos || {}) },
  }))
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')
  const corpoRef = useRef(null)
  const muda = k => e => setV(x => ({ ...x, [k]: e.target.value }))
  const tipo = tipoDe(v.tipo)
  const outros = ordenarVerbetes(verbetes.filter(x => x.titulo && x.id !== inicial?.id))

  async function imagem(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOcupado('imagem'); setErro('')
    try { const url = await enviarImagem(file); setV(x => ({ ...x, imagem_url: url })) }
    catch (err) { setErro(err.message) } finally { setOcupado('') }
  }

  // "Ligar a outro verbete": põe [[Título]] onde o cursor está no texto
  function ligar(titulo) {
    if (!titulo) return
    const el = corpoRef.current
    const { texto, cursor } = inserirMencao(v.corpo, el ? el.selectionStart : v.corpo.length, titulo)
    setV(x => ({ ...x, corpo: texto }))
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(cursor, cursor) } })
  }

  async function enviar(e) {
    e.preventDefault()
    const c = validarVerbete(v)
    if (!c.ok) { setErro(c.erro); return }
    setOcupado('salvando'); setErro('')
    try { await onSalvar(c.linha) } catch (err) { setErro(err.message); setOcupado('') }
  }

  const SECAO = 'space-y-3'
  const TITULO_SECAO = 'text-ink-dim text-xs font-semibold uppercase tracking-wider'

  return (
    <form onSubmit={enviar} className="space-y-7">
      <section className={SECAO}>
        <p className={TITULO_SECAO}>Tipo</p>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo do verbete">
          {TIPOS_VERBETE.map(t => (
            <button
              key={t.id} type="button" role="radio" aria-checked={v.tipo === t.id}
              onClick={() => setV(x => ({ ...x, tipo: t.id }))}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors duration-rapida ${v.tipo === t.id ? 'selecionado text-ink font-medium' : 'border-border text-ink-dim hover:text-ink hover:border-accent-700'}`}
            ><Ilustra nome={t.icone} tamanho={16} />{t.nome}</button>
          ))}
        </div>
      </section>

      <section className={SECAO}>
        <label className="block"><span className="rotulo">Nome</span>
          <input value={v.titulo} onChange={muda('titulo')} maxLength={LIMITES.titulo} required className="campo w-full !text-base" placeholder="Ex.: Velha Mirta" />
        </label>
        <label className="block"><span className="rotulo">Resumo <span className="rotulo-dica inline">· o que os jogadores veem primeiro</span></span>
          <textarea value={v.resumo} onChange={muda('resumo')} maxLength={LIMITES.resumo} rows={2} className="campo w-full" placeholder="Uma ou duas frases." />
        </label>
      </section>

      {tipo.campos.length > 0 && (
        <section className={SECAO}>
          <p className={TITULO_SECAO}>Detalhes de {tipo.nome.toLowerCase()}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {tipo.campos.map(c => (
              <label key={c.id} className="block"><span className="rotulo">{c.nome}</span>
                <input
                  value={v.campos[c.id] || ''} maxLength={LIMITES.campo} className="campo w-full"
                  onChange={e => setV(x => ({ ...x, campos: { ...x.campos, [c.id]: e.target.value } }))}
                />
              </label>
            ))}
          </div>
        </section>
      )}

      <section className={SECAO}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className={TITULO_SECAO}>{v.tipo === 'handout' ? 'Texto do documento' : 'Texto'}</p>
          {outros.length > 0 && (
            <select value="" onChange={e => ligar(e.target.value)} className="campo !min-h-[34px] !py-1 !text-sm max-w-[16rem]" aria-label="Ligar a outro verbete">
              <option value="">Ligar a outro verbete…</option>
              {outros.map(o => <option key={o.id} value={o.titulo}>{tipoDe(o.tipo).nome}: {o.titulo}</option>)}
            </select>
          )}
        </div>
        <textarea ref={corpoRef} value={v.corpo} onChange={muda('corpo')} maxLength={LIMITES.corpo} rows={9} className="campo w-full leading-relaxed" aria-describedby="dica-mencao" aria-label="Texto" />
        <p id="dica-mencao" className="text-xs text-ink-dim">Escreva <code className="text-ink">[[Nome de outro verbete]]</code> (ou use o seletor acima) para ligar os dois. Ligação para verbete ainda secreto aparece como texto comum para os jogadores.</p>
      </section>

      <section className="rounded-xl border border-dashed border-accent-600/60 bg-accent-800/10 p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-300"><Icone nome="cadeado" tamanho={14} /> Apenas o mestre</p>
        <textarea value={v.segredo} onChange={muda('segredo')} maxLength={LIMITES.segredo} rows={3} className="campo w-full" placeholder="O que só você sabe. Nunca é revelado." aria-label="Notas do mestre" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 items-start">
        <label className="block"><span className="rotulo">Etiquetas</span>
          <input value={v.tags} onChange={muda('tags')} className="campo w-full" placeholder="aliada, capítulo 2" />
          <span className="rotulo-dica">Separadas por vírgula.</span>
        </label>
        <div>
          <span className="rotulo">Imagem</span>
          <div className="flex flex-wrap items-center gap-2">
            {v.imagem_url && <img src={v.imagem_url} alt="" className="h-14 w-14 rounded-lg object-cover border border-border" />}
            <label className="botao inline-flex items-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg bg-hover hover:bg-border text-ink text-sm cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-400">
              <Icone nome="enviar" tamanho={16} />
              {ocupado === 'imagem' ? 'Enviando…' : v.imagem_url ? 'Trocar' : 'Escolher imagem'}
              <input type="file" accept="image/*" onChange={imagem} disabled={!!ocupado} className="sr-only" />
            </label>
            {v.imagem_url && <Botao variante="fantasma" tamanho="sm" onClick={() => setV(x => ({ ...x, imagem_url: '' }))}>Tirar</Botao>}
          </div>
        </div>
      </section>

      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        <Botao type="submit" variante="primario" disabled={!!ocupado}>{ocupado === 'salvando' ? 'Salvando…' : 'Salvar verbete'}</Botao>
        <Botao variante="fantasma" onClick={onCancelar}>Cancelar</Botao>
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
    try { await onEntregar(paraTodos ? [] : alvos, campos, avisar); onFechar(true) }
    catch (e) { setErro(e.message); setOcupado(false) }
  }

  const OPCAO = 'flex items-center gap-2.5 text-sm text-ink min-h-[32px] cursor-pointer'
  return (
    <Modal
      onFechar={() => onFechar(false)} bloqueado={ocupado} tamanho="md"
      titulo={documento ? 'Entregar documento' : 'Revelar aos jogadores'} subtitulo={verbete.titulo}
      rodape={
        <>
          <FecharModal disabled={ocupado} />
          <Botao variante="primario" onClick={confirmar} disabled={ocupado}>{ocupado ? 'Revelando…' : documento ? 'Entregar' : 'Revelar'}</Botao>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset className="space-y-1">
          <legend className="rotulo">Para quem</legend>
          <label className={OPCAO}><input type="radio" checked={paraTodos} onChange={() => setParaTodos(true)} className="accent-purple-500" /> A mesa toda</label>
          <label className={OPCAO}><input type="radio" checked={!paraTodos} onChange={() => setParaTodos(false)} className="accent-purple-500" /> Só alguns</label>
          {!paraTodos && (
            <div className="flex flex-wrap gap-x-4 pl-7">
              {jogadores.length === 0 && <span className="text-sm text-ink-dim">Ninguém na mesa ainda.</span>}
              {jogadores.map(j => (
                <label key={j.usuario_id} className={OPCAO}>
                  <input type="checkbox" checked={alvos.includes(j.usuario_id)} onChange={() => alterna(alvos, setAlvos, j.usuario_id)} className="accent-purple-500" /> {j.nome}
                </label>
              ))}
            </div>
          )}
        </fieldset>
        <fieldset>
          <legend className="rotulo">O quê</legend>
          <div className="flex flex-wrap gap-x-5">
            {revelaveis.map(c => (
              <label key={c} className={OPCAO}>
                <input type="checkbox" checked={campos.includes(c)} onChange={() => alterna(campos, setCampos, c)} className="accent-purple-500" /> {nomeDoCampo(c, verbete.tipo)}
              </label>
            ))}
          </div>
          <p className="text-xs text-ink-dim mt-1">As notas do mestre nunca são reveladas.</p>
        </fieldset>
        <label className={OPCAO}>
          <input type="checkbox" checked={avisar} onChange={e => setAvisar(e.target.checked)} className="accent-purple-500" /> Avisar pelo sininho
        </label>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      </div>
    </Modal>
  )
}

/** F42 — quem sabe o quê. Clicar numa marca esconde de novo; num vazio, revela (sem aviso). */
function MatrizRevelacao({ verbete, revelacoes, jogadores, onEntregar, onEsconder }) {
  const [erro, setErro] = useState('')
  const campos = camposRevelaveis(verbete)
  const { todos } = quemSabe(revelacoes, verbete.id, [])
  const direto = (u, c) => revelacoes.some(r => r.verbete_id === verbete.id && r.usuario_id === u && r.campo === c)
  const acao = fn => async () => { setErro(''); try { await fn() } catch (e) { setErro(e.message) } }
  const cel = 'w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors duration-rapida'

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="text-sm w-full">
          <thead className="bg-void/60">
            <tr className="text-xs text-ink-dim">
              <th className="text-left font-semibold px-3 py-2">Campo</th>
              <th className="font-semibold px-2 py-2">Mesa toda</th>
              {jogadores.map(j => <th key={j.usuario_id} className="font-semibold px-2 py-2 max-w-[7rem] truncate">{j.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {campos.map(c => {
              const nome = nomeDoCampo(c, verbete.tipo)
              return (
                <tr key={c} className="border-t border-border/60">
                  <td className="px-3 py-1.5 text-ink">{nome}</td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      type="button" className={`${cel} ${todos.has(c) ? 'bg-accent-600 text-sobre-acento' : 'border border-border text-ink-dim hover:bg-hover'}`}
                      aria-label={todos.has(c) ? `Esconder ${nome} da mesa toda` : `Revelar ${nome} à mesa toda`} aria-pressed={todos.has(c)}
                      onClick={acao(() => todos.has(c) ? onEsconder(null, c) : onEntregar([], [c], false))}
                    >{todos.has(c) ? <Icone nome="check" tamanho={16} espessura={2.2} /> : <Icone nome="menos" tamanho={14} />}</button>
                  </td>
                  {jogadores.map(j => {
                    const sabe = direto(j.usuario_id, c)
                    if (todos.has(c) && !sabe) return <td key={j.usuario_id} className="px-2 py-1.5 text-center text-ink-dim" title="Revelado à mesa toda"><Icone nome="check" tamanho={16} className="mx-auto" /></td>
                    return (
                      <td key={j.usuario_id} className="px-2 py-1.5 text-center">
                        <button
                          type="button" className={`${cel} ${sabe ? 'bg-accent-700 text-white' : 'border border-border text-ink-dim hover:bg-hover'}`}
                          aria-label={sabe ? `Esconder ${nome} de ${j.nome}` : `Revelar ${nome} a ${j.nome}`} aria-pressed={sabe}
                          onClick={acao(() => sabe ? onEsconder(j.usuario_id, c) : onEntregar([j.usuario_id], [c], false))}
                        >{sabe ? <Icone nome="check" tamanho={16} espessura={2.2} /> : <Icone nome="menos" tamanho={14} />}</button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-dim">Clique num quadrado para revelar só aquele campo (sem aviso) ou para esconder de novo.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
    </div>
  )
}

/** Artigo da wiki: título, resumo em destaque, texto, caixa de informações e ligações. */
function ArtigoVerbete({ verbete, verbetes, isGestor, estado, onAbrir, acoes, children }) {
  const tipo = tipoDe(verbete.tipo)
  const campos = tipo.campos.filter(c => verbete.campos?.[c.id])
  const { cita, citadoPor } = relacionados(verbete, verbetes)
  const temCaixa = verbete.imagem_url || campos.length > 0
  const ligacoes = [...cita.map(v => ({ v, rel: 'citado aqui' })), ...citadoPor.filter(v => !cita.some(c => c.id === v.id)).map(v => ({ v, rel: 'cita este' }))]

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <nav aria-label="Caminho" className="flex items-center gap-1.5 text-xs text-ink-dim">
          <span>Enciclopédia</span><Icone nome="chevron-dir" tamanho={12} /><span>{PLURAL[tipo.id] || tipo.nome}</span>
        </nav>
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-[12rem]">
            <h2 className="font-sora text-3xl font-bold text-ink leading-tight tracking-tight break-words">
              {verbete.titulo || <span className="italic text-ink-dim font-normal">Nome ainda desconhecido</span>}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-dim border border-border rounded-full px-2 py-0.5">
                <Ilustra nome={tipo.icone} tamanho={14} /> {tipo.nome}
              </span>
              {estado && <SeloEstado estado={estado} />}
              {verbete.tags?.map(t => <span key={t} className="text-xs text-accent-300">#{t}</span>)}
            </div>
          </div>
          {acoes}
        </div>
      </header>

      <div className={`grid gap-6 grid-cols-1 ${temCaixa ? 'xl:grid-cols-[minmax(0,1fr)_17rem]' : ''}`}>
        {/* caixa de informações: no celular vem antes do texto */}
        {temCaixa && (
          <aside className="xl:order-2 rounded-2xl border border-border bg-void/50 overflow-hidden self-start" aria-label="Informações">
            {verbete.imagem_url && <img src={verbete.imagem_url} alt={verbete.titulo || ''} className="w-full max-h-72 object-cover border-b border-border/70" />}
            {campos.length > 0 && (
              <dl className="divide-y divide-border/60">
                {campos.map(c => (
                  <div key={c.id} className="px-4 py-2.5">
                    <dt className="text-xs text-ink-dim font-semibold uppercase tracking-wider">{c.nome}</dt>
                    <TextoComMencoes como="dd" texto={verbete.campos[c.id]} verbetes={verbetes} onAbrir={onAbrir} className="text-ink text-sm mt-0.5" />
                  </div>
                ))}
              </dl>
            )}
          </aside>
        )}

        <div className="min-w-0 space-y-5">
          {verbete.resumo && (
            <TextoComMencoes texto={verbete.resumo} verbetes={verbetes} onAbrir={onAbrir} className="text-ink text-lg leading-relaxed" />
          )}
          {verbete.corpo && (
            <TextoComMencoes
              texto={verbete.corpo} verbetes={verbetes} onAbrir={onAbrir}
              className={`text-ink leading-relaxed ${verbete.tipo === 'handout' ? 'documento-verbete' : ''}`}
            />
          )}
          {!isGestor && !verbete.resumo && !verbete.corpo && !campos.length && !verbete.imagem_url && (
            <p className="text-ink-dim">Por enquanto, só isso. O mestre pode revelar mais depois.</p>
          )}
          {isGestor && verbete.segredo && (
            <div className="rounded-xl border border-dashed border-accent-600/60 bg-accent-800/10 p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-300 mb-1"><Icone nome="cadeado" tamanho={14} /> Apenas o mestre</p>
              <p className="text-ink text-sm whitespace-pre-wrap">{verbete.segredo}</p>
            </div>
          )}
        </div>
      </div>

      {ligacoes.length > 0 && (
        <section className="space-y-2" aria-label="Relacionados">
          <p className="text-ink-dim text-xs font-semibold uppercase tracking-wider">Relacionados</p>
          <div className="flex flex-wrap gap-2">
            {ligacoes.map(({ v, rel }) => (
              <button
                key={v.id} type="button" onClick={() => onAbrir(v.id)}
                className="cartao inline-flex items-center gap-2 rounded-xl border border-border bg-raised/70 pl-2 pr-3 py-1.5 text-left"
              >
                <Ilustra nome={tipoDe(v.tipo).icone} tamanho={20} />
                <span>
                  <span className="block text-sm text-ink font-medium">{v.titulo}</span>
                  <span className="block text-xs text-ink-dim">{tipoDe(v.tipo).nome} · {rel}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {children}
    </article>
  )
}

/**
 * Fases 41/42 → 52 — enciclopédia da campanha como WIKI: índice por
 * categoria, artigo com caixa de informações e ligações entre verbetes, e a
 * revelação campo a campo (o jogador só lê o que foi revelado a ele).
 */
export default function PainelEnciclopedia({ mesaId, meuId, isGestor }) {
  const { confirmar } = useConfirmar()
  const toast = useToast()
  const enc = useEnciclopedia(mesaId, isGestor)
  const { membros } = useMembrosMesa(mesaId)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const [abertoId, setAbertoId] = useState(null)
  const [modo, setModo] = useState('ler') // ler | editar | novo | gerar
  const [revelando, setRevelando] = useState(false)
  const [rascunho, setRascunho] = useState(null) // F46 — NPC gerado indo para o formulário
  const [erro, setErro] = useState('')
  const [vista, setVista] = useState('verbetes') // F48: verbetes | atlas
  const artigoRef = useRef(null)

  const jogadores = useMemo(() => membros.filter(m => m.usuario_id !== meuId && !GESTORES.includes(m.role)), [membros, meuId])
  const idsJogadores = jogadores.map(j => j.usuario_id)
  const filtrada = buscarVerbetes(enc.verbetes, { busca, tipo: tipo || null })
  const contagem = contarPorTipo(enc.verbetes)
  const aberto = enc.verbetes.find(v => v.id === abertoId)
  const estadoDe = v => (isGestor ? estadoRevelacao(v, enc.revelacoes, idsJogadores) : null)

  if (enc.indisponivel) return <p className="text-ink-dim text-sm">A enciclopédia ainda não está disponível neste servidor.</p>

  function abrir(id) {
    setAbertoId(id); setModo('ler'); setErro('')
    // no celular a lista e o artigo não cabem juntos: leva o artigo para a vista
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => artigoRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }))
    }
  }

  async function apagar() {
    if (!(await confirmar({ titulo: 'Apagar verbete?', mensagem: `${aberto.titulo} sai da enciclopédia. Quem já viu deixa de ver.`, confirmar: 'Apagar', perigo: true }))) return
    try { await enc.remover(aberto.id); setAbertoId(null); toast.ok('Verbete apagado') } catch (e) { setErro(e.message) }
  }

  const vazio = !enc.carregando && enc.verbetes.length === 0
  const criando = modo === 'novo' || modo === 'gerar'
  const agrupar = !busca.trim() && !tipo

  const item = v => {
    const t = tipoDe(v.tipo)
    const estado = estadoDe(v)
    const atual = v.id === abertoId
    return (
      <li key={v.id}>
        <button
          type="button" onClick={() => abrir(v.id)} aria-current={atual || undefined}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors duration-rapida ${atual ? 'selecionado' : 'border-transparent hover:bg-hover/70'}`}
        >
          <Ilustra nome={t.icone} tamanho={22} className="shrink-0" />
          <span className="flex-1 min-w-0">
            <span className={`block text-sm truncate ${v.titulo ? 'text-ink font-medium' : 'italic text-ink-dim'}`}>{v.titulo || `${t.nome} desconhecido`}</span>
            {v.resumo && <span className="block text-xs text-ink-dim truncate">{v.resumo}</span>}
          </span>
          {estado && <SeloEstado estado={estado} />}
        </button>
      </li>
    )
  }

  return (
    <div className="space-y-6">
      <CabecalhoSecao
        titulo="Enciclopédia da campanha"
        descricao={isGestor
          ? 'NPCs, lugares, facções, itens e documentos. Tudo nasce secreto; você revela campo a campo.'
          : 'O que a mesa já descobriu sobre o mundo.'}
        acoes={isGestor && vista === 'verbetes' && (
          <>
            <Botao variante="contorno" onClick={() => { setAbertoId(null); setModo('gerar') }}><Ilustra nome="elmo" tamanho={16} /> Gerar NPC</Botao>
            <Botao variante="primario" onClick={() => { setAbertoId(null); setRascunho(null); setModo('novo') }}><Icone nome="mais" tamanho={18} /> Novo verbete</Botao>
          </>
        )}
      />

      <div className="max-w-xs">
        <Abas tamanho="sm" rotulo="Ver" atual={vista} onTrocar={setVista} abas={[
          { id: 'verbetes', rotulo: 'Verbetes', icone: <Ilustra nome="tomo" tamanho={16} /> },
          { id: 'atlas', rotulo: 'Atlas', icone: <Ilustra nome="mapa" tamanho={16} /> },
        ]} />
      </div>

      {vista === 'atlas' ? (
        <div key="atlas" className="entra-aba">
          <PainelAtlas
            mesaId={mesaId} isGestor={isGestor} verbetes={enc.verbetes}
            enviarImagem={(f, lado) => enc.enviarImagem(f, meuId, lado)}
            onAbrirVerbete={id => { setVista('verbetes'); abrir(id) }}
          />
        </div>
      ) : enc.carregando ? (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[19rem_minmax(0,1fr)]" role="status" aria-label="Carregando">
          <div className="space-y-2">{[1, 2, 3, 4].map(i => <Esqueleto key={i} className="h-11" />)}</div>
          <div className="rounded-2xl border border-border p-6 space-y-3"><Esqueleto className="h-8 w-1/2" /><Esqueleto className="h-4" /><Esqueleto className="h-4 w-5/6" /></div>
        </div>
      ) : vazio && !criando ? (
        <EstadoVazio
          arte="tomo" titulo={isGestor ? 'A enciclopédia está vazia' : 'Nada revelado ainda'}
          descricao={isGestor
            ? 'Crie o primeiro verbete ou gere um NPC. Os jogadores só veem o que você revelar.'
            : 'Quando o mestre revelar algo, aparece aqui e você recebe um aviso.'}
        >
          {isGestor && (
            <>
              <Botao variante="contorno" onClick={() => setModo('gerar')}>Gerar NPC</Botao>
              <Botao variante="primario" onClick={() => setModo('novo')}><Icone nome="mais" tamanho={18} /> Novo verbete</Botao>
            </>
          )}
        </EstadoVazio>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[19rem_minmax(0,1fr)] items-start">
          {/* ── Índice ── */}
          <aside className={`space-y-3 lg:sticky lg:top-32 ${aberto || criando ? 'hidden lg:block' : ''}`} aria-label="Índice">
            <label className="relative block">
              <span className="sr-only">Buscar na enciclopédia</span>
              <Icone nome="busca" tamanho={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar em tudo…" className="campo w-full !pl-9" />
            </label>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria">
              {[{ id: '', nome: 'Tudo', n: enc.verbetes.length }, ...TIPOS_VERBETE.filter(t => contagem[t.id]).map(t => ({ id: t.id, nome: PLURAL[t.id], n: contagem[t.id] }))].map(c => (
                <button
                  key={c.id || 'tudo'} type="button" onClick={() => setTipo(c.id)} aria-pressed={tipo === c.id}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs transition-colors duration-rapida ${tipo === c.id ? 'selecionado text-ink font-semibold' : 'border-border text-ink-dim hover:text-ink'}`}
                >{c.nome} <span className="tabular-nums opacity-80">{c.n}</span></button>
              ))}
            </div>

            <div className="lg:max-h-[calc(100vh-17rem)] lg:overflow-y-auto lg:pr-1 -mx-1 px-1">
              {filtrada.length === 0 ? (
                <p className="text-ink-dim text-sm px-1 py-4">Nada encontrado com essa busca.</p>
              ) : agrupar ? (
                <div className="space-y-4">
                  {indicePorTipo(filtrada).map(g => (
                    <section key={g.tipo.id}>
                      <h3 className="text-ink-dim text-xs font-semibold uppercase tracking-wider px-2.5 mb-1">{PLURAL[g.tipo.id]}</h3>
                      <ul className="space-y-0.5">{g.itens.map(item)}</ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="space-y-0.5">{ordenarVerbetes(filtrada).map(item)}</ul>
              )}
            </div>
          </aside>

          {/* ── Artigo ── */}
          <section ref={artigoRef} className="min-w-0 rounded-2xl border border-border bg-raised/60 p-5 sm:p-7 scroll-mt-32" aria-label="Artigo">
            {(aberto || criando) && (
              <Botao variante="fantasma" tamanho="sm" className="lg:hidden mb-4" onClick={() => { setAbertoId(null); setModo('ler') }}>
                <Icone nome="seta-esq" tamanho={16} /> Voltar ao índice
              </Botao>
            )}
            {modo === 'gerar' && (
              <div key="gerar" className="entra-aba">
                <GeradorNpc
                  onSalvar={async linha => { const c = validarVerbete(linha); if (!c.ok) throw new Error(c.erro); const v = await enc.salvar(null, c.linha); abrir(v.id); toast.ok('NPC salvo na enciclopédia', { detalhe: 'Nasce secreto: revele quando quiser.' }) }}
                  onAjustar={linha => { setRascunho(linha); setModo('novo') }}
                  onCancelar={() => setModo('ler')}
                />
              </div>
            )}
            {modo === 'novo' && (
              <div key={rascunho ? 'rascunho' : 'novo'} className="entra-aba space-y-5">
                <h2 className="font-sora text-2xl font-bold text-ink">Novo verbete</h2>
                <FormVerbete
                  inicial={rascunho} verbetes={enc.verbetes}
                  enviarImagem={f => enc.enviarImagem(f, meuId)}
                  onSalvar={async linha => { const v = await enc.salvar(null, linha); abrir(v.id); toast.ok('Verbete criado', { detalhe: 'Nasce secreto: revele quando quiser.' }) }}
                  onCancelar={() => setModo('ler')}
                />
              </div>
            )}
            {!criando && aberto && modo === 'editar' && (
              <div key={`editar-${aberto.id}`} className="entra-aba space-y-5">
                <h2 className="font-sora text-2xl font-bold text-ink">Editar verbete</h2>
                <FormVerbete
                  inicial={aberto} verbetes={enc.verbetes} enviarImagem={f => enc.enviarImagem(f, meuId)}
                  onSalvar={async linha => { await enc.salvar(aberto.id, linha); setModo('ler'); toast.ok('Verbete salvo') }}
                  onCancelar={() => setModo('ler')}
                />
              </div>
            )}
            {!criando && aberto && modo !== 'editar' && (
              <div key={aberto.id} className="entra-aba">
                <ArtigoVerbete
                  verbete={aberto} verbetes={enc.verbetes} isGestor={isGestor} estado={estadoDe(aberto)} onAbrir={abrir}
                  acoes={isGestor && (
                    <div className="flex flex-wrap gap-1.5">
                      <Botao variante="primario" tamanho="sm" onClick={() => setRevelando(true)}>
                        <Icone nome="olho" tamanho={16} /> {aberto.tipo === 'handout' ? 'Entregar' : 'Revelar'}
                      </Botao>
                      <Botao variante="contorno" tamanho="sm" onClick={() => setModo('editar')}><Icone nome="editar" tamanho={16} /> Editar</Botao>
                      <button type="button" onClick={apagar} aria-label="Apagar verbete" data-dica="Apagar" className="botao-icone hover:!text-harm"><Icone nome="lixeira" tamanho={18} /></button>
                    </div>
                  )}
                >
                  {isGestor && (
                    <details className="group/rev rounded-xl border border-border/70 p-4" open={estadoDe(aberto) !== 'oculto'}>
                      <summary className="cursor-pointer list-none flex items-center gap-2 text-ink font-medium">
                        <Icone nome="chevron-dir" tamanho={16} className="text-ink-dim transition-transform duration-normal group-open/rev:rotate-90" />
                        Quem sabe o quê
                        <span className="text-ink-dim text-sm font-normal">· só você vê</span>
                      </summary>
                      <div className="mt-4">
                        <MatrizRevelacao
                          verbete={aberto} revelacoes={enc.revelacoes} jogadores={jogadores}
                          onEntregar={(us, cs, av) => enc.entregar(aberto.id, us, cs, av)}
                          onEsconder={(u, c) => enc.esconder(aberto.id, u, c)}
                        />
                      </div>
                    </details>
                  )}
                  {erro && <p className="aviso-erro" role="alert">{erro}</p>}
                </ArtigoVerbete>
                {revelando && (
                  <RevelarVerbete
                    verbete={aberto} jogadores={jogadores}
                    onEntregar={(us, cs, av) => enc.entregar(aberto.id, us, cs, av)}
                    onFechar={feito => { setRevelando(false); if (feito) toast.ok(aberto.tipo === 'handout' ? 'Documento entregue' : 'Revelado aos jogadores') }}
                  />
                )}
              </div>
            )}
            {!criando && !aberto && (
              <div className="flex flex-col items-center text-center gap-3 py-12">
                <Ilustra nome="tomo" tamanho={64} />
                <p className="text-ink font-medium">Escolha um verbete no índice</p>
                <p className="text-ink-dim text-sm max-w-sm">Os nomes sublinhados dentro dos textos levam de um verbete para outro.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

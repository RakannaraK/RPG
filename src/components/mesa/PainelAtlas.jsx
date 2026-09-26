import { useRef, useState } from 'react'
import { useAtlas } from '../../hooks/useAtlas'
import { pinosDoMapa, posicaoNoMapa, semPino, validarAtlas } from '../../lib/atlas'
import Botao from '../ui/Botao'
import Ilustra from '../arte/Ilustra'

const CAMPO = 'px-3 py-2 rounded-lg bg-void border border-border text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:ring-1 focus:ring-accent-500'

function NovoMapa({ enviarImagem, onCriar, onCancelar }) {
  const [nome, setNome] = useState('')
  const [imagem, setImagem] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')

  async function escolher(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcupado('imagem'); setErro('')
    try { setImagem(await enviarImagem(file)) } catch (err) { setErro(err.message) } finally { setOcupado('') }
  }

  async function criar(e) {
    e.preventDefault()
    const v = validarAtlas({ nome, imagem_url: imagem })
    if (!v.ok) { setErro(v.erro); return }
    setOcupado('criando'); setErro('')
    try { await onCriar({ nome: v.nome, imagem_url: imagem }) } catch (err) { setErro(err.message); setOcupado('') }
  }

  return (
    <form onSubmit={criar} className="rounded-xl border border-border bg-void/40 p-4 space-y-3">
      <p className="text-ink text-sm font-semibold">Novo mapa</p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={nome} onChange={e => setNome(e.target.value)} maxLength={80} placeholder="Ex.: Reino de Valdor" aria-label="Nome do mapa" className={`${CAMPO} flex-1 min-w-[12rem]`} />
        <label className="inline-flex items-center min-h-[36px] px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-purple-100 text-sm cursor-pointer">
          {ocupado === 'imagem' ? 'Enviando…' : imagem ? 'Trocar imagem' : 'Escolher imagem'}
          <input type="file" accept="image/*" onChange={escolher} disabled={!!ocupado} className="sr-only" />
        </label>
      </div>
      {imagem && <img src={imagem} alt="" className="max-h-40 rounded-lg border border-border" />}
      <p className="text-xs text-ink-dim">O mapa nasce escondido dos jogadores. Você mostra quando quiser.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Botao type="submit" variante="primario" tamanho="sm" disabled={!!ocupado}>{ocupado === 'criando' ? 'Criando…' : 'Criar mapa'}</Botao>
        {onCancelar && <Botao variante="fantasma" tamanho="sm" onClick={onCancelar}>Cancelar</Botao>}
        {erro && <span className="text-harm text-xs" role="alert">{erro}</span>}
      </div>
    </form>
  )
}

/**
 * Fase 48 — atlas: mapas da campanha com pinos que abrem verbetes da
 * enciclopédia. O jogador vê só mapas mostrados e pinos do que já sabe.
 */
export default function PainelAtlas({ mesaId, isGestor, verbetes, enviarImagem, onAbrirVerbete }) {
  const atlas = useAtlas(mesaId)
  const [atualId, setAtualId] = useState(null)
  const [criando, setCriando] = useState(false)
  const [fixar, setFixar] = useState('') // verbete a fixar no próximo clique
  const [pinoAtivo, setPinoAtivo] = useState(null) // gestor: pino selecionado
  const [movendo, setMovendo] = useState(false)
  const [erro, setErro] = useState('')
  const imgRef = useRef(null)

  if (atlas.indisponivel) return <p className="text-ink-dim text-sm">O atlas ainda não está disponível neste servidor.</p>

  const mapa = atlas.mapas.find(m => m.id === atualId) || atlas.mapas[0] || null
  const pinos = mapa ? pinosDoMapa(atlas.pinos, mapa.id, verbetes) : []
  const ativo = pinos.find(p => p.id === pinoAtivo)
  const disponiveis = mapa ? semPino(verbetes, atlas.pinos, mapa.id) : []
  const nomeDe = id => verbetes.find(v => v.id === id)?.titulo || 'verbete'

  async function acao(fn) { setErro(''); try { await fn() } catch (e) { setErro(e.message) } }

  function clicarNoMapa(e) {
    if (!isGestor || (!fixar && !movendo)) return
    const pos = posicaoNoMapa(e.clientX, e.clientY, imgRef.current?.getBoundingClientRect())
    if (!pos) return
    if (movendo && ativo) acao(async () => { await atlas.moverPino(ativo.id, pos); setMovendo(false) })
    else if (fixar) acao(async () => { await atlas.porPino(mapa.id, fixar, pos); setFixar('') })
  }

  function clicarNoPino(e, p) {
    e.stopPropagation()
    if (isGestor) { setPinoAtivo(p.id === pinoAtivo ? null : p.id); setMovendo(false) }
    else onAbrirVerbete(p.verbete_id)
  }

  if (criando || (isGestor && !atlas.mapas.length)) {
    return (
      <NovoMapa
        enviarImagem={f => enviarImagem(f, 2400)}
        onCriar={async linha => { const m = await atlas.criar(linha); setAtualId(m.id); setCriando(false) }}
        onCancelar={atlas.mapas.length ? () => setCriando(false) : null}
      />
    )
  }

  if (!mapa) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-10">
        <Ilustra nome="mapa" tamanho={64} />
        <p className="text-ink-dim text-sm max-w-sm">O mestre ainda não mostrou nenhum mapa. Quando mostrar, os lugares que você conhece aparecem nele.</p>
      </div>
    )
  }

  const mirando = isGestor && (fixar || movendo)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {atlas.mapas.map(m => (
          <Botao key={m.id} tamanho="sm" variante={m.id === mapa.id ? 'primario' : 'contorno'} aria-pressed={m.id === mapa.id}
            onClick={() => { setAtualId(m.id); setPinoAtivo(null); setFixar(''); setMovendo(false) }}>
            {m.nome}{isGestor && !m.visivel ? ' (escondido)' : ''}
          </Botao>
        ))}
        {isGestor && <Botao variante="fantasma" tamanho="sm" onClick={() => setCriando(true)}>+ Mapa</Botao>}
      </div>

      {isGestor && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-void/40 p-2">
          <Botao
            variante={mapa.visivel ? 'primario' : 'secundario'} tamanho="sm" aria-pressed={mapa.visivel}
            onClick={() => acao(() => atlas.atualizar(mapa.id, { visivel: !mapa.visivel }))}
          >{mapa.visivel ? 'Visível aos jogadores' : 'Escondido dos jogadores'}</Botao>
          <label className="flex items-center gap-2 text-xs text-ink-dim">Fixar no mapa
            <select value={fixar} onChange={e => { setFixar(e.target.value); setPinoAtivo(null); setMovendo(false) }} className={`${CAMPO} py-1.5`}>
              <option value="">— escolha um verbete —</option>
              {disponiveis.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
            </select>
          </label>
          <Botao variante="fantasma" tamanho="sm" className="ml-auto text-red-300 hover:text-white hover:bg-red-950/40"
            onClick={() => window.confirm(`Apagar o mapa "${mapa.nome}" e todos os pinos dele?`) && acao(async () => { await atlas.remover(mapa.id); setAtualId(null) })}
          >Apagar mapa</Botao>
        </div>
      )}

      {mirando && (
        <p className="text-sm text-accent-300" role="status">
          Clique no mapa onde fica <strong>{movendo && ativo ? ativo.rotulo : nomeDe(fixar)}</strong>.
        </p>
      )}

      <div className={`relative select-none rounded-xl overflow-hidden border border-border ${mirando ? 'cursor-crosshair' : ''}`} onClick={clicarNoMapa}>
        <img ref={imgRef} src={mapa.imagem_url} alt={`Mapa: ${mapa.nome}`} className="w-full h-auto block" draggable={false} />
        {pinos.map(p => (
          <button
            key={p.id} type="button" onClick={e => clicarNoPino(e, p)}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            aria-label={`${p.rotulo} — abrir`} aria-pressed={isGestor ? p.id === pinoAtivo : undefined}
            className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center gap-0.5 group"
          >
            <span className={`rounded-full p-1 border-2 shadow-lg transition-transform group-hover:scale-110 ${p.id === pinoAtivo ? 'bg-accent-600 border-white' : 'bg-raised border-accent-500'}`}>
              <Ilustra nome={p.icone} tamanho={18} />
            </span>
            <span className="max-w-[9rem] truncate rounded-md bg-void/90 border border-border px-1.5 text-xs text-ink">{p.rotulo}</span>
          </button>
        ))}
      </div>

      {isGestor && ativo && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-void/40 p-2">
          <span className="text-sm text-ink font-semibold mr-auto">{ativo.rotulo}</span>
          <Botao variante="contorno" tamanho="sm" onClick={() => onAbrirVerbete(ativo.verbete_id)}>Abrir</Botao>
          <Botao variante="secundario" tamanho="sm" aria-pressed={movendo} onClick={() => { setMovendo(m => !m); setFixar('') }}>{movendo ? 'Cancelar mover' : 'Mover'}</Botao>
          <Botao variante="fantasma" tamanho="sm" onClick={() => acao(async () => { await atlas.tirarPino(ativo.id); setPinoAtivo(null) })}>Tirar do mapa</Botao>
        </div>
      )}

      {isGestor && (
        <p className="text-xs text-ink-dim">
          O jogador só vê o pino de um verbete depois que recebe alguma revelação dele (nome, resumo, qualquer campo).
        </p>
      )}
      {erro && <p className="text-harm text-xs" role="alert">{erro}</p>}
    </div>
  )
}

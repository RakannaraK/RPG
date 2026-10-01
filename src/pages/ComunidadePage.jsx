import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { souConvidado } from '../lib/convite'
import MesasAbertas from '../components/comunidade/MesasAbertas'
import { useComunidade } from '../hooks/useComunidade'
import { useMesas } from '../hooks/useMesa'
import { supabase } from '../lib/supabase'
import {
  TIPOS_PUBLICACAO, etiquetasPopulares, filtrarVitrine,
  nomeDoTipo, ordenarVitrine, textoCurtidas,
} from '../lib/comunidade'
import { quandoFoi } from '../lib/notificacoes'
import { redimensionarImagem } from '../lib/imageUtils'
import { gravarImportacao, prepararImportacao } from '../lib/fichaBanco'
import { importarSistemaNaMesa } from '../lib/importarSistema'
import Dice3D from '../components/dados/Dice3D'
import { rolarNotacao, validarNotacao } from '../lib/diceNotation'
import Ilustra from '../components/arte/Ilustra'
import Botao from '../components/ui/Botao'
import BarraTopo from '../components/ui/BarraTopo'
import Icone from '../components/ui/Icone'
import Avatar from '../components/ui/Avatar'
import Modal, { FecharModal } from '../components/ui/Modal'
import EstadoVazio from '../components/ui/EstadoVazio'
import { EsqueletoCartoes } from '../components/ui/Esqueleto'
import { useToast } from '../components/ui/Toast'
import { useConfirmar } from '../components/ui/Confirmar'

// tipo de publicação → desenho da biblioteca de arte (o emoji fica para o conteúdo)
const ARTE_DO_TIPO = { ficha: 'elmo', criatura: 'garra', sistema: 'tomo', arte: 'moldura' }

/**
 * Demo sem conta: rola de verdade (mesmo motor do site) e NÃO grava nada em
 * lugar nenhum — nem feed, nem banco.
 */
function DemoRolador() {
  const [notacao, setNotacao] = useState('1d20+3')
  const [resultado, setResultado] = useState(null)
  const [vez, setVez] = useState(0) // cada rolagem entra animada
  const [erro, setErro] = useState('')

  function rolar(n) {
    const bruto = (n || notacao).trim()
    if (!validarNotacao(bruto)) { setErro(`Notação inválida: ${bruto}`); return }
    setErro('')
    setNotacao(bruto)
    setResultado(rolarNotacao(bruto))
    setVez(v => v + 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={notacao} onChange={e => setNotacao(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') rolar() }}
          className="campo w-32 font-mono" aria-label="Notação do dado"
        />
        <Botao variante="primario" onClick={() => rolar()}><Icone nome="dado" tamanho={16} /> Rolar</Botao>
        {['1d20', '2d6+3', '4d6kh3', '1d100'].map(atalho => (
          <Botao key={atalho} variante="contorno" tamanho="sm" className="font-mono" onClick={() => rolar(atalho)}>{atalho}</Botao>
        ))}
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {resultado && (
        <div key={vez} className="entra-aba flex flex-wrap items-end gap-3">
          {resultado.dados.map((d, i) => (
            <Dice3D key={i} lados={d.lados} resultado={d.valor} rolando={false} descartado={d.descartado} skin="padrao" />
          ))}
          <p className="text-ink" aria-live="polite">
            <span className="text-ink-dim text-xs mr-1.5 uppercase tracking-wider">total</span>
            <span className="text-4xl font-bold text-dice-400 tabular-nums font-sora">{resultado.total}</span>
          </p>
        </div>
      )}
    </div>
  )
}

/** Resumo do arquivo escolhido: confirma que é o que a pessoa acha que é. */
function resumoDoArquivo(json) {
  if (json?.ficha) {
    const f = json.ficha
    return [f.nome_personagem, [f.raca, f.classe].filter(Boolean).join(' • '), f.nivel ? `nível ${f.nivel}` : null].filter(Boolean).join(' · ')
  }
  if (json?.sistema || Array.isArray(json?.atributos)) {
    const nome = json.sistema?.nome || json.nome || 'Sistema'
    const n = Array.isArray(json.atributos) ? json.atributos.length : 0
    return `${nome}${n ? ` · ${n} atributos` : ''}`
  }
  return null
}

/** Publicar: tipo, arquivo exportado (ou imagem da arte), título, descrição e etiquetas. */
function Publicar({ onPublicar, onFechar, meuId }) {
  const inputRef = useRef(null)
  const imagemRef = useRef(null)
  const [tipo, setTipo] = useState('criatura')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [etiquetas, setEtiquetas] = useState('')
  const [creditos, setCreditos] = useState('')
  const [imagem, setImagem] = useState('')
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [conteudo, setConteudo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function escolher(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const json = JSON.parse(await file.text())
      setConteudo(json)
      setNomeArquivo(file.name)
      if (!titulo) setTitulo(json?.ficha?.nome_personagem || json?.sistema?.nome || file.name.replace(/\.json$/i, ''))
      setErro('')
    } catch {
      setConteudo(null); setNomeArquivo('')
      setErro('Não consegui ler esse arquivo. Ele precisa ser o .json que o site exporta (ficha, criatura ou sistema).')
    }
  }

  // a arte sobe para o armazenamento do site: imagem de outro endereço é bloqueada
  async function escolherImagem(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Escolha um arquivo de imagem.'); return }
    setEnviandoImagem(true); setErro('')
    try {
      const reduzida = await redimensionarImagem(file, 1600)
      const caminho = `${meuId}/comunidade/${crypto.randomUUID()}.jpg`
      const { error } = await supabase.storage.from('fichas-imagens').upload(caminho, reduzida, { contentType: 'image/jpeg' })
      if (error) throw new Error(error.message)
      setImagem(supabase.storage.from('fichas-imagens').getPublicUrl(caminho).data.publicUrl)
      if (!titulo) setTitulo(file.name.replace(/\.[a-z0-9]+$/i, ''))
    } catch (err) { setErro(err.message || 'Não foi possível enviar a imagem.') }
    finally { setEnviandoImagem(false) }
  }

  async function enviar() {
    setOcupado(true); setErro('')
    try {
      await onPublicar({ tipo, titulo, descricao, etiquetas, conteudo, imagem_url: imagem, creditos })
      onFechar(true)
    } catch (e) { setErro(e.message); setOcupado(false) }
  }

  const resumo = conteudo ? resumoDoArquivo(conteudo) : null

  return (
    <Modal
      onFechar={() => onFechar(false)} bloqueado={ocupado} tamanho="lg"
      titulo="Publicar na comunidade" subtitulo="O que vai é a cópia exportada. Nada da sua mesa fica visível."
      rodape={
        <>
          <FecharModal disabled={ocupado} />
          <Botao variante="primario" onClick={enviar} disabled={ocupado || enviandoImagem}>{ocupado ? 'Publicando…' : 'Publicar'}</Botao>
        </>
      }
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="rotulo">O que você vai publicar?</legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIPOS_PUBLICACAO.map(t => (
              <button
                key={t.id} type="button" onClick={() => { setTipo(t.id); setErro('') }} aria-pressed={tipo === t.id}
                className={`cartao flex flex-col items-center gap-1.5 rounded-xl border p-3 ${tipo === t.id ? 'selecionado' : 'border-border bg-void/40'}`}
              >
                <Ilustra nome={ARTE_DO_TIPO[t.id]} tamanho={32} />
                <span className="text-sm text-ink font-medium">{t.nome}</span>
              </button>
            ))}
          </div>
        </fieldset>

        {tipo === 'arte' ? (
          <div className="space-y-3">
            <input ref={imagemRef} type="file" accept="image/*" onChange={escolherImagem} className="hidden" />
            {imagem ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imagem} alt="Prévia da arte" className="w-full max-h-64 object-cover" />
                <Botao variante="secundario" tamanho="sm" className="absolute top-2 right-2" onClick={() => imagemRef.current?.click()}>Trocar imagem</Botao>
              </div>
            ) : (
              <button
                type="button" onClick={() => imagemRef.current?.click()} disabled={enviandoImagem}
                className="w-full rounded-xl border border-dashed border-border hover:border-accent-500 p-6 text-center transition-colors duration-rapida"
              >
                <Icone nome="enviar" tamanho={24} className="mx-auto text-accent-300" />
                <span className="block text-ink text-sm mt-2">{enviandoImagem ? 'Enviando…' : 'Escolher a imagem'}</span>
                <span className="block text-ink-dim text-xs mt-0.5">Fica guardada no site (até 1600 px).</span>
              </button>
            )}
            <label className="block"><span className="rotulo">Crédito do artista</span>
              <input value={creditos} onChange={e => setCreditos(e.target.value)} placeholder="Quem fez a arte" className="campo w-full" />
            </label>
          </div>
        ) : (
          <div className="space-y-2">
            <input ref={inputRef} type="file" accept="application/json,.json" onChange={escolher} className="hidden" />
            <button
              type="button" onClick={() => inputRef.current?.click()}
              className={`w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors duration-rapida ${conteudo ? 'border-ok/50 bg-ok/5' : 'border-dashed border-border hover:border-accent-500'}`}
            >
              <Icone nome={conteudo ? 'ok' : 'enviar'} tamanho={22} className={conteudo ? 'text-ok' : 'text-accent-300'} />
              <span className="min-w-0">
                <span className="block text-ink text-sm font-medium truncate">{conteudo ? `Arquivo reconhecido: ${nomeArquivo}` : 'Escolher o arquivo exportado (.json)'}</span>
                <span className="block text-ink-dim text-xs mt-0.5 truncate">
                  {resumo || 'Exporte pela ficha, pelo bestiário ou em Sistema → Exportar.'}
                </span>
              </span>
            </button>
          </div>
        )}

        <label className="block"><span className="rotulo">Título</span>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex.: Sistema de Magitech — Thauriun" className="campo w-full" />
        </label>
        <label className="block"><span className="rotulo">Descrição <span className="text-ink-dim font-normal">(opcional)</span></span>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} placeholder="Para que serve, como usar, de onde veio…" className="campo w-full resize-y" />
        </label>
        <label className="block"><span className="rotulo">Etiquetas</span>
          <input value={etiquetas} onChange={e => setEtiquetas(e.target.value)} placeholder="Separadas por vírgula: fantasia, baixo nível" className="campo w-full" />
        </label>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      </div>
    </Modal>
  )
}

/** Escolher a mesa que recebe a publicação. */
function LevarParaMesa({ p, mesas, onLevar, onFechar }) {
  const [mesaId, setMesaId] = useState(mesas[0]?.id || '')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  async function levar() {
    setOcupado(true); setErro('')
    try { await onLevar(mesas.find(m => m.id === mesaId)) }
    catch (e) { setErro(e.message); setOcupado(false) }
  }

  return (
    <Modal
      onFechar={onFechar} bloqueado={ocupado} tamanho="sm"
      titulo={`Levar “${p.titulo}”`} subtitulo={p.tipo === 'sistema' ? 'O sistema é importado na mesa que você escolher.' : 'Vira uma ficha sua na mesa que você escolher.'}
      rodape={
        <>
          <FecharModal disabled={ocupado} />
          <Botao variante="primario" onClick={levar} disabled={ocupado || !mesaId}>{ocupado ? 'Levando…' : 'Levar para a mesa'}</Botao>
        </>
      }
    >
      <fieldset className="space-y-2">
        <legend className="sr-only">Mesa</legend>
        {mesas.map(m => (
          <label key={m.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors duration-rapida ${mesaId === m.id ? 'selecionado' : 'border-border hover:border-accent-700'}`}>
            <input type="radio" name="mesa-destino" checked={mesaId === m.id} onChange={() => setMesaId(m.id)} className="accent-purple-500" />
            <span className="text-ink text-sm font-medium truncate">{m.nome}</span>
          </label>
        ))}
      </fieldset>
      {erro && <p className="aviso-erro mt-3" role="alert">{erro}</p>}
    </Modal>
  )
}

/** Um cartão do feed. `logado` decide o que dá para fazer. */
function Cartao({ p, logado, curtida, onCurtir, onObter, onDenunciar, onApagar, souAutor, onEtiqueta }) {
  const [ocupado, setOcupado] = useState('')
  const toast = useToast()

  async function acao(nome, fn, ok) {
    setOcupado(nome)
    try { await fn(); if (ok) toast.ok(ok) } catch (e) { toast.erro('Não deu certo', { detalhe: e.message }) } finally { setOcupado('') }
  }

  return (
    <article className="cartao group flex flex-col rounded-2xl border border-border bg-raised/80 overflow-hidden shadow-nivel-1">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Avatar nome={p.autor} tamanho="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-ink text-sm font-medium truncate">{p.autor}</p>
          <p className="text-ink-dim text-xs">{quandoFoi(p.created_at)}{p.oculta ? ' · oculta por denúncias' : ''}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-dim border border-border rounded-full px-2 py-0.5">
          <Ilustra nome={ARTE_DO_TIPO[p.tipo] || 'bau'} tamanho={14} /> {nomeDoTipo(p.tipo)}
        </span>
      </header>

      {p.imagem_url && (
        <div className="mt-3 mx-4 rounded-xl overflow-hidden border border-border/60">
          <img src={p.imagem_url} alt="" loading="lazy" className="w-full h-44 object-cover transition-transform duration-lenta ease-padrao group-hover:scale-[1.02] motion-reduce:transform-none" />
        </div>
      )}

      <div className="px-4 pt-3 pb-4 space-y-2 flex-1">
        <h3 className="font-sora text-ink text-lg font-semibold leading-snug">{p.titulo}</h3>
        {p.creditos && <p className="text-ink-dim text-xs">Arte de {p.creditos}</p>}
        {p.descricao && <p className="text-ink-dim text-sm line-clamp-3">{p.descricao}</p>}
        {(p.etiquetas || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {p.etiquetas.map(e => (
              <button key={e} type="button" onClick={() => onEtiqueta(e)} className="text-xs text-accent-300 hover:text-ink transition-colors duration-rapida">#{e}</button>
            ))}
          </div>
        )}
      </div>

      <footer className="flex items-center gap-1 px-2 py-2 border-t border-border/60">
        <button
          type="button" onClick={() => logado && acao('curtir', () => onCurtir(p.id))} disabled={!logado || ocupado === 'curtir'}
          aria-pressed={curtida} aria-label={`${curtida ? 'Descurtir' : 'Curtir'} · ${textoCurtidas(p.curtidas)}`}
          data-dica={logado ? (curtida ? 'Descurtir' : 'Curtir') : 'Entre para curtir'} data-dica-lado="dir"
          className={`botao-icone px-2.5 gap-1.5 ${curtida ? '!text-harm' : ''} ${logado ? '' : 'opacity-60'}`}
        >
          <Icone nome="coracao" tamanho={18} className={curtida ? 'fill-current' : ''} />
          <span className="text-sm tabular-nums">{p.curtidas || 0}</span>
        </button>
        {p.tipo !== 'arte' && (
          <button
            type="button" onClick={() => logado && onObter(p)} disabled={!logado}
            data-dica={logado ? 'Trazer para uma mesa sua' : 'Entre para levar para a sua mesa'} data-dica-lado="dir"
            className={`botao-icone px-2.5 gap-1.5 ${logado ? '' : 'opacity-60'}`}
          ><Icone nome="baixar" tamanho={18} /><span className="text-sm">Levar para a mesa</span></button>
        )}
        <span className="flex-1" />
        {logado && !souAutor && (
          <button type="button" onClick={() => onDenunciar(p)} aria-label="Denunciar" data-dica="Denunciar" className="botao-icone hover:!text-warn">
            <Icone nome="alerta" tamanho={18} />
          </button>
        )}
        {logado && souAutor && (
          <button type="button" onClick={() => onApagar(p)} disabled={ocupado === 'apagar'} aria-label="Apagar da comunidade" data-dica="Apagar" className="botao-icone hover:!text-harm">
            <Icone nome="lixeira" tamanho={18} />
          </button>
        )}
      </footer>
    </article>
  )
}

/**
 * Fase 36 → 52 — Comunidade como feed. Logado: publicar, curtir, levar para a
 * mesa e denunciar. Sem conta: a vitrine em leitura (pela função pública) e um
 * rolador que não grava nada.
 */
export default function ComunidadePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirmar, perguntar } = useConfirmar()
  const logado = !!session
  const participa = logado && !souConvidado(session) // F47: convidado só olha
  const { publicacoes, minhasCurtidas, meuId, indisponivel, carregando, publicar, curtir, denunciar, apagar } = useComunidade()
  const { mesas } = useMesas()
  const [vitrinePublica, setVitrinePublica] = useState(null)
  const [tipo, setTipo] = useState(null)
  const [etiqueta, setEtiqueta] = useState(null)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('recentes')
  const [publicando, setPublicando] = useState(false)
  const [levando, setLevando] = useState(null) // publicação a levar para uma mesa

  // Sem login: a vitrine vem da função pública (anônimo não lê a tabela)
  useEffect(() => {
    if (logado) return
    let vivo = true
    supabase.rpc('vitrine_publica', { p_limite: 48 }).then(({ data }) => { if (vivo) setVitrinePublica(data || []) })
    return () => { vivo = false }
  }, [logado])

  const lista = logado ? publicacoes : (vitrinePublica || [])
  const visiveis = useMemo(
    () => ordenarVitrine(filtrarVitrine(lista, { tipo, etiqueta, busca }), ordem),
    [lista, tipo, etiqueta, busca, ordem]
  )
  const etiquetas = useMemo(() => etiquetasPopulares(lista), [lista])
  const carregandoLista = logado ? carregando : vitrinePublica === null

  const minhasMesas = mesas.filter(m => !m.arquivada && (m.role === 'mestre' || m.role === 'co-mestre' || m.role === 'jogador'))

  function obter(p) {
    if (minhasMesas.length === 0) { toast.aviso('Você precisa de uma mesa', { detalhe: 'Crie ou entre numa mesa para levar isto para ela.' }); return }
    setLevando(p)
  }

  /** Traz a publicação para uma mesa: ficha/criatura pela F30, sistema pela RPC. */
  async function levarPara(p, mesa) {
    if (p.tipo === 'sistema') {
      await importarSistemaNaMesa(mesa.id, p.conteudo)
      setLevando(null)
      toast.ok(`Sistema importado em ${mesa.nome}`)
      return
    }
    const plano = await prepararImportacao(p.conteudo, mesa.id)
    const extras = p.tipo === 'criatura' ? { tipo_ficha: 'criatura', privada: true } : {}
    const novoId = await gravarImportacao(plano, { mesaId: mesa.id, donoId: meuId, extras })
    setLevando(null)
    toast.ok(`Trazido para ${mesa.nome}`, plano.avisos.length ? { detalhe: `${plano.avisos.length} coisa(s) não casaram com o sistema da mesa.` } : undefined)
    navigate(`/mesa/${mesa.id}/ficha/${novoId}`)
  }

  async function denunciarPublicacao(p) {
    const motivo = await perguntar({
      titulo: 'Denunciar publicação', mensagem: `Por que "${p.titulo}" não deveria estar aqui?`,
      rotulo: 'Motivo (opcional)', placeholder: 'Ex.: conteúdo ofensivo, cópia sem crédito…', confirmar: 'Denunciar',
    })
    if (motivo === null) return
    try { await denunciar(p.id, motivo); toast.ok('Denúncia registrada', { detalhe: 'Com 3 denúncias a publicação sai do ar até alguém revisar.' }) }
    catch (e) { toast.erro('Não foi possível denunciar', { detalhe: e.message }) }
  }

  async function apagarPublicacao(p) {
    const ok = await confirmar({ titulo: 'Apagar da comunidade?', mensagem: `"${p.titulo}" sai do ar para todo mundo.`, confirmar: 'Apagar', perigo: true })
    if (!ok) return
    try { await apagar(p.id); toast.ok('Publicação apagada') }
    catch (e) { toast.erro('Não foi possível apagar', { detalhe: e.message }) }
  }

  const chip = (ativo, conteudo, onClick, chave) => (
    <button
      key={chave} type="button" onClick={onClick} aria-pressed={ativo}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-sm transition-colors duration-rapida ${ativo ? 'selecionado text-ink font-medium' : 'border-border text-ink-dim hover:text-ink hover:border-accent-700'}`}
    >{conteudo}</button>
  )

  return (
    <div className="min-h-screen">
      <BarraTopo
        comunidade={false}
        acoes={participa && (
          <Botao variante="primario" onClick={() => setPublicando(true)} className="mr-1">
            <Icone nome="mais" tamanho={18} /><span className="max-sm:sr-only">Publicar</span>
          </Botao>
        )}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <section>
          <h1 className="font-sora text-3xl sm:text-4xl font-bold text-ink tracking-tight">Comunidade</h1>
          <p className="text-ink-dim mt-1.5">Fichas, criaturas, sistemas e artes compartilhados por quem joga.</p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <span className="sr-only">Buscar na comunidade</span>
              <Icone nome="busca" tamanho={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título, autor ou etiqueta" className="campo w-full !pl-10 !min-h-[44px]" />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-ink-dim text-sm shrink-0">Ordenar</span>
              <select value={ordem} onChange={e => setOrdem(e.target.value)} className="campo !min-h-[44px]">
                <option value="recentes">Mais recentes</option>
                <option value="curtidas">Mais curtidas</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Tipo">
            {chip(!tipo, 'Tudo', () => setTipo(null), '__tudo')}
            {TIPOS_PUBLICACAO.map(t => chip(tipo === t.id, <><Ilustra nome={ARTE_DO_TIPO[t.id]} tamanho={16} />{t.nome}{t.id === 'arte' ? 's' : 's'}</>, () => setTipo(tipo === t.id ? null : t.id), t.id))}
          </div>

          {etiquetas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 items-center text-sm">
              <span className="text-ink-dim">Etiquetas:</span>
              {etiqueta ? (
                <button onClick={() => setEtiqueta(null)} className="inline-flex items-center gap-1 text-ink font-medium">
                  #{etiqueta} <Icone nome="x" tamanho={14} className="text-ink-dim" />
                </button>
              ) : etiquetas.map(({ etiqueta: e, usos }) => (
                <button key={e} onClick={() => setEtiqueta(e)} className="text-accent-300 hover:text-ink transition-colors duration-rapida">
                  #{e} <span className="text-ink-dim text-xs">{usos}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {!logado && (
          <section className="rounded-2xl border border-border bg-raised/70 p-5 sm:p-6 space-y-4" aria-label="Experimente">
            <div>
              <h2 className="font-sora text-xl font-semibold text-ink">Experimente sem criar conta</h2>
              <p className="text-ink-dim text-sm mt-1">Este rolador é de verdade, o mesmo do site. Nada aqui é gravado. Para ter mesa, ficha, mapa e o resto, crie uma conta.</p>
            </div>
            <DemoRolador />
            <Botao variante="primario" onClick={() => navigate('/')}>Criar conta grátis</Botao>
          </section>
        )}

        {/* F51 — mesas procurando jogadores */}
        <MesasAbertas />

        {indisponivel ? (
          <p className="text-ink-dim text-sm italic">Comunidade ainda não ativada neste banco (sql/fase36_comunidade.sql).</p>
        ) : carregandoLista ? (
          <EsqueletoCartoes quantos={3} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" altura="h-56" />
        ) : visiveis.length === 0 ? (
          lista.length === 0 ? (
            <EstadoVazio arte="bau" titulo="Nada publicado ainda" descricao="Seja a primeira pessoa a compartilhar uma ficha, criatura, sistema ou arte.">
              {participa && <Botao variante="primario" onClick={() => setPublicando(true)}><Icone nome="mais" tamanho={18} /> Publicar</Botao>}
            </EstadoVazio>
          ) : (
            <EstadoVazio compacto arte="bau" titulo="Nada encontrado" descricao="Tente outra busca, outro tipo ou tire a etiqueta.">
              <Botao variante="contorno" onClick={() => { setBusca(''); setTipo(null); setEtiqueta(null) }}>Limpar filtros</Botao>
            </EstadoVazio>
          )
        ) : (
          <div key={`${tipo}-${etiqueta}-${ordem}`} className="entra-lista grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {visiveis.map((p, i) => (
              <div key={p.id} style={{ '--i': i }}>
                <Cartao
                  p={p} logado={participa}
                  curtida={minhasCurtidas.includes(p.id)}
                  souAutor={!!meuId && p.autor_id === meuId}
                  onCurtir={curtir} onObter={obter} onDenunciar={denunciarPublicacao} onApagar={apagarPublicacao}
                  onEtiqueta={setEtiqueta}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {publicando && (
        <Publicar
          meuId={meuId} onPublicar={publicar}
          onFechar={publicou => { setPublicando(false); if (publicou) toast.ok('Publicado na comunidade') }}
        />
      )}
      {levando && (
        <LevarParaMesa p={levando} mesas={minhasMesas} onLevar={mesa => levarPara(levando, mesa)} onFechar={() => setLevando(null)} />
      )}
    </div>
  )
}

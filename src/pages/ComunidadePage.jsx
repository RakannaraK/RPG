import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useComunidade } from '../hooks/useComunidade'
import { useMesas } from '../hooks/useMesa'
import Marca from '../components/marca/Marca'
import { supabase } from '../lib/supabase'
import {
  TIPOS_PUBLICACAO, etiquetasPopulares, filtrarVitrine, iconeDoTipo,
  nomeDoTipo, ordenarVitrine, textoCurtidas,
} from '../lib/comunidade'
import { gravarImportacao, prepararImportacao } from '../lib/fichaBanco'
import { importarSistemaNaMesa } from '../lib/importarSistema'
import Dice3D from '../components/dados/Dice3D'
import { rolarNotacao, validarNotacao } from '../lib/diceNotation'

const INP = 'px-3 py-2 rounded-lg bg-slate-900 border border-purple-800 text-white text-sm placeholder-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
const BTN = 'px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50'

/**
 * Demo sem conta: rola de verdade (mesmo motor do site) e NÃO grava nada em
 * lugar nenhum — nem feed, nem banco.
 */
function DemoRolador() {
  const [notacao, setNotacao] = useState('1d20+3')
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')

  function rolar(n) {
    const bruto = (n || notacao).trim()
    if (!validarNotacao(bruto)) { setErro(`Notação inválida: ${bruto}`); return }
    setErro('')
    setNotacao(bruto)
    setResultado(rolarNotacao(bruto))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={notacao} onChange={e => setNotacao(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') rolar() }}
          className={`${INP} w-32`} aria-label="Notação do dado"
        />
        <button type="button" onClick={() => rolar()} className={`${BTN} bg-purple-700 hover:bg-purple-600 text-white font-semibold`}>🎲 Rolar</button>
        {['1d20', '2d6+3', '4d6kh3', '1d100'].map(atalho => (
          <button key={atalho} type="button" onClick={() => rolar(atalho)} className={`${BTN} bg-slate-800 hover:bg-slate-700 text-purple-200 text-xs`}>{atalho}</button>
        ))}
      </div>
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
      {resultado && (
        <div className="flex flex-wrap items-end gap-3">
          {resultado.dados.map((d, i) => (
            <Dice3D key={i} lados={d.lados} resultado={d.valor} rolando={false} descartado={d.descartado} skin="padrao" />
          ))}
          <p className="text-white">
            <span className="text-purple-400 text-xs mr-1">total</span>
            <span className="text-3xl font-bold text-amber-300 tabular-nums">{resultado.total}</span>
          </p>
        </div>
      )}
    </div>
  )
}

/** Formulário de publicação: lê o arquivo exportado (ou o link da arte). */
function Publicar({ onPublicar, onFechar }) {
  const inputRef = useRef(null)
  const [tipo, setTipo] = useState('criatura')
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [etiquetas, setEtiquetas] = useState('')
  const [creditos, setCreditos] = useState('')
  const [imagem, setImagem] = useState('')
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
      setErro('Não consegui ler esse arquivo .json.')
    }
  }

  async function enviar() {
    setOcupado(true); setErro('')
    try {
      await onPublicar({ tipo, titulo, descricao, etiquetas, conteudo, imagem_url: imagem, creditos })
      onFechar()
    } catch (e) { setErro(e.message); setOcupado(false) }
  }

  return (
    <div className="rounded-xl border border-purple-700 bg-slate-900 p-4 space-y-3">
      <p className="text-white font-semibold">Publicar na comunidade</p>
      <div className="flex flex-wrap gap-1.5">
        {TIPOS_PUBLICACAO.map(t => (
          <button
            key={t.id} type="button" onClick={() => setTipo(t.id)}
            className={`${BTN} ${tipo === t.id ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300 hover:bg-slate-700'}`}
          >{t.icone} {t.nome}</button>
        ))}
      </div>

      {tipo === 'arte' ? (
        <>
          <input value={imagem} onChange={e => setImagem(e.target.value)} placeholder="Link da imagem (https://…)" className={`${INP} w-full`} />
          <input value={creditos} onChange={e => setCreditos(e.target.value)} placeholder="Crédito do artista (quem fez)" className={`${INP} w-full`} />
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={inputRef} type="file" accept="application/json,.json" onChange={escolher} className="hidden" />
          <button type="button" onClick={() => inputRef.current?.click()} className={`${BTN} bg-slate-700 hover:bg-slate-600 text-white`}>
            {nomeArquivo ? `✓ ${nomeArquivo}` : 'Escolher arquivo exportado (.json)'}
          </button>
          <span className="text-purple-500 text-xs">
            Exporte na ficha (⬇), no bestiário (⬇) ou em Sistema → Exportar.
          </span>
        </div>
      )}

      <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título" className={`${INP} w-full`} />
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2} placeholder="Descrição (opcional)" className={`${INP} w-full resize-y`} />
      <input value={etiquetas} onChange={e => setEtiquetas(e.target.value)} placeholder="Etiquetas separadas por vírgula (ex.: fantasia, baixo nível)" className={`${INP} w-full`} />

      {erro && <p className="text-red-400 text-xs">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onFechar} className={`${BTN} text-purple-300 hover:text-white`}>Cancelar</button>
        <button type="button" onClick={enviar} disabled={ocupado} className={`${BTN} bg-purple-700 hover:bg-purple-600 text-white font-semibold`}>
          {ocupado ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}

/** Um cartão da vitrine. `logado` decide o que dá para fazer. */
function Cartao({ p, logado, curtida, onCurtir, onObter, onDenunciar, onApagar, souAutor }) {
  const [ocupado, setOcupado] = useState('')
  const [msg, setMsg] = useState('')

  async function acao(nome, fn) {
    setOcupado(nome); setMsg('')
    try { const r = await fn(); if (r) setMsg(r) } catch (e) { setMsg(e.message) } finally { setOcupado('') }
  }

  return (
    <div className="rounded-xl border border-purple-800 bg-slate-800 overflow-hidden flex flex-col">
      {p.imagem_url && <img src={p.imagem_url} alt="" className="w-full h-40 object-cover border-b border-purple-900" />}
      <div className="p-3 space-y-1.5 flex-1">
        <p className="text-white font-semibold flex items-center gap-1.5">
          <span title={nomeDoTipo(p.tipo)}>{iconeDoTipo(p.tipo)}</span>
          <span className="truncate">{p.titulo}</span>
        </p>
        <p className="text-purple-500 text-xs">
          por {p.autor}{p.creditos ? ` · arte de ${p.creditos}` : ''}{p.oculta ? ' · oculta por denúncias' : ''}
        </p>
        {p.descricao && <p className="text-purple-300 text-xs line-clamp-3">{p.descricao}</p>}
        {(p.etiquetas || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {p.etiquetas.map(e => <span key={e} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900 border border-purple-900 text-purple-300">{e}</span>)}
          </div>
        )}
        {msg && <p className="text-amber-300 text-xs">{msg}</p>}
      </div>
      <div className="flex border-t border-purple-900/70 text-sm">
        <button
          type="button" onClick={() => logado && acao('curtir', () => onCurtir(p.id))} disabled={!logado || ocupado === 'curtir'}
          className={`flex-1 py-1.5 transition-colors ${curtida ? 'text-red-300' : 'text-purple-300'} ${logado ? 'hover:text-white hover:bg-purple-900/40' : 'opacity-60'}`}
          title={logado ? (curtida ? 'Descurtir' : 'Curtir') : 'Entre para curtir'}
        >{curtida ? '♥' : '♡'} <span title={textoCurtidas(p.curtidas)}>{p.curtidas || 0}</span></button>
        {p.tipo !== 'arte' && (
          <button
            type="button" onClick={() => logado && acao('obter', () => onObter(p))} disabled={!logado || ocupado === 'obter'}
            className={`flex-1 py-1.5 border-l border-purple-900/70 transition-colors ${logado ? 'text-purple-300 hover:text-white hover:bg-purple-900/40' : 'text-purple-300 opacity-60'}`}
            title={logado ? 'Trazer para a minha mesa' : 'Entre para obter'}
          >{ocupado === 'obter' ? '…' : '⬇ obter'}</button>
        )}
        {logado && !souAutor && (
          <button
            type="button"
            onClick={() => { const motivo = window.prompt('Por que está denunciando? (opcional)'); if (motivo !== null) acao('denunciar', async () => { await onDenunciar(p.id, motivo); return 'Denúncia registrada.' }) }}
            className="px-3 py-1.5 border-l border-purple-900/70 text-purple-400 hover:text-amber-300 transition-colors"
            title="Denunciar"
          >⚠</button>
        )}
        {logado && souAutor && (
          <button
            type="button"
            onClick={() => { if (window.confirm(`Apagar "${p.titulo}" da comunidade?`)) acao('apagar', () => onApagar(p.id)) }}
            className="px-3 py-1.5 border-l border-purple-900/70 text-red-500 hover:text-red-400 transition-colors"
            title="Apagar"
          >🗑</button>
        )}
      </div>
    </div>
  )
}

/**
 * Fase 36 — Comunidade. Logado: publicar, curtir, obter e denunciar. Sem conta:
 * a vitrine em leitura (pela função pública) e um rolador que não grava nada.
 */
export default function ComunidadePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const logado = !!session
  const { publicacoes, minhasCurtidas, meuId, indisponivel, carregando, publicar, curtir, denunciar, apagar } = useComunidade()
  const { mesas } = useMesas()
  const [vitrinePublica, setVitrinePublica] = useState(null)
  const [tipo, setTipo] = useState(null)
  const [etiqueta, setEtiqueta] = useState(null)
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('recentes')
  const [publicando, setPublicando] = useState(false)

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

  const minhasMesas = mesas.filter(m => !m.arquivada && (m.role === 'mestre' || m.role === 'co-mestre' || m.role === 'jogador'))

  /** Traz a publicação para uma mesa: ficha/criatura pela F30, sistema pela RPC. */
  async function obter(p) {
    if (minhasMesas.length === 0) throw new Error('Você precisa de uma mesa para obter isto.')
    const nomes = minhasMesas.map((m, i) => `${i + 1}. ${m.nome}`).join('\n')
    const escolha = window.prompt(`Para qual mesa?\n${nomes}\n\nDigite o número:`, '1')
    if (escolha === null) return ''
    const mesa = minhasMesas[Number(escolha) - 1]
    if (!mesa) throw new Error('Mesa não encontrada.')
    if (p.tipo === 'sistema') {
      await importarSistemaNaMesa(mesa.id, p.conteudo)
      return `Sistema importado em ${mesa.nome}.`
    }
    const plano = await prepararImportacao(p.conteudo, mesa.id)
    const extras = p.tipo === 'criatura' ? { tipo_ficha: 'criatura', privada: true } : {}
    const novoId = await gravarImportacao(plano, { mesaId: mesa.id, donoId: meuId, extras })
    const avisos = plano.avisos.length ? ` (${plano.avisos.length} coisa(s) não casaram com o sistema da mesa)` : ''
    navigate(`/mesa/${mesa.id}/ficha/${novoId}`)
    return `Trazido para ${mesa.nome}${avisos}.`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-slate-900 to-black">
      <header className="border-b border-purple-900 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate(logado ? '/dashboard' : '/')} className="text-purple-400 hover:text-white text-sm">← Voltar</button>
          <Marca tamanho="sm" className="hidden sm:flex" />
          <h1 className="text-white font-bold text-xl">Comunidade</h1>
          <p className="text-purple-400 text-sm">fichas, criaturas, sistemas e artes que a galera compartilha</p>
          {logado && (
            <button onClick={() => setPublicando(v => !v)} className={`${BTN} ml-auto bg-purple-700 hover:bg-purple-600 text-white`}>
              {publicando ? 'Fechar' : '+ Publicar'}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {!logado && (
          <div className="rounded-xl border border-purple-800 bg-slate-900/60 p-4 space-y-3">
            <p className="text-white font-semibold">Experimente sem criar conta</p>
            <p className="text-purple-400 text-sm">
              Este rolador é de verdade — o mesmo do site. Nada aqui é gravado. Para ter mesa, ficha, mapa e o resto, crie uma conta.
            </p>
            <DemoRolador />
            <button onClick={() => navigate('/')} className={`${BTN} bg-purple-700 hover:bg-purple-600 text-white`}>Criar conta grátis</button>
          </div>
        )}

        {publicando && <Publicar onPublicar={publicar} onFechar={() => setPublicando(false)} />}

        {indisponivel ? (
          <p className="text-purple-400 text-sm italic">Comunidade ainda não ativada neste banco (sql/fase36_comunidade.sql).</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título, autor ou etiqueta" className={`${INP} flex-1 min-w-[14rem]`} />
              <select value={ordem} onChange={e => setOrdem(e.target.value)} className={INP} aria-label="Ordem">
                <option value="recentes">mais recentes</option>
                <option value="curtidas">mais curtidas</option>
              </select>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setTipo(null)} className={`${BTN} ${!tipo ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300'}`}>tudo</button>
                {TIPOS_PUBLICACAO.map(t => (
                  <button key={t.id} onClick={() => setTipo(t.id)} className={`${BTN} ${tipo === t.id ? 'bg-purple-700 text-white' : 'bg-slate-800 text-purple-300 hover:bg-slate-700'}`}>
                    {t.icone} {t.nome}
                  </button>
                ))}
              </div>
            </div>

            {etiquetas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-purple-500 text-xs">etiquetas:</span>
                {etiqueta && <button onClick={() => setEtiqueta(null)} className="text-xs px-2 py-0.5 rounded-full bg-purple-700 text-white">{etiqueta} ✕</button>}
                {!etiqueta && etiquetas.map(({ etiqueta: e, usos }) => (
                  <button key={e} onClick={() => setEtiqueta(e)} className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-purple-900 text-purple-300 hover:text-white">
                    {e} <span className="text-purple-600">{usos}</span>
                  </button>
                ))}
              </div>
            )}

            {carregando && logado ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-800 rounded-xl animate-pulse border border-purple-900" />)}</div>
            ) : visiveis.length === 0 ? (
              <div className="text-center py-14 border border-dashed border-purple-800 rounded-2xl">
                <div className="text-4xl mb-3">🫙</div>
                <p className="text-purple-300 text-sm">{lista.length === 0 ? 'Ainda não tem nada publicado. Seja o primeiro!' : 'Nada encontrado com esse filtro.'}</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visiveis.map(p => (
                  <Cartao
                    key={p.id} p={p} logado={logado}
                    curtida={minhasCurtidas.includes(p.id)}
                    souAutor={!!meuId && p.autor_id === meuId}
                    onCurtir={curtir} onObter={obter} onDenunciar={denunciar} onApagar={apagar}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

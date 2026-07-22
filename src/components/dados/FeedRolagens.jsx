import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePreferencias } from '../../context/PreferenciasContext'
import { playDiceNotify } from '../../lib/diceSound'
import { descreverResultado } from '../../lib/resolutionEngine'
import Dice3D from './Dice3D'

const COR_TXT = { verde: 'text-ok', ambar: 'text-dice-400', vermelho: 'text-harm', roxo: 'text-accent-300' }
const COR_CARD = { verde: 'border-ok/50', ambar: 'border-dice-500/50', vermelho: 'border-harm/50', roxo: 'border-border' }

// 23.3 — resultado nos MODOS de resolução (sucessos/roll_under/faixas)
function ResultadoModo({ rolagem, animando, ehMeu, minhaSkin }) {
  const { rotulo, notacao, resultado_estruturado, created_at } = rolagem
  const desc = descreverResultado(resultado_estruturado)
  const dados = rolagem.resultados?.dados || []
  const corTxt = COR_TXT[desc?.cor] || COR_TXT.roxo
  const critico = desc?.cor === 'ambar'

  return (
    <div className={`bg-raised/60 border rounded-xl p-3 space-y-2 ${COR_CARD[desc?.cor] || COR_CARD.roxo} ${critico ? 'crit-glow' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="text-accent-300 text-xs font-semibold shrink-0">{rolagem._nome}</span>
          {rotulo && <span className="text-ink text-sm font-medium">{rotulo}</span>}
          <span className="text-ink-dim font-mono text-xs shrink-0">{notacao}</span>
        </div>
        <span className="text-ink-dim text-xs shrink-0">{tempoRelativo(created_at)}</span>
      </div>

      {/* Dados: pontuados destacados (sucessos); especiais em cor distinta */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {dados.map((d, i) => {
          const base = ehMeu
            ? <Dice3D lados={d.lados} resultado={d.valor} rolando={animando} descartado={d.descartado} skin={minhaSkin} />
            : (
              <span className={`px-2 h-8 min-w-8 flex items-center justify-center rounded-lg border text-sm font-bold ${
                d.especial ? 'bg-harm/15 border-harm text-harm'
                  : d.sucesso ? 'bg-ok/15 border-ok text-ok'
                  : 'bg-void border-border text-ink-dim'
              }`}>{d.valor}</span>
            )
          return (
            <div key={i} className={`flex flex-col items-center gap-0.5 rounded-lg ${d.sucesso ? 'ring-1 ring-ok/70' : ''} ${d.especial ? 'ring-1 ring-harm/80' : ''}`}>
              {base}
              {d.especial && <span className="text-harm text-[8px] leading-none">esp.</span>}
            </div>
          )
        })}
      </div>

      {/* Resumo do modo */}
      {desc && (
        <p className={`text-sm font-bold ${corTxt}`}>{desc.texto}</p>
      )}
      {desc?.textoFaixa && (
        <p className="text-accent-300 text-xs italic">"{desc.textoFaixa}"</p>
      )}
      {desc?.marcacao && (
        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md border bg-harm/10 border-harm/60 text-harm">
          ⚡ {desc.marcacao.rotulo}{desc.marcacao.texto ? ` — ${desc.marcacao.texto}` : ''}
        </span>
      )}
    </div>
  )
}

function tempoRelativo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const seg = Math.floor(diff / 1000)
  if (seg < 10) return 'agora'
  if (seg < 60) return `${seg}s atrás`
  const min = Math.floor(seg / 60)
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function RolagemCard({ rolagem, animando, ehMeu, minhaSkin, nomeExibicao }) {
  const { autor_nome, rotulo, notacao, resultados, total, created_at } = rolagem
  const nome = nomeExibicao || autor_nome

  // 23.3 — modos de resolução (sucessos/roll_under/faixas) têm seu próprio card
  if (rolagem.modo && rolagem.modo !== 'soma' && rolagem.resultado_estruturado) {
    return <ResultadoModo rolagem={{ ...rolagem, _nome: nome }} animando={animando} ehMeu={ehMeu} minhaSkin={minhaSkin} />
  }
  const dados = resultados?.dados || []
  const mantidos = resultados?.mantidos || []
  const descartados = resultados?.descartados || []
  const modificador = resultados?.modificador || 0
  const percentual = resultados?.percentual // Fase 18.3
  const totalBase = resultados?.total_base
  const critico = !!rolagem.critico // F22.3 — crítico configurável

  return (
    <div className={`bg-raised/60 border border-border rounded-xl p-3 space-y-2 ${critico ? 'crit-glow' : ''}`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="text-accent-300 text-xs font-semibold shrink-0">{nome}</span>
          {rotulo && (
            <span className="text-ink text-sm font-medium">{rotulo}</span>
          )}
          <span className="text-ink-dim font-mono text-xs shrink-0">{notacao}</span>
        </div>
        <span className="text-ink-dim text-xs shrink-0">{tempoRelativo(created_at)}</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {ehMeu ? (
          // Minhas rolagens: dado 3D com a minha skin
          dados.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Dice3D
                lados={d.lados}
                resultado={d.valor}
                rolando={animando}
                descartado={d.descartado}
                skin={minhaSkin}
              />
              {d.descartado && <span className="text-harm text-[9px]">desc.</span>}
            </div>
          ))
        ) : (
          // Rolagens de outros: só o resultado (valores em texto)
          dados.map((d, i) => (
            <span
              key={i}
              className={`px-2 h-8 flex items-center justify-center rounded-lg border text-sm font-bold ${
                d.descartado
                  ? 'bg-void border-border text-ink-dim line-through opacity-50'
                  : 'bg-void border-border text-ink'
              }`}
              title={`d${d.lados}`}
            >
              {d.valor}
            </span>
          ))
        )}
        <div className="flex items-baseline gap-1.5 ml-1">
          <span className="text-ink-dim text-xs">Total:</span>
          <span className="text-2xl font-mono font-bold text-dice-400 leading-none">{total}</span>
        </div>
      </div>

      {(mantidos.length > 1 || modificador !== 0) && (
        <p className="text-ink-dim text-xs">
          ({mantidos.join(' + ')}
          {modificador > 0 && ` + ${modificador}`}
          {modificador < 0 && ` − ${Math.abs(modificador)}`})
        </p>
      )}

      {percentual != null && percentual !== 0 && (
        <p className="text-dice-400 text-xs">
          {totalBase} → {percentual > 0 ? '+' : ''}{percentual}% → <span className="font-bold">{total}</span>
        </p>
      )}

      {descartados.length > 0 && (
        <p className="text-harm text-xs">descartados: {descartados.join(', ')}</p>
      )}
    </div>
  )
}

export default function FeedRolagens({ mesaId, onNovaRolagem, desde = null, ate = null, aoVivo = true }) {
  const { session } = useAuth()
  const { preferencias } = usePreferencias()
  const [rolagens, setRolagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [animandoId, setAnimandoId] = useState(null)
  const [apelidos, setApelidos] = useState({}) // 16.6 — autor_id → apelido da mesa

  // Apelidos por autor (fallback para autor_nome gravado na rolagem)
  useEffect(() => {
    if (!mesaId) return
    let ativo = true
    supabase
      .from('membros_mesa')
      .select('usuario_id, apelido')
      .eq('mesa_id', mesaId)
      .then(({ data }) => {
        if (!ativo) return
        const m = {}
        for (const row of data || []) if (row.apelido) m[row.usuario_id] = row.apelido
        setApelidos(m)
      })
    return () => { ativo = false }
  }, [mesaId])

  useEffect(() => {
    if (!mesaId) return
    setLoading(true)

    let query = supabase
      .from('rolagens')
      .select('*')
      .eq('mesa_id', mesaId)
    // Fase 13.5 — janela de tempo (log de uma sessão encerrada)
    if (desde) query = query.gte('created_at', desde)
    if (ate) query = query.lte('created_at', ate)

    query
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        else setRolagens(data || [])
        setLoading(false)
      })

    // Log histórico (sessão encerrada): estático, sem tempo real
    if (!aoVivo) return

    const channel = supabase
      .channel(`feed-${mesaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rolagens',
          filter: `mesa_id=eq.${mesaId}`,
        },
        payload => {
          setRolagens(prev => [payload.new, ...prev.slice(0, 49)])
          if (payload.new.autor_id !== session?.user?.id) {
            setAnimandoId(payload.new.id)
            setTimeout(() => setAnimandoId(null), 1400)
            playDiceNotify()
            onNovaRolagem?.(payload.new)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [mesaId, session?.user?.id, desde, ate, aoVivo])

  if (loading) {
    return (
      <div className="py-6 text-center text-ink-dim text-sm">
        Carregando histórico...
      </div>
    )
  }

  if (erro) {
    return (
      <div className="py-4 px-3 bg-harm/10 border border-harm/50 rounded-xl text-harm text-sm">
        {erro}
      </div>
    )
  }

  if (rolagens.length === 0) {
    return (
      <div className="py-10 text-center border border-dashed border-border rounded-2xl">
        <div className="text-3xl mb-2">🎲</div>
        <p className="text-ink-dim text-sm">Nenhuma rolagem ainda.</p>
        <p className="text-ink-dim text-xs mt-1">
          As rolagens aparecem aqui em tempo real para todos na mesa.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-ink-dim text-xs">{rolagens.length} rolagem{rolagens.length > 1 ? 'ns' : ''}</span>
        <button
          type="button"
          onClick={() => setRolagens([])}
          className="text-xs text-ink-dim hover:text-ink transition-colors"
        >
          Limpar visualização
        </button>
      </div>
      <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
        {rolagens.map(r => (
          <RolagemCard
            key={r.id}
            rolagem={r}
            animando={animandoId === r.id}
            ehMeu={r.autor_id === session?.user?.id}
            minhaSkin={preferencias.dado_skin}
            nomeExibicao={apelidos[r.autor_id]}
          />
        ))}
      </div>
    </div>
  )
}

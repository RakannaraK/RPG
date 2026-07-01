import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePreferencias } from '../../context/PreferenciasContext'
import { playDiceNotify } from '../../lib/diceSound'
import Dice3D from './Dice3D'

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

function RolagemCard({ rolagem, animando, ehMeu, minhaSkin }) {
  const { autor_nome, rotulo, notacao, resultados, total, created_at } = rolagem
  const dados = resultados?.dados || []
  const mantidos = resultados?.mantidos || []
  const descartados = resultados?.descartados || []
  const modificador = resultados?.modificador || 0

  return (
    <div className="bg-slate-800/60 border border-purple-800/40 rounded-xl p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
          <span className="text-purple-300 text-xs font-semibold shrink-0">{autor_nome}</span>
          {rotulo && (
            <span className="text-white text-sm font-medium">{rotulo}</span>
          )}
          <span className="text-purple-600 font-mono text-xs shrink-0">{notacao}</span>
        </div>
        <span className="text-purple-700 text-xs shrink-0">{tempoRelativo(created_at)}</span>
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
              {d.descartado && <span className="text-red-500 text-[9px]">desc.</span>}
            </div>
          ))
        ) : (
          // Rolagens de outros: só o resultado (valores em texto)
          dados.map((d, i) => (
            <span
              key={i}
              className={`px-2 h-8 flex items-center justify-center rounded-lg border text-sm font-bold ${
                d.descartado
                  ? 'bg-slate-800 border-slate-700 text-slate-500 line-through opacity-50'
                  : 'bg-purple-950/60 border-purple-800 text-purple-100'
              }`}
              title={`d${d.lados}`}
            >
              {d.valor}
            </span>
          ))
        )}
        <div className="flex items-baseline gap-1.5 ml-1">
          <span className="text-purple-400 text-xs">Total:</span>
          <span className="text-2xl font-bold text-white leading-none">{total}</span>
        </div>
      </div>

      {(mantidos.length > 1 || modificador !== 0) && (
        <p className="text-purple-600 text-xs">
          ({mantidos.join(' + ')}
          {modificador > 0 && ` + ${modificador}`}
          {modificador < 0 && ` − ${Math.abs(modificador)}`})
        </p>
      )}

      {descartados.length > 0 && (
        <p className="text-red-700 text-xs">descartados: {descartados.join(', ')}</p>
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
            onNovaRolagem?.()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [mesaId, session?.user?.id, desde, ate, aoVivo])

  if (loading) {
    return (
      <div className="py-6 text-center text-purple-500 text-sm">
        Carregando histórico...
      </div>
    )
  }

  if (erro) {
    return (
      <div className="py-4 px-3 bg-red-950/50 border border-red-800/50 rounded-xl text-red-400 text-sm">
        {erro}
      </div>
    )
  }

  if (rolagens.length === 0) {
    return (
      <div className="py-10 text-center border border-dashed border-purple-800/50 rounded-2xl">
        <div className="text-3xl mb-2">🎲</div>
        <p className="text-purple-500 text-sm">Nenhuma rolagem ainda.</p>
        <p className="text-purple-600 text-xs mt-1">
          As rolagens aparecem aqui em tempo real para todos na mesa.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-purple-500 text-xs">{rolagens.length} rolagem{rolagens.length > 1 ? 'ns' : ''}</span>
        <button
          type="button"
          onClick={() => setRolagens([])}
          className="text-xs text-purple-600 hover:text-purple-400 transition-colors"
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
          />
        ))}
      </div>
    </div>
  )
}

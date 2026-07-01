import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function fmtData(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuracao(ini, fim) {
  if (!ini || !fim) return ''
  const ms = new Date(fim).getTime() - new Date(ini).getTime()
  if (ms <= 0) return ''
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Fase 13.5 — lista (colapsável) de sessões encerradas da mesa. Clicar abre a
 * SessaoPage daquela sessão (que mostra o log de rolagens do período).
 */
export default function SessoesHistorico({ mesaId }) {
  const navigate = useNavigate()
  const [sessoes, setSessoes] = useState([])
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (!mesaId) return
    let ativo = true
    supabase
      .from('sessoes')
      .select('*')
      .eq('mesa_id', mesaId)
      .eq('ativa', false)
      .order('iniciada_em', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (ativo) setSessoes(data || []) })
    return () => { ativo = false }
  }, [mesaId])

  if (sessoes.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setAberto(a => !a)}
        className="text-purple-400 text-xs hover:text-purple-200 transition-colors"
      >
        {aberto ? '▾' : '▸'} Sessões anteriores ({sessoes.length})
      </button>
      {aberto && (
        <ul className="mt-2 space-y-1.5">
          {sessoes.map(s => (
            <li key={s.id}>
              <button
                onClick={() => navigate(`/mesa/${mesaId}/sessao/${s.id}`)}
                className="w-full text-left flex items-center justify-between gap-2 bg-slate-800/60 border border-purple-900/50 hover:border-purple-700 rounded-lg px-3 py-2 transition-colors"
              >
                <span className="text-purple-200 text-sm truncate">{s.titulo || 'Sessão'}</span>
                <span className="text-purple-500 text-xs shrink-0">
                  {fmtData(s.iniciada_em)}
                  {fmtDuracao(s.iniciada_em, s.encerrada_em) && ` · ${fmtDuracao(s.iniciada_em, s.encerrada_em)}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

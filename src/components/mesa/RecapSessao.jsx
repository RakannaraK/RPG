import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { resumirSessao } from '../../lib/recapEngine'

const JANELAS = [
  { id: '7', label: 'Últimos 7 dias', dias: 7 },
  { id: '30', label: 'Últimos 30 dias', dias: 30 },
  { id: '90', label: 'Últimos 90 dias', dias: 90 },
  { id: 'tudo', label: 'Tudo', dias: null },
]

function dataBr(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

/**
 * Resumo do que aconteceu na mesa. Com sessões mensais, um mês depois ninguém
 * lembra — e o feed já guarda tudo. Aqui é só leitura: nenhuma escrita, nenhum
 * dado novo, nenhuma tabela nova.
 */
export default function RecapSessao({ mesaId }) {
  const [janela, setJanela] = useState('30')
  const [rolagens, setRolagens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!mesaId) return
    let ativo = true
    setLoading(true)
    setErro('')
    const cfg = JANELAS.find(j => j.id === janela)
    let q = supabase.from('rolagens').select('*').eq('mesa_id', mesaId)
    if (cfg?.dias) {
      const desde = new Date(Date.now() - cfg.dias * 24 * 60 * 60 * 1000).toISOString()
      q = q.gte('created_at', desde)
    }
    q.order('created_at', { ascending: false }).limit(500).then(({ data, error }) => {
      if (!ativo) return
      if (error) setErro(error.message)
      else setRolagens(data || [])
      setLoading(false)
    })
    return () => { ativo = false }
  }, [mesaId, janela])

  const recap = resumirSessao(rolagens)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-purple-200 font-medium text-sm">O que aconteceu</p>
          {recap.periodo && (
            <p className="text-accent-300 text-xs mt-0.5">
              de {dataBr(recap.periodo.de)} até {dataBr(recap.periodo.ate)}
            </p>
          )}
        </div>
        <select
          value={janela}
          onChange={e => setJanela(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-purple-950 border border-purple-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {JANELAS.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
        </select>
      </div>

      {loading && <p className="text-accent-300 text-sm py-6 text-center">Carregando resumo...</p>}
      {erro && <p className="text-red-400 text-sm">{erro}</p>}

      {!loading && !erro && recap.total === 0 && (
        <div className="py-10 text-center border border-dashed border-purple-800/50 rounded-2xl">
          <div className="text-3xl mb-2">📜</div>
          <p className="text-accent-300 text-sm">Nada registrado nesse período.</p>
        </div>
      )}

      {!loading && !erro && recap.total > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-800 border border-purple-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-white font-mono">{recap.total}</p>
              <p className="text-purple-400 text-xs">registros</p>
            </div>
            <div className="bg-slate-800 border border-purple-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-white font-mono">{recap.comDados}</p>
              <p className="text-purple-400 text-xs">rolagens</p>
            </div>
            <div className="bg-slate-800 border border-purple-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-amber-400 font-mono">{recap.criticos.length}</p>
              <p className="text-purple-400 text-xs">críticos</p>
            </div>
            <div className="bg-slate-800 border border-purple-800 rounded-xl p-3">
              <p className="text-2xl font-bold text-white font-mono">{recap.participantes.length}</p>
              <p className="text-purple-400 text-xs">participantes</p>
            </div>
          </div>

          {recap.participantes.length > 0 && (
            <div>
              <p className="text-purple-300 text-sm font-medium mb-2">Quem jogou</p>
              <div className="flex flex-wrap gap-2">
                {recap.participantes.map(p => (
                  <span key={p.nome} className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-purple-800 text-purple-200">
                    {p.nome} · {p.total}
                    {p.criticos > 0 && <span className="text-amber-400"> · {p.criticos}🎯</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recap.maiores.length > 0 && (
            <div>
              <p className="text-purple-300 text-sm font-medium mb-2">Maiores rolagens</p>
              <div className="space-y-1">
                {recap.maiores.map(r => (
                  <div key={r.id} className="flex items-baseline gap-2 text-sm bg-slate-800/60 border border-purple-900/50 rounded-lg px-3 py-1.5">
                    <span className="text-amber-400 font-mono font-bold">{r.total}</span>
                    <span className="text-purple-300 text-xs">{r.autor_nome}</span>
                    <span className="text-white text-xs truncate">{r.rotulo || r.notacao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recap.eventos.length > 0 && (
            <div>
              <p className="text-purple-300 text-sm font-medium mb-2">
                Acontecimentos ({recap.eventos.length})
              </p>
              <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {recap.eventos.slice().reverse().map(e => (
                  <div key={e.id} className="flex items-baseline gap-2 text-xs bg-slate-800/40 border border-purple-900/40 rounded-lg px-3 py-1.5">
                    <span className="text-accent-300 shrink-0">{dataBr(e.created_at)}</span>
                    <span className="text-purple-200">{e.rotulo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

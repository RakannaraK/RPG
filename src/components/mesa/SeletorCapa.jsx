import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Ilustra from '../arte/Ilustra'
import { CAPAS } from '../../lib/capas'

/**
 * Fase 37.4 — o dono escolhe a capa da mesa. Grava só o id em `mesas.capa`
 * (a política de UPDATE de mesas já existe; nada de RLS novo aqui).
 */
export default function SeletorCapa({ mesaId, capaAtual, onTrocou }) {
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function escolher(id) {
    const valor = id === capaAtual ? null : id // clicar de novo tira a capa
    setSalvando(true)
    setErro('')
    const { error } = await supabase.from('mesas').update({ capa: valor }).eq('id', mesaId)
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar a capa.'); return }
    onTrocou?.(valor)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-purple-200">Capa da mesa</p>
      <p className="text-xs text-purple-400">
        Aparece no topo da mesa e no cartão do painel. Clicar na escolhida de novo tira a capa.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        {CAPAS.map(c => {
          const ativa = c.id === capaAtual
          return (
            <button
              key={c.id} type="button" onClick={() => escolher(c.id)} disabled={salvando}
              title={c.nome}
              className={`flex flex-col items-center gap-1 w-[84px] py-2 rounded-xl border text-[11px] transition-colors disabled:opacity-50 ${
                ativa ? 'border-purple-400 bg-purple-900/40 text-white' : 'border-purple-800 text-purple-300 hover:border-purple-600'
              }`}
            >
              <Ilustra nome={c.arte} tamanho={30} style={{ color: ativa ? 'var(--dice-400)' : 'var(--accent-400)' }} />
              {c.nome}
            </button>
          )
        })}
      </div>
      {erro && <p className="text-red-400 text-xs">{erro}</p>}
    </div>
  )
}

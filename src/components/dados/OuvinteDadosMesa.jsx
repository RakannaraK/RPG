import { useEffect, useRef, useState, useId } from 'react'
import { useMatch } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarSomDado } from '../../lib/diceSounds'
import { enfileirarLancamento, lancamentoDeRolagem } from '../../lib/bandejaDados'
import BandejaDados, { bandejaSuportada } from './BandejaDados'

/**
 * Fase 27.2 — em qualquer página de uma mesa (/mesa/:id/...), toda rolagem com
 * dados cai na bandeja de quem está ali, na skin de quem rolou.
 *
 * Montado UMA vez no App (fora da transição de página). Um canal por mesa;
 * trocar de página dentro da mesma mesa não reabre o canal.
 * Som: quem rolou já ouviu no clique; os demais ouvem quando o dado cai.
 */
export default function OuvinteDadosMesa() {
  // Nome de canal único por instância: com o mesmo nome o supabase-js devolve o
  // canal já existente e o segundo `.on()` estoura (F34: Escudo + banner na mesma tela).
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const mesaId = useMatch('/mesa/:id/*')?.params.id
  const { session } = useAuth()
  const { preferencias } = usePreferencias()
  const preferenciasRef = useRef(preferencias)
  const [lancamentos, setLancamentos] = useState([])
  const meuId = session?.user?.id

  useEffect(() => { preferenciasRef.current = preferencias }, [preferencias])

  useEffect(() => {
    if (!mesaId || !meuId || !bandejaSuportada) return
    const canal = supabase
      .channel(`bandeja-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolagens', filter: `mesa_id=eq.${mesaId}` }, ({ new: r }) => {
        const p = preferenciasRef.current
        const lancamento = lancamentoDeRolagem(r, { meuId, preferencia: p.dados_mesa })
        if (!lancamento) return
        if (r.autor_id !== meuId) tocarSomDado(lancamento.skin, { ativo: p.som_ativo, volume: p.som_volume, numDados: lancamento.dados.length })
        setLancamentos(fila => enfileirarLancamento(fila, lancamento))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
      setLancamentos([])
    }
  }, [mesaId, meuId])

  return <BandejaDados lancamentos={lancamentos} onTerminou={id => setLancamentos(fila => fila.filter(l => l.id !== id))} />
}

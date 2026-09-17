import { useEffect, useRef, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { usePreferencias } from '../../context/PreferenciasContext'
import { tocarSomDado } from '../../lib/diceSounds'
import { deveMostrar, enfileirarLancamento, separarExcedente } from '../../lib/bandejaDados'
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
      .channel(`bandeja-${mesaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolagens', filter: `mesa_id=eq.${mesaId}` }, ({ new: r }) => {
        const p = preferenciasRef.current
        const minha = r.autor_id === meuId
        if (!deveMostrar(p.dados_mesa, minha)) return
        const { rolam, excedente } = separarExcedente(r.resultados?.dados)
        if (!rolam.length) return // evento sem dados (cura fixa, XP, avisos)
        const skin = r.resultados?.skin || 'padrao'
        if (!minha) tocarSomDado(skin, { ativo: p.som_ativo, volume: p.som_volume, numDados: rolam.length })
        setLancamentos(fila => enfileirarLancamento(fila, { id: r.id, dados: rolam, excedente, skin, autor: r.autor_nome }))
      })
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
      setLancamentos([])
    }
  }, [mesaId, meuId])

  return <BandejaDados lancamentos={lancamentos} onTerminou={id => setLancamentos(fila => fila.filter(l => l.id !== id))} />
}

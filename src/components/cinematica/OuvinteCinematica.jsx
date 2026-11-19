import { useEffect, useState } from 'react'
import { useMatch } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useCinematicaAoVivo, exibirQuadro, encerrarExibicao } from '../../hooks/useCinematicas'
import { useToast } from '../ui/Toast'
import CinematicaAoVivo from './CinematicaAoVivo'

/**
 * Fase 64 — em qualquer página de uma mesa, mostra a cinemática em exibição.
 * Montado uma vez no App. Quem consegue ler a cinemática (só o gestor, pela RLS)
 * recebe os controles; os demais só podem fechar a cena para si.
 */
export default function OuvinteCinematica() {
  const mesaId = useMatch('/mesa/:id/*')?.params.id
  const { session } = useAuth()
  if (!mesaId || !session?.user?.id) return null
  return <CenaDaMesa key={mesaId} mesaId={mesaId} />
}

function CenaDaMesa({ mesaId }) {
  const { aoVivo } = useCinematicaAoVivo(mesaId)
  const toast = useToast()
  const [fechada, setFechada] = useState(null) // id da cinemática que eu fechei
  const [cinematica, setCinematica] = useState(null) // só chega para o gestor
  const cinId = aoVivo?.cinematicaId

  // ponytail: a cena fechada só reabre depois de um "encerrar" (quadro nulo); o painel do mestre encerra antes de reexibir
  if (!aoVivo && fechada !== null) setFechada(null)

  useEffect(() => {
    if (!cinId) return
    let vivo = true
    supabase.from('cinematicas').select('id, quadros').eq('id', cinId).maybeSingle()
      .then(({ data }) => { if (vivo) setCinematica(data || null) })
    return () => { vivo = false }
  }, [cinId])

  if (!aoVivo || fechada === (cinId || 'sem-id')) return null

  const gestor = cinematica && cinematica.id === cinId
  const ir = async novo => {
    try { await exibirQuadro(mesaId, cinematica, novo) } catch (e) { toast.erro(e.message) }
  }
  const controles = gestor ? {
    onAnterior: () => ir(aoVivo.indice - 1),
    onProximo: () => ir(aoVivo.indice + 1),
    onEncerrar: () => encerrarExibicao(mesaId).catch(e => toast.erro(e.message)),
  } : null

  return <CinematicaAoVivo aoVivo={aoVivo} controles={controles} onFechar={() => setFechada(cinId || 'sem-id')} />
}

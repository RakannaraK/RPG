import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const VIDA_MS = 3000
const MAX_SIMULTANEOS = 8

/**
 * Fase 59 — efeitos de ação (só broadcast, nada gravado).
 * Tópico FIXO `vfx-${mesaId}` (páginas diferentes precisam se ouvir): monte UMA vez por página.
 * O que chega é não confiável: aqui só se guarda o que tem cara de objeto; `resolverVfx` normaliza.
 */
export function useVfxMapa(mesaId) {
  const [eventos, setEventos] = useState([]) // { id, evento, em }
  const canalRef = useRef(null)

  const mostrar = useCallback(evento => {
    if (!evento || typeof evento !== 'object' || Array.isArray(evento)) return
    const id = crypto.randomUUID()
    // teto de simultâneos: o excedente é ignorado (protege contra enxurrada)
    setEventos(prev => (prev.length >= MAX_SIMULTANEOS ? prev : [...prev, { id, evento, em: Date.now() }]))
    setTimeout(() => setEventos(p => (p.some(e => e.id === id) ? p.filter(e => e.id !== id) : p)), VIDA_MS)
  }, [])

  useEffect(() => {
    if (!mesaId) return
    const canal = supabase
      .channel(`vfx-${mesaId}`)
      .on('broadcast', { event: 'vfx' }, ({ payload }) => mostrar(payload))
      .subscribe()
    canalRef.current = canal
    return () => {
      canalRef.current = null
      supabase.removeChannel(canal)
      setEventos([])
    }
  }, [mesaId, mostrar])

  const disparar = useCallback(evento => {
    mostrar(evento)
    canalRef.current?.send({ type: 'broadcast', event: 'vfx', payload: evento })
  }, [mostrar])

  return { eventos, disparar }
}

/** Para página que não mostra o mapa: manda por HTTP, sem assinar, e larga o canal. */
export async function enviarVfx(mesaId, evento) {
  const canal = supabase.channel(`vfx-${mesaId}`)
  try {
    // httpSend é o envio por HTTP explícito; o send() sem assinar cai nele, mas com aviso de descontinuação
    await canal.httpSend('vfx', evento)
  } finally {
    supabase.removeChannel(canal)
  }
}

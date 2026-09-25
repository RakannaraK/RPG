import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { efeitoParaTocar } from '../lib/trilha'

/**
 * Fase 43 — estado da trilha da mesa (uma linha em `som_mesa`) em tempo real.
 * `onEfeito(id)` é chamado quando o mestre dispara um efeito novo.
 * Sem o SQL (`sql/fase43_trilha.sql`), `indisponivel` fica true.
 */
export function useTrilha(mesaId, onEfeito) {
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [estado, setEstado] = useState(null)
  const [indisponivel, setIndisponivel] = useState(false)
  const estadoRef = useRef(null)
  const onEfeitoRef = useRef(onEfeito)
  useEffect(() => { onEfeitoRef.current = onEfeito })

  // instantes de efeito já tocados: dois efeitos seguidos chegam do banco fora
  // de ordem em relação ao otimista, e o primeiro não pode tocar duas vezes
  const tocadosRef = useRef(new Set())

  const aplicar = useCallback(novo => {
    const efeito = efeitoParaTocar(estadoRef.current, novo)
    estadoRef.current = novo
    setEstado(novo)
    const chave = Date.parse(novo?.efeito_em)
    if (efeito && !tocadosRef.current.has(chave)) {
      tocadosRef.current.add(chave)
      onEfeitoRef.current?.(efeito)
    }
  }, [])

  useEffect(() => {
    if (!mesaId) return
    let vivo = true
    supabase.from('som_mesa').select('*').eq('mesa_id', mesaId).maybeSingle().then(({ data, error }) => {
      if (!vivo) return
      if (error) { setIndisponivel(true); return }
      // o que já estava lá ao abrir a página não toca efeito (efeitoParaTocar vê que é velho)
      estadoRef.current = data
      setEstado(data)
    })
    const canal = supabase
      .channel(`trilha-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'som_mesa', filter: `mesa_id=eq.${mesaId}` },
        ({ new: novo }) => { if (novo?.mesa_id) aplicar(novo) })
      .subscribe()
    return () => { vivo = false; supabase.removeChannel(canal) }
  }, [mesaId, idCanal, aplicar])

  /** Só quem gere a mesa: grava parte do estado (a primeira vez cria a linha). */
  async function atualizar(parcial) {
    const otimista = { ...(estadoRef.current || { mesa_id: mesaId, tocando: false, posicao_s: 0, repetir: true }), ...parcial }
    aplicar(otimista) // o mestre ouve o efeito na hora, sem esperar a volta do banco
    const { data, error } = await supabase.from('som_mesa').upsert({ mesa_id: mesaId, ...parcial }).select().single()
    if (error) throw new Error(error.message)
    aplicar(data)
    return data
  }

  const disparar = efeito => atualizar({ efeito, efeito_em: new Date().toISOString() })

  return { estado, indisponivel, atualizar, disparar }
}

import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase'
import { useRolagem } from './useRolagem'
import { novaSemente } from '../lib/minigames/semente'
import { textoEncerramento, textoLancamento } from '../lib/minigames/desafios'

const LIMITE_DESAFIOS = 30
const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'

/**
 * Fase 28.5 — desafios da mesa + quais eu já joguei.
 * Criar/encerrar/cancelar: só gestor (o RLS garante). Lançar e encerrar
 * publicam no feed.
 */
export function useDesafios(mesaId, meuId) {
  const { registrarEvento } = useRolagem()
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '') // canal único por instância (ver useMinigames)
  const [desafios, setDesafios] = useState([])
  const [respondidos, setRespondidos] = useState([]) // ids de desafios que eu já joguei
  const [indisponivel, setIndisponivel] = useState(false)

  const carregar = useCallback(async () => {
    if (!mesaId || !meuId) return
    const [des, meus] = await Promise.all([
      supabase.from('desafios').select('*').eq('mesa_id', mesaId).order('created_at', { ascending: false }).limit(LIMITE_DESAFIOS),
      supabase.from('minigames_resultados').select('desafio_id').eq('mesa_id', mesaId).eq('usuario_id', meuId).not('desafio_id', 'is', null),
    ])
    setIndisponivel(tabelaAusente(des.error))
    setDesafios(des.data || [])
    setRespondidos((meus.data || []).map(r => r.desafio_id))
  }, [mesaId, meuId])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!mesaId || !meuId) return
    const upsert = row => setDesafios(prev => (prev.some(d => d.id === row.id) ? prev.map(d => (d.id === row.id ? row : d)) : [row, ...prev]))
    const canal = supabase
      .channel(`desafios-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'desafios', filter: `mesa_id=eq.${mesaId}` }, p => upsert(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'desafios', filter: `mesa_id=eq.${mesaId}` }, p => upsert(p.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'desafios' }, p => {
        setDesafios(prev => prev.filter(d => d.id !== p.old?.id))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'minigames_resultados', filter: `mesa_id=eq.${mesaId}` }, p => {
        if (p.new.usuario_id === meuId && p.new.desafio_id) setRespondidos(prev => [...new Set([...prev, p.new.desafio_id])])
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, meuId, idCanal])

  async function criar({ tipo, dificuldade, config, participantes, meta = null, motivo = null, nomeDe, sessaoId = null }) {
    if (!participantes?.length) throw new Error('Escolha pelo menos um participante.')
    const { data, error } = await supabase
      .from('desafios')
      .insert({ mesa_id: mesaId, tipo, dificuldade, config, semente: novaSemente(), participantes, meta, motivo: motivo?.trim() || null })
      .select()
      .single()
    if (error) throw new Error(error.code === '42501' ? 'Só o mestre ou co-mestre lança desafios.' : error.message)
    setDesafios(prev => [data, ...prev.filter(d => d.id !== data.id)])
    await registrarEvento({ mesaId, sessaoId, rotulo: textoLancamento(data, nomeDe), notacao: '', total: 0, dados: [] })
    return data
  }

  async function encerrar(desafio, situacao, nomeDe, sessaoId = null) {
    const { data, error } = await supabase
      .from('desafios')
      .update({ status: 'encerrado', encerrado_em: new Date().toISOString() })
      .eq('id', desafio.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    setDesafios(prev => prev.map(d => (d.id === data.id ? data : d)))
    await registrarEvento({ mesaId, sessaoId, rotulo: textoEncerramento(data, situacao, nomeDe), notacao: '', total: 0, dados: [] })
  }

  async function cancelar(desafio) {
    const { error } = await supabase.from('desafios').delete().eq('id', desafio.id)
    if (error) throw new Error(error.message)
    setDesafios(prev => prev.filter(d => d.id !== desafio.id))
  }

  const marcarRespondido = id => setRespondidos(prev => [...new Set([...prev, id])])

  return { desafios, respondidos, indisponivel, criar, encerrar, cancelar, marcarRespondido }
}

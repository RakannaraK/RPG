import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { chaveOcorrencia, proximaOcorrencia, textoQuando } from '../lib/agenda'

/**
 * Fase 40 — agenda da mesa: sessões marcadas no mundo real e quem vai.
 * Sem o SQL (`sql/fase40_agenda.sql`), `indisponivel` fica true e a tela some.
 */
export function useAgenda(mesaId) {
  // nome de canal único por instância: com o mesmo nome o supabase-js devolve o
  // canal já assinado e o segundo `.on()` quebra (lição da F34)
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { session } = useAuth()
  const meuId = session?.user?.id
  const [eventos, setEventos] = useState([])
  const [presencas, setPresencas] = useState([])
  const [indisponivel, setIndisponivel] = useState(false)
  const idsRef = useRef([])

  const recarregar = useCallback(async () => {
    if (!mesaId) return
    const { data, error } = await supabase.from('agenda_mesa').select('*').eq('mesa_id', mesaId).order('inicio')
    if (error) { setIndisponivel(true); return }
    setIndisponivel(false)
    setEventos(data || [])
    const ids = (data || []).map(e => e.id)
    idsRef.current = ids
    if (!ids.length) { setPresencas([]); return }
    const { data: ps } = await supabase.from('presencas_agenda').select('*').in('agenda_id', ids)
    setPresencas(ps || [])
  }, [mesaId])

  useEffect(() => {
    recarregar()
    if (!mesaId) return
    const canal = supabase
      .channel(`agenda-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_mesa', filter: `mesa_id=eq.${mesaId}` }, () => recarregar())
      // DELETE não aceita filtro; o que não é desta mesa é descartado no cliente
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presencas_agenda' }, ({ new: n, old: o }) => {
        const id = n?.agenda_id || o?.agenda_id
        if (!id || idsRef.current.includes(id)) recarregar()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal, recarregar])

  async function salvar(evento) {
    const linha = {
      titulo: evento.titulo?.trim() || null,
      inicio: new Date(evento.inicio).toISOString(),
      duracao_min: Number(evento.duracao_min) || 180,
      recorrencia: evento.recorrencia || 'nenhuma',
      ate: evento.recorrencia !== 'nenhuma' && evento.ate ? evento.ate : null,
    }
    const { data, error } = evento.id
      ? await supabase.from('agenda_mesa').update(linha).eq('id', evento.id).select().single()
      : await supabase.from('agenda_mesa').insert({ ...linha, mesa_id: mesaId }).select().single()
    if (error) throw new Error(error.message)
    // avisa a mesa pelo sininho — best-effort, nunca bloqueia
    try {
      const prox = proximaOcorrencia(data)
      await supabase.rpc('notificar_mesa', {
        p_mesa_id: mesaId,
        p_tipo: 'agenda',
        p_titulo: evento.id ? 'Sessão remarcada' : 'Sessão marcada',
        p_corpo: prox ? `${data.titulo ? data.titulo + ' — ' : ''}${textoQuando(prox.inicio)}` : (data.titulo || ''),
        p_link: `/mesa/${mesaId}`,
      })
    } catch { /* notificação é opcional */ }
    await recarregar()
    return data
  }

  async function remover(id) {
    const { error } = await supabase.from('agenda_mesa').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await recarregar()
  }

  async function responder(agendaId, ocorrencia, resposta) {
    const linha = { agenda_id: agendaId, ocorrencia: chaveOcorrencia(ocorrencia), usuario_id: meuId, resposta }
    // otimista: a resposta aparece na hora
    setPresencas(ps => [
      ...ps.filter(p => !(p.agenda_id === agendaId && chaveOcorrencia(p.ocorrencia) === linha.ocorrencia && p.usuario_id === meuId)),
      linha,
    ])
    const { error } = await supabase.from('presencas_agenda').upsert(linha, { onConflict: 'agenda_id,ocorrencia,usuario_id' })
    if (error) { await recarregar(); throw new Error(error.message) }
  }

  return { eventos, presencas, indisponivel, salvar, remover, responder, meuId }
}

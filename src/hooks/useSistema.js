import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { mergeConfigLayout } from '../lib/sistemaDefaults'

export function useSistema(mesaId) {
  const { session } = useAuth()
  const [sistema, setSistema] = useState(null)
  const [atributos, setAtributos] = useState([])
  const [pericias, setPericias] = useState([])
  const [racas, setRacas] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSistema = useCallback(async () => {
    if (!session || !mesaId) return
    setLoading(true)
    setError(null)
    try {
      const { data: sistemaData } = await supabase
        .from('sistemas')
        .select('*')
        .eq('mesa_id', mesaId)
        .maybeSingle()

      if (sistemaData) {
        const [atributosResp, periciasResp, racasResp, classesResp] = await Promise.all([
          supabase.from('atributos').select('*').eq('sistema_id', sistemaData.id).order('ordem', { ascending: true }),
          supabase.from('pericias').select('*').eq('sistema_id', sistemaData.id).order('ordem', { ascending: true }),
          supabase.from('racas').select('*').eq('sistema_id', sistemaData.id).order('created_at'),
          supabase.from('classes').select('*').eq('sistema_id', sistemaData.id).order('created_at'),
        ])

        if (atributosResp.error) throw atributosResp.error

        // Busca modificadores de raças e classes
        const racaIds = (racasResp.data || []).map(r => r.id)
        const classeIds = (classesResp.data || []).map(c => c.id)
        let modsRacas = [], modsClasses = []
        if (racaIds.length > 0) {
          const { data } = await supabase.from('modificadores').select('*').in('raca_id', racaIds)
          modsRacas = data || []
        }
        if (classeIds.length > 0) {
          const { data } = await supabase.from('modificadores').select('*').in('classe_id', classeIds)
          modsClasses = data || []
        }

        setSistema({
          ...sistemaData,
          config_layout: mergeConfigLayout(sistemaData.config_layout),
        })
        setAtributos(atributosResp.data || [])
        setPericias(periciasResp.data || [])
        setRacas((racasResp.data || []).map(r => ({ ...r, modificadores: modsRacas.filter(m => m.raca_id === r.id) })))
        setClasses((classesResp.data || []).map(c => ({ ...c, modificadores: modsClasses.filter(m => m.classe_id === c.id) })))
      } else {
        setSistema(null)
        setAtributos([])
        setPericias([])
        setRacas([])
        setClasses([])
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar sistema.')
    } finally {
      setLoading(false)
    }
  }, [session, mesaId])

  useEffect(() => {
    fetchSistema()
  }, [fetchSistema])

  return { sistema, atributos, pericias, racas, classes, loading, error, refetch: fetchSistema }
}

export function useSaveSistema() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function saveSistema({
    mesaId,
    sistema,
    atributos,
    removedAtributoIds,
    configLayout,
    pericias = [],
    removedPericiaIds = [],
  }) {
    if (!session) throw new Error('Usuário não autenticado')
    setLoading(true)
    setError(null)

    try {
      let sistemaId = sistema.id

      if (!sistemaId) {
        // Cria novo sistema
        const { data: novo, error: createErr } = await supabase
          .from('sistemas')
          .insert({
            nome: sistema.nome,
            descricao: sistema.descricao,
            criador_id: session.user.id,
            mesa_id: mesaId,
            config_layout: configLayout,
          })
          .select()
          .single()

        if (createErr) throw createErr
        sistemaId = novo.id

        await supabase
          .from('mesas')
          .update({ sistema_id: sistemaId })
          .eq('id', mesaId)
      } else {
        // Atualiza sistema existente
        const { error: updateErr } = await supabase
          .from('sistemas')
          .update({
            nome: sistema.nome,
            descricao: sistema.descricao,
            config_layout: configLayout,
          })
          .eq('id', sistemaId)

        if (updateErr) throw updateErr
      }

      // Remove atributos deletados
      if (removedAtributoIds.length > 0) {
        const { error: delErr } = await supabase
          .from('atributos')
          .delete()
          .in('id', removedAtributoIds)
        if (delErr) throw delErr
      }

      // Salva cada atributo
      for (let i = 0; i < atributos.length; i++) {
        const attr = atributos[i]
        const payload = {
          nome: attr.nome,
          descricao: attr.descricao,
          ordem: i,
          regra_rolagem: attr.regra_rolagem,
          sistema_id: sistemaId,
        }

        if (!attr.id || attr.id.startsWith('temp_')) {
          const { error: insErr } = await supabase.from('atributos').insert(payload)
          if (insErr) throw insErr
        } else {
          const { error: updErr } = await supabase
            .from('atributos')
            .update(payload)
            .eq('id', attr.id)
          if (updErr) throw updErr
        }
      }

      // Remove perícias deletadas
      if (removedPericiaIds.length > 0) {
        await supabase.from('pericias').delete().in('id', removedPericiaIds)
      }

      // Salva cada perícia
      for (let i = 0; i < pericias.length; i++) {
        const p = pericias[i]
        if (!p.nome.trim()) continue

        const payload = {
          nome: p.nome.trim(),
          atributo_base_id: p.atributo_base_id || null,
          ordem: i,
          sistema_id: sistemaId,
        }

        if (!p.id || p.id.startsWith('temp_')) {
          const { error: insErr } = await supabase.from('pericias').insert(payload)
          if (insErr) throw insErr
        } else {
          const { error: updErr } = await supabase
            .from('pericias')
            .update(payload)
            .eq('id', p.id)
          if (updErr) throw updErr
        }
      }

      return sistemaId
    } catch (err) {
      const msg = err.message || 'Erro ao salvar sistema.'
      setError(msg)
      throw new Error(msg)
    } finally {
      setLoading(false)
    }
  }

  return { saveSistema, loading, error }
}

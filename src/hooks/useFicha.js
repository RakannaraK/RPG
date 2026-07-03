import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFichas(mesaId) {
  const [fichas, setFichas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFichas = useCallback(async () => {
    if (!mesaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('fichas')
        .select('id, nome_personagem, raca, classe, nivel, hp_atual, hp_maximo, imagem_url, created_at, dono:dono_id (id, username)')
        .eq('mesa_id', mesaId)
        .order('created_at', { ascending: true })
      if (err) throw err
      setFichas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar fichas.')
    } finally {
      setLoading(false)
    }
  }, [mesaId])

  useEffect(() => { fetchFichas() }, [fetchFichas])

  return { fichas, loading, error, refetch: fetchFichas }
}

export function useFicha(fichaId) {
  const [ficha, setFicha] = useState(null)
  const [valoresAtributos, setValoresAtributos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchFicha = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data: fichaData, error: fichaErr } = await supabase
        .from('fichas')
        .select('*')
        .eq('id', fichaId)
        .maybeSingle()
      if (fichaErr) throw fichaErr
      // RLS: quem não é membro da mesa não recebe a ficha
      if (!fichaData) throw new Error('Ficha não encontrada ou você não tem acesso a ela.')

      const { data: valoresData, error: valoresErr } = await supabase
        .from('valores_atributos')
        .select('id, valor, dados_rolados, updated_at, atributo:atributo_id (id, nome, descricao, ordem, regra_rolagem)')
        .eq('ficha_id', fichaId)
      if (valoresErr) throw valoresErr

      const sorted = (valoresData || []).sort(
        (a, b) => (a.atributo?.ordem || 0) - (b.atributo?.ordem || 0)
      )

      setFicha(fichaData)
      setValoresAtributos(sorted)
    } catch (err) {
      setError(err.message || 'Erro ao carregar ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchFicha() }, [fetchFicha])

  return { ficha, valoresAtributos, loading, error, refetch: fetchFicha }
}

export function useCreateFicha() {
  const [loading, setLoading] = useState(false)

  async function createFicha({ mesaId, sistemaId, donoId, infoBasica, valoresAtributos }) {
    setLoading(true)
    try {
      const { data: fichaData, error: fichaErr } = await supabase
        .from('fichas')
        .insert({
          mesa_id: mesaId,
          sistema_id: sistemaId || null,
          dono_id: donoId,
          nome_personagem: infoBasica.nome_personagem,
          raca: infoBasica.raca || null,
          classe: infoBasica.classe || null,
          raca_id: infoBasica.raca_id || null,
          classe_id: infoBasica.classe_id || null,
          nivel: infoBasica.nivel || 1,
          hp_atual: infoBasica.hp_maximo ? Number(infoBasica.hp_maximo) : null,
          hp_maximo: infoBasica.hp_maximo ? Number(infoBasica.hp_maximo) : null,
          notas: '',
        })
        .select()
        .single()
      if (fichaErr) throw fichaErr

      if (valoresAtributos.length > 0) {
        const { error: valoresErr } = await supabase
          .from('valores_atributos')
          .insert(
            valoresAtributos.map(v => ({
              ficha_id: fichaData.id,
              atributo_id: v.atributo_id,
              valor: v.valor,
              dados_rolados: v.dados_rolados || null,
            }))
          )
        if (valoresErr) throw valoresErr
      }

      return fichaData
    } finally {
      setLoading(false)
    }
  }

  return { createFicha, loading }
}

export function useUpdateFicha() {
  const [loading, setLoading] = useState(false)

  async function updateFicha(fichaId, updates) {
    setLoading(true)
    try {
      const { error: err } = await supabase
        .from('fichas')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', fichaId)
      if (err) throw err
    } finally {
      setLoading(false)
    }
  }

  async function updateValorAtributo(fichaId, atributoId, valor, dadosRolados) {
    setLoading(true)
    try {
      const { error: err } = await supabase
        .from('valores_atributos')
        .upsert(
          {
            ficha_id: fichaId,
            atributo_id: atributoId,
            valor,
            dados_rolados: dadosRolados || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'ficha_id,atributo_id' }
        )
      if (err) throw err
    } finally {
      setLoading(false)
    }
  }

  return { updateFicha, updateValorAtributo, loading }
}

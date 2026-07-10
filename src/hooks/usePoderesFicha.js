import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { atendeNivelMinimo } from '../lib/requisitos'

/**
 * Fase 20.4 — poderes conhecidos/preparados de uma ficha.
 * Enriquecimento em render (mesmo padrão de useHabilidadesFicha).
 *
 * `sincronizarPoderesClasses` espelha a auto-concessão da F10.4/F19.5: poderes
 * vinculados a uma classe entram sozinhos quando a ficha tem a classe E atinge
 * o nível mínimo; saem quando deixam de valer.
 */
export function usePoderesFicha(fichaId, poderesSistema = []) {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const poderesFicha = linhas
    .map(l => ({ ...l, poder: poderesSistema.find(p => p.id === l.poder_id) || null }))
    .filter(l => l.poder)

  const fetchAll = useCallback(async () => {
    if (!fichaId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('poderes_ficha')
        .select('*')
        .eq('ficha_id', fichaId)
      if (err) throw err
      setLinhas(data || [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar poderes da ficha.')
    } finally {
      setLoading(false)
    }
  }, [fichaId])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function aprenderPoder(poderId, origem = 'manual') {
    if (linhas.some(l => l.poder_id === poderId)) return null
    const { data, error: err } = await supabase
      .from('poderes_ficha')
      .insert({ ficha_id: fichaId, poder_id: poderId, conhecido: true, preparado: true, origem })
      .select()
      .single()
    if (err) throw err
    setLinhas(prev => [...prev, data])
    return data
  }

  async function esquecerPoder(linhaId) {
    const { error: err } = await supabase.from('poderes_ficha').delete().eq('id', linhaId)
    if (err) throw err
    setLinhas(prev => prev.filter(l => l.id !== linhaId))
  }

  async function definirPreparado(linhaId, preparado) {
    const anterior = linhas.find(l => l.id === linhaId)?.preparado
    setLinhas(prev => prev.map(l => (l.id === linhaId ? { ...l, preparado } : l)))
    try {
      const { error: err } = await supabase.from('poderes_ficha').update({ preparado }).eq('id', linhaId)
      if (err) throw err
    } catch (err) {
      setLinhas(prev => prev.map(l => (l.id === linhaId ? { ...l, preparado: anterior } : l)))
      throw new Error(err.message || 'Não foi possível mudar a preparação.')
    }
  }

  /**
   * Auto-concessão dos poderes de classe (F10.4), respeitando nivel_minimo (F19.5).
   * @param {string[]} classeIds — classes atuais da ficha
   * @param {object} contexto — { nivel, niveisClasse }
   */
  async function sincronizarPoderesClasses(classeIds, contexto = {}) {
    const idSet = new Set(classeIds || [])
    const rowsClasse = linhas.filter(l => l.origem === 'classe')
    const desejados = poderesSistema.filter(
      p => p.classe_id && idSet.has(p.classe_id) && atendeNivelMinimo(p, contexto)
    )
    const desejadosIds = new Set(desejados.map(p => p.id))
    const presentesIds = new Set(rowsClasse.map(l => l.poder_id))

    for (const l of rowsClasse) {
      if (!desejadosIds.has(l.poder_id)) await esquecerPoder(l.id)
    }
    for (const p of desejados) {
      if (!presentesIds.has(p.id)) await aprenderPoder(p.id, 'classe')
    }
  }

  return {
    poderesFicha, loading, error, refetch: fetchAll,
    aprenderPoder, esquecerPoder, definirPreparado, sincronizarPoderesClasses,
  }
}

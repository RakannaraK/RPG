import { useState, useEffect, useCallback, useId } from 'react'
import { supabase } from '../lib/supabase'
import { useRolagem } from './useRolagem'
import { useMembrosMesa } from './useMembrosMesa'
import { resumoResultado, rotuloFeed } from '../lib/minigames/resultado'

// ponytail: últimos 1000 resultados da mesa bastam para ranking/estatísticas; paginar se uma mesa jogar muito mais
const LIMITE_RESULTADOS = 1000

const tabelaAusente = e => e?.code === '42P01' || e?.code === 'PGRST205'

function mensagem(e) {
  if (e?.code === '42501') return 'Sem permissão para registrar (espectador, mesa arquivada ou desafio encerrado).'
  if (e?.code === '23505') return 'Você já jogou este desafio.'
  if (tabelaAusente(e)) return 'Ranking ainda não ativado neste banco (sql/fase28_minigames.sql).'
  return e?.message || 'Não foi possível registrar.'
}

/**
 * Grava um resultado (ranking/desafio) e publica no feed. Lança erro legível se
 * não valeu. Sem a tabela, partida avulsa ainda vai ao feed (e avisa).
 * Função solta para quem só precisa registrar (ex.: aviso de desafio no App).
 */
export async function registrarResultado({ mesaId, registrarEvento, tipo, dificuldade, resultado, fichaId = null, desafioId = null, sessaoId = null }) {
  const { data, error } = await supabase
    .from('minigames_resultados')
    .insert({ mesa_id: mesaId, ficha_id: fichaId, desafio_id: desafioId, tipo, dificuldade, pontos: resultado.pontos, detalhes: resultado })
    .select()
    .single()
  if (error && (desafioId || !tabelaAusente(error))) throw new Error(mensagem(error))
  await registrarEvento({
    mesaId, fichaId, sessaoId,
    rotulo: `${rotuloFeed(tipo, dificuldade)}${desafioId ? ' · desafio' : ''}`,
    notacao: resumoResultado(tipo, resultado),
    total: resultado.pontos,
    dados: [],
  })
  if (error) throw new Error(mensagem(error)) // tabela ausente: foi ao feed, avisa do ranking
  return data
}

/**
 * Fase 28.3 — resultados de minigames da mesa (ranking/estatísticas) e
 * membros com nome de exibição. `registrar` grava na tabela e publica no feed.
 *
 * Sem o SQL da fase: partida avulsa ainda vai ao feed; desafio falha com aviso.
 */
export function useMinigames(mesaId) {
  const { registrarEvento } = useRolagem()
  // Nome de canal único por instância: com o mesmo nome o Supabase devolve o
  // canal já existente (dois painéis na mesma página se atrapalhariam).
  const idCanal = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [resultados, setResultados] = useState([])
  const { membros, nomeDe } = useMembrosMesa(mesaId)
  const [indisponivel, setIndisponivel] = useState(false)

  const carregar = useCallback(async () => {
    if (!mesaId) return
    const res = await supabase.from('minigames_resultados').select('*').eq('mesa_id', mesaId)
      .order('created_at', { ascending: false }).limit(LIMITE_RESULTADOS)
    setIndisponivel(tabelaAusente(res.error))
    setResultados(res.error ? [] : res.data || [])
  }, [mesaId])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!mesaId) return
    const canal = supabase
      .channel(`minigames-${mesaId}-${idCanal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'minigames_resultados', filter: `mesa_id=eq.${mesaId}` }, p => {
        setResultados(prev => (prev.some(r => r.id === p.new.id) ? prev : [p.new, ...prev]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'minigames_resultados' }, p => {
        setResultados(prev => prev.filter(r => r.id !== p.old?.id))
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [mesaId, idCanal])

  async function registrar(params) {
    const linha = await registrarResultado({ mesaId, registrarEvento, ...params })
    if (linha) setResultados(prev => (prev.some(r => r.id === linha.id) ? prev : [linha, ...prev]))
  }

  return { resultados, membros, nomeDe, indisponivel, registrar, recarregar: carregar }
}

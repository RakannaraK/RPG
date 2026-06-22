import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { rolarNotacao } from '../lib/diceNotation'

/**
 * Hook central de rolagem.
 *
 * Uso:
 *   const { registrarRolagem, rolando, erro } = useRolagem()
 *   const resultado = await registrarRolagem({ mesaId, fichaId, rotulo, notacao })
 *
 * Fluxo:
 *   1. rolarNotacao() executa localmente e retorna imediatamente (para a animação)
 *   2. O resultado é inserido na tabela `rolagens` no Supabase
 *   3. O Realtime notifica os outros jogadores — o autor já tem o resultado
 */
export function useRolagem() {
  const { session } = useAuth()
  const [autorNome, setAutorNome] = useState('')
  const [rolando, setRolando] = useState(false)
  const [erro, setErro] = useState('')

  // Busca o username do perfil uma vez por sessão
  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('profiles')
      .select('username')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.username) setAutorNome(data.username)
      })
  }, [session?.user?.id])

  /**
   * @param {Object} params
   * @param {string}  params.mesaId   — ID da mesa (obrigatório)
   * @param {string}  [params.fichaId]  — ID da ficha, ou null para rolagem genérica
   * @param {string}  [params.rotulo]   — Ex: "Teste de Força", "Dano — Espada"
   * @param {string}  params.notacao  — Ex: "2d6+3", "1d20"
   * @returns {Promise<{ notacao, individuais, mantidos, descartados, modificador, total }>}
   */
  async function registrarRolagem({ mesaId, fichaId = null, rotulo = null, notacao }) {
    setErro('')
    setRolando(true)

    // 1. Rola localmente — sincronamente, resultado já disponível para a animação
    let resultado
    try {
      resultado = rolarNotacao(notacao)
    } catch (err) {
      setErro(err.message || 'Notação inválida.')
      setRolando(false)
      throw err
    }

    // 2. Persiste no Supabase (aguarda para garantir que o feed dos outros jogadores funcione)
    try {
      const { error } = await supabase.from('rolagens').insert({
        mesa_id: mesaId,
        autor_id: session.user.id,
        autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo || null,
        notacao: resultado.notacao,
        resultados: {
          dados: resultado.dados,
          individuais: resultado.individuais,
          mantidos: resultado.mantidos,
          descartados: resultado.descartados,
          modificador: resultado.modificador,
        },
        total: resultado.total,
      })
      if (error) throw error
    } catch (err) {
      // A rolagem local aconteceu — apenas exibe o erro sem quebrar a animação
      setErro(err.message || 'Erro ao salvar rolagem no servidor.')
    } finally {
      setRolando(false)
    }

    return resultado
  }

  /**
   * Registra um EVENTO já resolvido no feed (sem rolar de novo) — usado por
   * efeitos pontuais de habilidade como cura e vida temporária (Fase 12.4).
   * O chamador já calculou o total (e os dados, se rolou); aqui só persiste.
   *
   * @param {Object} params
   * @param {string} params.mesaId
   * @param {string} [params.fichaId]
   * @param {string} params.rotulo  — ex: "Cura — Segundo Fôlego"
   * @param {string} [params.notacao] — ex: "1d10+2" ou "" para fixo
   * @param {number} params.total   — quantidade final (curada / vida temp)
   * @param {Array}  [params.dados] — [{lados, valor, descartado}] se houve rolagem
   */
  async function registrarEvento({ mesaId, fichaId = null, rotulo, notacao = '', total, dados = [] }) {
    try {
      const { error } = await supabase.from('rolagens').insert({
        mesa_id: mesaId,
        autor_id: session.user.id,
        autor_nome: autorNome || session.user.email,
        ficha_id: fichaId || null,
        rotulo: rotulo || null,
        notacao: notacao || '',
        resultados: {
          dados,
          individuais: dados.map(d => d.valor),
          mantidos: dados.filter(d => !d.descartado).map(d => d.valor),
          descartados: dados.filter(d => d.descartado).map(d => d.valor),
          modificador: 0,
        },
        total,
      })
      if (error) throw error
    } catch (err) {
      setErro(err.message || 'Erro ao registrar evento.')
    }
  }

  return { registrarRolagem, registrarEvento, rolando, erro, autorNome }
}

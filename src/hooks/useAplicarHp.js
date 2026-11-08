import { supabase } from '../lib/supabase'
import { calcularVida, vidaDoAlvo } from '../lib/alvosCombate'
import { useUpdateFicha } from './useFicha'
import { useRolagem } from './useRolagem'

/**
 * Aplica dano (delta < 0) ou cura (delta > 0) a um combatente e avisa no feed.
 * Extraído da SessaoPage na F32.3 porque a virada de turno (sessão E mapa) passou
 * a aplicar efeitos contínuos — o mapa não pode pular o que a sessão faz.
 *
 * Com ficha: gasta a vida temporária antes do dano (F12) e respeita o máximo na
 * cura. Sem ficha (inimigo avulso): mexe no próprio combatente. A regra mora em
 * lib/alvosCombate (F53), a mesma que monta o plano de vários alvos.
 */
export function useAplicarHp({ cards = [], encontroApi, mesaId, sessaoId = null }) {
  const { updateFicha } = useUpdateFicha()
  const { registrarEvento } = useRolagem()
  const cardsPorFicha = Object.fromEntries(cards.map(cd => [cd.id, cd]))

  async function aplicarHp(c, delta, rotuloCustom = null) {
    if (!delta || !c) return
    try {
      const vida = vidaDoAlvo(c, cardsPorFicha)
      if (!vida) return
      const novo = calcularVida(vida, delta)
      if (vida.fichaId) {
        const patch = { hp_atual: novo.hp }
        if (novo.temp !== vida.temp) patch.vida_temp_atual = novo.temp
        await updateFicha(vida.fichaId, patch)
      } else {
        await encontroApi.atualizarCombatente(c.id, { hp_atual: novo.hp })
      }
      await registrarEvento({
        mesaId, sessaoId, fichaId: c.ficha_id || null,
        rotulo: rotuloCustom || `${c.nome} ${delta < 0 ? `sofreu ${-delta} de dano` : `recuperou ${delta} de vida`}`,
        notacao: '', total: Math.abs(delta), dados: [],
      })
    } catch {
      // silenciado — sem permissão (RLS) ou falha de rede não deve quebrar a UI
    }
  }

  // F53 — várias barras/alvos de uma vez pela RPC (valida quem participa do
  // encontro). Diferente de aplicarHp, o erro NÃO é engolido: volta em { erro }.
  async function aplicarEmAlvos(plano, rotulo) {
    const encontroId = encontroApi?.encontro?.id
    if (!encontroId) return { erro: 'Não há combate em andamento.' }
    const { error } = await supabase.rpc('aplicar_resultado_combate', { p_encontro_id: encontroId, p_alvos: plano.escritas })
    if (error) return { erro: error.message || 'Não foi possível aplicar o resultado.' }
    await registrarEvento({
      mesaId, sessaoId, rotulo: `${rotulo}: ${plano.linhas.join(' · ')}`,
      notacao: '', total: plano.total ?? 0, dados: [],
    })
    return {}
  }

  aplicarHp.aplicarEmAlvos = aplicarEmAlvos
  return aplicarHp
}

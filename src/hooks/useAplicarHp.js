import { useUpdateFicha } from './useFicha'
import { useRolagem } from './useRolagem'

/**
 * Aplica dano (delta < 0) ou cura (delta > 0) a um combatente e avisa no feed.
 * Extraído da SessaoPage na F32.3 porque a virada de turno (sessão E mapa) passou
 * a aplicar efeitos contínuos — o mapa não pode pular o que a sessão faz.
 *
 * Com ficha: gasta a vida temporária antes do dano (F12) e respeita o máximo na
 * cura. Sem ficha (inimigo avulso): mexe no próprio combatente.
 */
export function useAplicarHp({ cards = [], encontroApi, mesaId, sessaoId = null }) {
  const { updateFicha } = useUpdateFicha()
  const { registrarEvento } = useRolagem()

  return async function aplicarHp(c, delta, rotuloCustom = null) {
    if (!delta || !c) return
    try {
      if (c.ficha_id) {
        const card = cards.find(cd => cd.id === c.ficha_id)
        if (!card) return
        // F33 — transformado: a vida que muda é a da FORMA (card.ficha é a dela)
        const idVida = card.ficha?.id || c.ficha_id
        const max = card.hpMax || card.hpMaxBase || 0
        const hp = card.hpAtual ?? 0
        if (delta < 0) {
          let dano = -delta
          let temp = card.ficha?.vida_temp_atual ?? 0
          const patch = {}
          if (temp > 0) {
            const consumido = Math.min(temp, dano)
            temp -= consumido; dano -= consumido
            patch.vida_temp_atual = temp
          }
          patch.hp_atual = hp - dano
          await updateFicha(idVida, patch)
        } else {
          await updateFicha(idVida, { hp_atual: max > 0 ? Math.min(max, hp + delta) : hp + delta })
        }
      } else {
        const hp = c.hp_atual ?? 0
        const max = c.hp_maximo
        const novo = delta > 0 && max != null ? Math.min(max, hp + delta) : hp + delta
        await encontroApi.atualizarCombatente(c.id, { hp_atual: novo })
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
}

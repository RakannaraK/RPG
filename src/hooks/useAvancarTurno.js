import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRolagem } from './useRolagem'
import { planejarTurno } from '../lib/custoHabilidade'
import { ordenarPorIniciativa } from '../lib/iniciativa'

/**
 * "Próximo turno" completo (F14.4 + F20.5), compartilhado pela sessão e pelo
 * mapa (F26.5) — avançar pelo mapa não pode pular os efeitos colaterais:
 *  - avisa no feed as condições que expiraram na virada de rodada;
 *  - cobra os custos por turno das habilidades ativas de quem entra no turno.
 *
 * O mestre não escreve em pools_ficha alheio (RLS): o plano sai do motor puro
 * e a RPC SECURITY DEFINER `pagar_custo_turno` persiste.
 */
export function useAvancarTurno({ encontroApi, cards, mesaId, sessaoId }) {
  const { registrarEvento } = useRolagem()
  const [avisoTurno, setAvisoTurno] = useState('')

  async function cobrarCustoDoTurno(indiceTurno) {
    if (indiceTurno == null) return
    const combatente = ordenarPorIniciativa(encontroApi.combatentes)[indiceTurno]
    const fichaId = combatente?.ficha_id
    if (!fichaId) return

    const card = cards.find(c => c.id === fichaId)
    const ct = card?.custosTurno
    if (!ct?.habilidadesAtivas?.length) return

    const plano = planejarTurno(ct.habilidadesAtivas, {
      atualDoPool: id => ct.atualPorPool[id] ?? 0,
      poolsPorId: ct.poolsPorId,
      contexto: ct.contexto,
    })
    if (plano.debitos.length === 0 && plano.desativar.length === 0) return

    try {
      const { error: err } = await supabase.rpc('pagar_custo_turno', {
        p_ficha_id: fichaId,
        p_debitos: plano.debitos,
        p_desativar: plano.desativar,
      })
      if (err) throw err
    } catch (err) {
      // Não quebra o combate, mas avisa o mestre que o custo por turno não foi cobrado.
      const nome = card?.nome || 'o personagem'
      setAvisoTurno(`Custo por turno de ${nome} não foi cobrado: ${err.message || 'erro na cobrança'}. Ajuste os recursos na mão.`)
      return
    }

    for (const aviso of plano.avisos) {
      await registrarEvento({ mesaId, sessaoId, rotulo: aviso, notacao: '', total: 0, dados: [] })
    }
  }

  async function proximoTurno() {
    const res = await encontroApi.proximoTurno()
    for (const cond of res?.expiradas || []) {
      await registrarEvento({
        mesaId, sessaoId,
        rotulo: `${cond.nome} expirou em ${cond.combatenteNome}`,
        notacao: '', total: 0, dados: [],
      })
    }
    await cobrarCustoDoTurno(res?.turno)
  }

  return { proximoTurno, avisoTurno, setAvisoTurno }
}

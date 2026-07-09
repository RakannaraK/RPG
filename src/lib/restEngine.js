import { rolarNotacao, validarNotacao, resolverNotacaoFormula } from './diceNotation.js'
import { avaliarFormula } from './formulaEngine.js'

// 17.5 — avalia uma fórmula com segurança (falha → 0)
function safeFormula(f, contexto) {
  try { return avaliarFormula(f, contexto || {}) } catch { return 0 }
}

/**
 * Fase 15.2 — motor de recuperação de descanso (função PURA).
 * Calcula o que um descanso recupera para uma ficha; NÃO grava no banco.
 * A UI mostra o preview (calcular) e depois aplica.
 *
 * Arredondamento: frações para BAIXO. Vida nunca passa do máximo (final, com mods).
 */

// Aplica um modo de recuperação de VIDA e retorna o novo valor (+ dados se rolou).
// Fase 17.5: 'fixo' aceita fórmula (regra.valor_e_formula); 'dado' aceita notação
// com variáveis, resolvida via 17.2 com o contexto da ficha.
function aplicarModoVida(de, max, regra, contexto) {
  const modo = regra?.modo || 'nada'
  const valor = regra?.valor
  switch (modo) {
    case 'total': return { para: max }
    case 'fixo': {
      const v = regra?.valor_e_formula ? safeFormula(valor, contexto) : (Number(valor) || 0)
      return { para: Math.min(max, de + v) }
    }
    case 'fracao': {
      const rec = Math.floor(max * (Number(valor) || 0))
      return { para: Math.min(max, de + rec) }
    }
    case 'dado': {
      let nota = String(valor || '').trim()
      if (contexto) { try { nota = resolverNotacaoFormula(nota, contexto).notacao } catch { /* mantém original */ } }
      if (nota && validarNotacao(nota)) {
        const r = rolarNotacao(nota)
        return { para: Math.min(max, de + r.total), notacao: nota, rolado: r.total, dados: r.dados }
      }
      return { para: de }
    }
    case 'nada':
    default: return { para: de }
  }
}

/**
 * @param {object} params
 * @param {object} params.tipoDescanso   - regra do descanso (config_layout.descansos[i])
 * @param {object} params.ficha          - { hp_atual, hp_maximo, vida_temp_atual }
 * @param {object} params.valoresFinais  - { vida_max } (final, do motor de modificadores)
 * @param {Array}  params.habilidadesFicha - [{ id, recurso_atual, habilidade: { id, nome, recurso_nome, recurso_max, recupera_em } }]
 * @returns {{ vida, vida_temp, recursos, resumo }}
 */
export function calcularDescanso({ tipoDescanso, ficha, valoresFinais, habilidadesFicha = [], contexto = null }) {
  const max = Number(valoresFinais?.vida_max ?? ficha?.hp_maximo ?? 0) || 0
  const hpDe = Number(ficha?.hp_atual ?? 0) || 0
  const vr = aplicarModoVida(hpDe, max, tipoDescanso?.vida, contexto)
  const vida = {
    de: hpDe,
    para: vr.para,
    recuperado: vr.para - hpDe,
    notacao: vr.notacao || null,
    rolado: vr.rolado ?? null,
    dados: vr.dados || null,
  }

  // Vida temporária
  const vtDe = Number(ficha?.vida_temp_atual ?? 0) || 0
  const vtModo = tipoDescanso?.vida_temp?.modo || 'manter'
  const vida_temp = { de: vtDe, para: vtModo === 'zerar' ? 0 : vtDe }

  // Recursos de habilidade
  const regraRec = tipoDescanso?.recursos_habilidade || { modo: 'nada' }
  const recursos = []
  for (const hf of habilidadesFicha) {
    const hab = hf.habilidade
    if (!hab || hab.recurso_max == null) continue
    const rmax = Number(hab.recurso_max) || 0
    const ratual = Number(hf.recurso_atual ?? rmax) || 0
    let para = ratual
    if (hab.recupera_em) {
      // Override granular: essa habilidade só recupera nesse descanso (ao máximo)
      para = hab.recupera_em === tipoDescanso?.id ? rmax : ratual
    } else {
      const modo = regraRec.modo || 'nada'
      if (modo === 'total') para = rmax
      else if (modo === 'parcial') para = Math.min(rmax, ratual + Math.floor(rmax * (Number(regraRec.valor) || 0)))
      // 'nada' → mantém
    }
    if (para !== ratual) {
      recursos.push({ habilidadeFichaId: hf.id, nome: hab.recurso_nome || hab.nome, de: ratual, para })
    }
  }

  // Resumo legível
  const partes = []
  if (vida.recuperado > 0) partes.push(`+${vida.recuperado} de vida`)
  if (vida_temp.para === 0 && vida_temp.de > 0) partes.push('vida temporária zerada')
  for (const r of recursos) partes.push(`${r.nome} ${r.de}→${r.para}`)
  const resumo = partes.length ? `Recuperou ${partes.join(', ')}.` : 'Nada a recuperar.'

  return { vida, vida_temp, recursos, resumo }
}

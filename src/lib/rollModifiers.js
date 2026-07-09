import { parseNotacao } from './diceNotation.js'

/**
 * Fase 12.2 — aplica efeitos de acerto/dano à notação de uma rolagem.
 *
 * ESTENDE o sistema de rolagem (Fase 7): não rola nada, só monta a notação
 * final somando os bônus fixos e concatenando os dados extras dos modificadores
 * ativos aplicáveis. A rolagem em si continua sendo feita por rolarNotacao().
 *
 * Escopo (decisão do projeto): por CATEGORIA DE AÇÃO em texto.
 *   - modificador sem escopo_categoria → global (vale para tudo)
 *   - com escopo_categoria → vale só quando bate com a categoria da ação/arma
 *   - comparação normalizada (minúsculas, sem espaços nas pontas)
 */

function normalizar(s) {
  return (s ?? '').toString().trim().toLowerCase()
}

/** Um modificador aplica-se se é global ou se sua categoria bate com a da ação. */
export function escopoAplica(mod, categoria) {
  const esc = normalizar(mod.escopo_categoria)
  if (!esc) return true // global
  return esc === normalizar(categoria)
}

/** Renderiza {grupos, modificador} de volta para notação (dados primeiro, constante no fim). */
function renderNotacao(grupos, modificador) {
  const dados = grupos.map(g =>
    `${g.qtd}d${g.lados}${g.keep ? g.keep.tipo + g.keep.n : ''}`
  )
  let s = dados.join('+')
  if (!s) return String(modificador) // caso degenerado (sem dados)
  if (modificador > 0) s += `+${modificador}`
  else if (modificador < 0) s += `${modificador}`
  return s
}

/**
 * Monta a notação final de uma rolagem de acerto ou dano com os modificadores ativos.
 *
 * Ex: dano base "1d8+4" + Fúria (dano +2) + Abençoado (dano +1d6)
 *   => notacaoFinal "1d8+1d6+6"  (fixos somados, dados concatenados)
 *
 * @param {object} params
 * @param {'acerto'|'dano'} params.tipo
 * @param {string} params.notacaoBase — notação já resolvida (tokens @attr/@campo trocados)
 * @param {string|null} [params.categoria] — categoria de ação da arma/ação (para o escopo)
 * @param {Array} [params.modificadoresAtivos] — saída de coletarModificadores()
 * @returns {{ notacaoFinal: string, detalhamento: Array, percentual: number }}
 *   detalhamento: [{ origem:'base', notacao }, { fonte, tipo:'fixo'|'dados'|'percentual', valor, escopo }]
 *   percentual: soma dos percentual_rolagem aplicáveis (Fase 18.3) — aplicado sobre o TOTAL após rolar
 */
export function montarNotacaoComModificadores({ tipo, notacaoBase, categoria = null, modificadoresAtivos = [] }) {
  const aplicaveis = modificadoresAtivos.filter(
    m => m.tipo === tipo && escopoAplica(m, categoria)
  )

  let grupos = []
  let modificador = 0
  let baseOk = true
  try {
    const p = parseNotacao(notacaoBase)
    grupos = [...p.grupos]
    modificador = p.modificador
  } catch {
    baseOk = false // notação base inesperada — devolve como veio
  }

  const detalhamento = [{ origem: 'base', notacao: notacaoBase }]
  let percentual = 0

  for (const m of aplicaveis) {
    const fixo = Number(m.valor) || 0
    const dadosExtras = (m.dados_extras || '').toString().trim()
    const perc = Number(m.percentual_rolagem) || 0

    if (fixo) {
      modificador += fixo
      detalhamento.push({ fonte: m._fonte || '?', tipo: 'fixo', valor: fixo, escopo: m.escopo_categoria || null })
    }
    if (dadosExtras) {
      try {
        const pe = parseNotacao(dadosExtras)
        grupos.push(...pe.grupos)
        modificador += pe.modificador
        detalhamento.push({ fonte: m._fonte || '?', tipo: 'dados', valor: dadosExtras, escopo: m.escopo_categoria || null })
      } catch {
        // dados_extras inválido → ignora silenciosamente
      }
    }
    if (perc) {
      percentual += perc
      detalhamento.push({ fonte: m._fonte || '?', tipo: 'percentual', valor: perc, escopo: m.escopo_categoria || null })
    }
  }

  const notacaoFinal = baseOk ? renderNotacao(grupos, modificador) : notacaoBase
  return { notacaoFinal, detalhamento, percentual }
}

/**
 * Fase 12.3 — determina o estado de vantagem/desvantagem de um teste,
 * a partir dos modificadores ativos que miram aquele atributo/perícia.
 *
 * Convenção comum: vantagem + desvantagem simultâneas se anulam.
 *
 * @param {object} params
 * @param {string} params.alvo — id do atributo ou da perícia testada
 * @param {Array} [params.modificadoresAtivos]
 * @returns {'vantagem'|'desvantagem'|'anulada'|'normal'}
 */
export function resolverVantagem({ alvo, modificadoresAtivos = [] }) {
  let temVantagem = false
  let temDesvantagem = false
  for (const m of modificadoresAtivos) {
    if (m.alvo !== alvo) continue
    if (m.tipo === 'vantagem') temVantagem = true
    if (m.tipo === 'desvantagem') temDesvantagem = true
  }
  if (temVantagem && temDesvantagem) return 'anulada'
  if (temVantagem) return 'vantagem'
  if (temDesvantagem) return 'desvantagem'
  return 'normal'
}

/**
 * Fase 12.3 — aplica vantagem/desvantagem à notação de um teste, rolando o
 * dado padrão DUAS vezes e mantendo o maior (vantagem) ou o menor (desvantagem).
 * Reusa kh/kl da Fase 7: "1d20+5" → "2d20kh1+5" (vantagem) / "2d20kl1+5" (desvant.).
 * Estados 'normal' e 'anulada' devolvem a notação inalterada.
 *
 * @param {string} notacaoBase — notação de teste (ex: "1d20+5")
 * @param {'vantagem'|'desvantagem'|'anulada'|'normal'} estado
 * @returns {string}
 */
export function aplicarVantagem(notacaoBase, estado) {
  if (estado !== 'vantagem' && estado !== 'desvantagem') return notacaoBase
  let parsed
  try { parsed = parseNotacao(notacaoBase) } catch { return notacaoBase }
  if (parsed.grupos.length === 0) return notacaoBase
  const keepTipo = estado === 'vantagem' ? 'kh' : 'kl'
  // Rola 2 e mantém 1 no primeiro grupo (testes são sempre 1dN)
  const grupos = parsed.grupos.map((g, i) =>
    i === 0 ? { qtd: 2, lados: g.lados, keep: { tipo: keepTipo, n: 1 } } : g
  )
  return renderNotacao(grupos, parsed.modificador)
}

/**
 * Fase 22.5 — Defesa ativa (função PURA).
 * Não acessa banco nem React.
 *
 * config_layout.defesa_ativa = {
 *   ativo,
 *   opcoes: [{ id, nome, notacao }],           -- rolagem de cada reação (F17)
 *   faixas: [{ de, ate, reducao_percentual, rotulo }],  -- comparando (defesa − ataque)
 *   contra_ataque: { sofre_dano_cheio, efeito_no_atacante, condicao }
 * }
 *
 * A faixa é escolhida pela DIFERENÇA (defesa − ataque). de/ate podem ser abertos
 * (null = −∞ / +∞). Redução aplicada sobre o dano já final (F18/crítico), com piso.
 */

const eff = (v, aberto) => (v == null || v === '') ? aberto : Number(v)

/** Faixa cuja janela cobre a diferença. null se nenhuma. */
export function faixaDefesa(diferenca, faixas = []) {
  const x = Number(diferenca) || 0
  for (const f of faixas || []) {
    const de = eff(f.de, -Infinity)
    const ate = eff(f.ate, Infinity)
    if (x >= de && x <= ate) return f
  }
  return null
}

/** Dano após a redução da faixa (piso, nunca negativo). Aritmética inteira
 *  para evitar o erro de ponto flutuante (ex: 20 com −90% deve dar 2, não 1). */
export function aplicarReducao(dano, reducao_percentual) {
  const d = Number(dano) || 0
  const r = Number(reducao_percentual) || 0
  return Math.max(0, Math.floor((d * (100 - r)) / 100))
}

/**
 * Resultado completo de uma defesa ativa.
 * @param {object} p { ataque, defesa, dano, faixas }
 * @returns {{ diferenca, faixa, reducao, danoReduzido, rotuloFaixa }}
 */
export function resolverDefesa({ ataque = 0, defesa = 0, dano = 0, faixas = [] }) {
  const diferenca = (Number(defesa) || 0) - (Number(ataque) || 0)
  const faixa = faixaDefesa(diferenca, faixas)
  const reducao = faixa ? Number(faixa.reducao_percentual) || 0 : 0
  return {
    diferenca,
    faixa,
    reducao,
    danoReduzido: faixa ? aplicarReducao(dano, reducao) : Number(dano) || 0,
    rotuloFaixa: faixa?.rotulo || null,
  }
}

/**
 * Valida as faixas: contíguas, sem sobreposição; a primeira pode ser aberta
 * embaixo (de = null) e a última aberta em cima (ate = null). Mesmo espírito da
 * F19.4, adaptado a extremos abertos dos dois lados.
 */
export function validarFaixasDefesa(faixas) {
  const fs = faixas
  if (!Array.isArray(fs) || fs.length === 0) return { valida: false, erro: 'Defina ao menos uma faixa.' }

  const ord = fs
    .map(f => ({ f, de: eff(f.de, -Infinity), ate: eff(f.ate, Infinity) }))
    .sort((a, b) => a.de - b.de)

  for (let k = 0; k < ord.length; k++) {
    const { f, de, ate } = ord[k]
    const rotulo = `Faixa ${k + 1}`
    if (!Number.isFinite(de) && de !== -Infinity) return { valida: false, erro: `${rotulo}: "de" inválido.` }
    if (ate < de) return { valida: false, erro: `${rotulo}: "até" menor que "de".` }
    if (f.reducao_percentual == null || f.reducao_percentual === '') return { valida: false, erro: `${rotulo}: defina a redução %.` }
    if (de === -Infinity && k !== 0) return { valida: false, erro: 'Só a primeira faixa pode ser aberta embaixo (sem "de").' }
    if (ate === Infinity && k !== ord.length - 1) return { valida: false, erro: 'Só a última faixa pode ser aberta em cima (sem "até").' }
    if (k > 0) {
      const prevAte = ord[k - 1].ate
      if (de <= prevAte) return { valida: false, erro: `As faixas ${k} e ${k + 1} se sobrepõem.` }
      if (de !== prevAte + 1) return { valida: false, erro: `Buraco entre as faixas ${k} e ${k + 1}: "de" deveria ser ${prevAte + 1}.` }
    }
  }
  return { valida: true }
}

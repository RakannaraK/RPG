/**
 * Fase 19.4 — Escalonamento por faixa (função PURA).
 * Não acessa banco nem React.
 *
 * Um modificador pode ter, em vez de um valor fixo, um valor POR FAIXA de uma
 * variável (nível total ou nível numa classe):
 *
 *   modificador.faixas = {
 *     variavel: 'nivel' | 'nivel:<classe_id ou nome>',
 *     campo: 'valor' | 'dados_extras',          // qual campo a faixa preenche
 *     faixas: [
 *       { de: 1,  ate: 4,    valor: '1d10' },
 *       { de: 5,  ate: 10,   valor: '2d10' },
 *       { de: 11, ate: 16,   valor: '3d10' },
 *       { de: 17, ate: null, valor: '4d10' },   // última pode ser aberta
 *     ],
 *   }
 *
 * A faixa ativa é resolvida NA COLETA, com o valor atual da variável — mudar de
 * nível move a faixa na hora. `valor` aceita número, fórmula ou notação de dado,
 * conforme o campo; este módulo não interpreta, só escolhe.
 */
import { normalizar } from './formulaEngine.js'

/** Valor atual da variável que a faixa observa. Classe ausente = 0. */
export function valorVariavelFaixa(variavel, contexto = {}) {
  const v = String(variavel || 'nivel')
  if (v.startsWith('nivel:')) {
    const alvo = v.slice('nivel:'.length).trim()
    const mapa = contexto.niveisClasse || {}
    if (alvo in mapa) return Number(mapa[alvo]) || 0
    const norm = normalizar(alvo)
    for (const k of Object.keys(mapa)) {
      if (normalizar(k) === norm) return Number(mapa[k]) || 0
    }
    return 0
  }
  return Number(contexto.nivel) || 0
}

/**
 * Faixa em vigor para o contexto dado.
 * @returns {{ faixa: object, valorVariavel: number }|null} null se nenhuma cobre o valor
 */
export function faixaAtiva(spec, contexto = {}) {
  if (!spec || !Array.isArray(spec.faixas) || spec.faixas.length === 0) return null
  const x = valorVariavelFaixa(spec.variavel, contexto)
  for (const f of spec.faixas) {
    const de = Number(f.de)
    const ate = (f.ate == null || f.ate === '') ? Infinity : Number(f.ate)
    if (x >= de && x <= ate) return { faixa: f, valorVariavel: x }
  }
  return null
}

/**
 * Valida as faixas para o editor: ordenadas, contíguas, sem sobreposição,
 * só a última pode ser aberta, todas com valor.
 * @returns {{ valida: boolean, erro?: string }}
 */
export function validarFaixas(spec) {
  const fs = spec?.faixas
  if (!Array.isArray(fs) || fs.length === 0) {
    return { valida: false, erro: 'Defina ao menos uma faixa.' }
  }

  for (let i = 0; i < fs.length; i++) {
    const f = fs[i]
    const rotulo = `Faixa ${i + 1}`
    const de = Number(f.de)
    if (!Number.isFinite(de)) return { valida: false, erro: `${rotulo}: "de" inválido.` }

    const aberta = f.ate == null || f.ate === ''
    const ate = aberta ? Infinity : Number(f.ate)
    if (!aberta && !Number.isFinite(ate)) return { valida: false, erro: `${rotulo}: "até" inválido.` }
    if (ate < de) return { valida: false, erro: `${rotulo}: "até" é menor que "de".` }
    if (aberta && i !== fs.length - 1) {
      return { valida: false, erro: 'Só a última faixa pode ficar aberta (sem "até").' }
    }
    if (f.valor === undefined || f.valor === null || String(f.valor).trim() === '') {
      return { valida: false, erro: `${rotulo}: defina um valor.` }
    }

    if (i > 0) {
      const ant = fs[i - 1]
      const antAte = (ant.ate == null || ant.ate === '') ? Infinity : Number(ant.ate)
      if (de <= antAte) {
        return { valida: false, erro: `As faixas ${i} e ${i + 1} se sobrepõem.` }
      }
      if (de !== antAte + 1) {
        return { valida: false, erro: `Buraco entre as faixas ${i} e ${i + 1}: "de" deveria ser ${antAte + 1}.` }
      }
    }
  }
  return { valida: true }
}

/**
 * Substitui o `valor` dos modificadores escalonados pelo valor da faixa ativa.
 * Anota `_faixaAtiva` para rastreabilidade ("2d10 — faixa nv 5-10, nível 9").
 * Modificadores sem `faixas` passam intactos (retrocompatibilidade).
 *
 * Roda ANTES de resolverValoresFormula: o valor da faixa ainda pode ser fórmula.
 */
export function resolverFaixas(modificadores, contexto = {}) {
  return (modificadores || []).map(m => {
    if (!m.faixas) return m
    // A faixa preenche `valor` (bônus/número) ou `dados_extras` (notação de dado).
    const campo = m.faixas.campo === 'dados_extras' ? 'dados_extras' : 'valor'
    const ativa = faixaAtiva(m.faixas, contexto)
    if (!ativa) {
      // Nenhuma faixa cobre o valor atual — o modificador não contribui.
      return { ...m, [campo]: campo === 'valor' ? 0 : '', _faixaAtiva: null, _faixaErro: true }
    }
    return {
      ...m,
      [campo]: ativa.faixa.valor,
      _faixaAtiva: {
        de: ativa.faixa.de,
        ate: ativa.faixa.ate ?? null,
        campo,
        variavel: m.faixas.variavel || 'nivel',
        valorVariavel: ativa.valorVariavel,
      },
    }
  })
}

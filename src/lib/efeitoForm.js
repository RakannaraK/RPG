// Fase 12.5 — lógica pura do formulário de efeitos (modificadores) de habilidade.
// Separada do componente para ser testável e reutilizável. Mapeia o estado do
// formulário no payload de modificador persistido (ver hooks addModificador).

// Quais campos cada tipo de efeito usa
export const usaAtributoAlvo = t => t === 'atributo'
export const usaCombateAlvo  = t => t === 'combate'
export const usaTextoAlvo    = t => t === 'resistencia' || t === 'imunidade' || t === 'vulnerabilidade'
export const usaValorNum     = t => t === 'atributo' || t === 'vida_max' || t === 'vida_temp' || t === 'combate'
export const usaOperacao     = t => t === 'atributo' || t === 'vida_max' || t === 'combate'
export const ehAcertoDano    = t => t === 'acerto' || t === 'dano'
export const ehVantagem      = t => t === 'vantagem' || t === 'desvantagem'
export const ehAcao          = t => t === 'cura' || t === 'vida_temp_acao'

/**
 * Monta a parte de condição do payload a partir do estado do formulário.
 * @returns {{ condicao_tipo: string, condicao_config: object|null }}
 */
export function montarCondicao(s) {
  if (s.condTipo === 'auto') {
    if (s.condMetrica === 'habilidade_ativa') {
      return { condicao_tipo: 'auto', condicao_config: { metrica: 'habilidade_ativa' } }
    }
    return {
      condicao_tipo: 'auto',
      condicao_config: { metrica: s.condMetrica, operador: s.condOperador, valor: Number(s.condValor) },
    }
  }
  if (s.condTipo === 'manual') {
    return { condicao_tipo: 'manual', condicao_config: { rotulo: (s.condRotulo || '').trim() } }
  }
  return { condicao_tipo: 'nenhuma', condicao_config: null }
}

/**
 * Mapeia o estado do formulário no payload do modificador (sem validar — a
 * validação fica no componente). Campos do estado:
 *   tipo, alvo, operacao, valor, dadosExtras, escopoCategoria,
 *   vantTipoAlvo, curaModo, condTipo, condMetrica, condOperador, condValor, condRotulo
 */
export function montarEfeitoPayload(s) {
  const cond = montarCondicao(s)
  const p = {
    tipo: s.tipo,
    alvo: null,
    operacao: 'somar',
    valor: null,
    dados_extras: null,
    escopo_categoria: null,
    ...cond,
  }
  const t = s.tipo
  if (usaAtributoAlvo(t) || usaCombateAlvo(t)) {
    p.alvo = s.alvo
    p.valor = s.valor
    p.operacao = usaOperacao(t) ? s.operacao : 'somar'
  } else if (usaTextoAlvo(t)) {
    p.alvo = (s.alvo || '').trim()
  } else if (t === 'vida_max') {
    p.valor = s.valor
    p.operacao = s.operacao
  } else if (t === 'vida_temp') {
    p.valor = s.valor
    p.operacao = 'somar'
  } else if (ehAcertoDano(t)) {
    p.valor = String(s.valor ?? '').trim() || null
    p.dados_extras = (s.dadosExtras || '').trim() || null
    p.escopo_categoria = (s.escopoCategoria || '').trim() || null
  } else if (ehVantagem(t)) {
    p.alvo = s.alvo
    p.valor = s.vantTipoAlvo
  } else if (ehAcao(t)) {
    p.valor = String(s.valor ?? '').trim()
    p.operacao = s.curaModo
  }
  return p
}

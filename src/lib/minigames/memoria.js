import { embaralhar, proximo } from './semente'

/**
 * Fase 28 — Memória (motor puro). Fases: 'memorizar' → (a interface chama
 * comecarResposta quando o tempo acaba) → 'responder' → acertou tudo: próxima
 * rodada com uma runa a mais / errou: 'fim'.
 */
export const RUNAS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ']

export const DIFICULDADES_MEMORIA = {
  normal: { tamanhoInicial: 4, opcoes: 6, exibir: 3, repete: false },
  dificil: { tamanhoInicial: 5, opcoes: 9, exibir: 2, repete: false },
  impossivel: { tamanhoInicial: 6, opcoes: 12, exibir: 1.2, repete: true },
}

/** Segundos para memorizar: cresce um pouco a cada rodada (sequência maior). */
export const tempoExibir = e => Math.round((e.cfg.exibir + 0.3 * (e.rodada - 1)) * 10) / 10

function novaRodada(e) {
  const tamanho = e.cfg.tamanhoInicial + e.rodada - 1
  // Sem repetição enquanto couber nas opções
  const podeRepetir = e.cfg.repete || tamanho > e.opcoes.length
  let s = e.s
  let sequencia
  if (podeRepetir) {
    sequencia = Array.from({ length: tamanho }, () => {
      const p = proximo(s)
      s = p.s
      return e.opcoes[Math.floor(p.valor * e.opcoes.length)]
    })
  } else {
    const r = embaralhar(e.opcoes, s)
    s = r.s
    sequencia = r.lista.slice(0, tamanho)
  }
  const grade = embaralhar(e.opcoes, s)
  return { ...e, s: grade.s, sequencia, grade: grade.lista, posicao: 0, fase: 'memorizar' }
}

export function iniciarMemoria(config, semente) {
  const cfg = { ...DIFICULDADES_MEMORIA.normal, ...config }
  const escolha = embaralhar(RUNAS, semente >>> 0)
  const qtd = Math.max(2, Math.min(RUNAS.length, cfg.opcoes))
  return novaRodada({
    cfg, s: escolha.s, opcoes: escolha.lista.slice(0, qtd),
    rodada: 1, acertos: 0, maiorSequencia: 0, ultimo: null,
  })
}

export function comecarResposta(e) {
  return e.fase === 'memorizar' ? { ...e, fase: 'responder' } : e
}

export function responderMemoria(e, runa) {
  if (e.fase !== 'responder') return e
  const esperado = e.sequencia[e.posicao]
  if (runa !== esperado) return { ...e, fase: 'fim', ultimo: { tipo: 'erro', esperado, recebido: runa } }
  const acertou = { ...e, acertos: e.acertos + 1, posicao: e.posicao + 1, ultimo: { tipo: 'acerto', runa } }
  if (acertou.posicao < e.sequencia.length) return acertou
  return novaRodada({ ...acertou, rodada: e.rodada + 1, maiorSequencia: Math.max(e.maiorSequencia, e.sequencia.length) })
}

export function resultadoMemoria(e) {
  return { pontos: e.acertos, maiorSequencia: e.maiorSequencia, rodadas: e.rodada - (e.fase === 'fim' ? 1 : 0) }
}

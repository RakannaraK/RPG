import { DIFICULDADES_RODA } from './rodaRunica'
import { DIFICULDADES_CRONOMETRO } from './cronometro'
import { DIFICULDADES_MEMORIA } from './memoria'

/**
 * Fase 28 — catálogo dos jogos, textos do feed e classificação de desafios.
 */
export const JOGOS = {
  roda: { nome: 'Roda Rúnica', icone: '🌀', dificuldades: DIFICULDADES_RODA },
  cronometro: { nome: 'Cronômetro', icone: '⏱', dificuldades: DIFICULDADES_CRONOMETRO },
  memoria: { nome: 'Memória', icone: 'ᚱ', dificuldades: DIFICULDADES_MEMORIA },
}

export const NOMES_DIFICULDADE = { normal: 'Normal', dificil: 'Difícil', impossivel: 'Impossível', personalizada: 'Personalizada' }

/** Configuração efetiva: a da dificuldade, ou a Normal sobrescrita pelos parâmetros personalizados. */
export function configDoJogo(tipo, dificuldade, personalizada = {}) {
  const tabela = JOGOS[tipo]?.dificuldades
  if (!tabela) throw new Error(`Jogo desconhecido: ${tipo}`)
  return dificuldade === 'personalizada' ? { ...tabela.normal, ...personalizada } : { ...(tabela[dificuldade] || tabela.normal) }
}

const num = n => String(n).replace('.', ',')

export const rotuloFeed = (tipo, dificuldade) => `🎮 ${JOGOS[tipo]?.nome || tipo} (${NOMES_DIFICULDADE[dificuldade] || dificuldade})`

export function resumoResultado(tipo, r) {
  if (tipo === 'roda') return `${r.pontos} pontos · ${r.acertos} acertos · combo ${r.maiorCombo} · ${num(r.duracao)} s`
  if (tipo === 'cronometro') {
    return `${r.faixa} — parou em ${num(r.parado)} s (alvo ${num(r.alvo)} s, ${r.adiantado ? '−' : '+'}${r.erroMs} ms) · ${r.pontos} pontos`
  }
  if (tipo === 'memoria') return `${r.pontos} runas · maior sequência ${r.maiorSequencia}`
  return `${r.pontos} pontos`
}

/**
 * Ordena por pontos (maior primeiro); empate divide a posição (1º, 1º, 3º).
 * `meta` opcional marca quem atingiu.
 */
export function classificar(resultados, meta = null) {
  let anterior = null
  return [...resultados]
    .sort((a, b) => b.pontos - a.pontos)
    .map((r, i) => {
      const posicao = anterior && anterior.pontos === r.pontos ? anterior.posicao : i + 1
      anterior = { pontos: r.pontos, posicao }
      return { ...r, posicao, bateuMeta: meta == null ? null : r.pontos >= meta }
    })
}

/** Ranking da mesa: o MELHOR resultado de cada pessoa no jogo + dificuldade. */
export function rankingMesa(resultados, tipo, dificuldade, limite = 10) {
  const melhores = new Map()
  for (const r of resultados) {
    if (r.tipo !== tipo || r.dificuldade !== dificuldade) continue
    const atual = melhores.get(r.usuario_id)
    if (!atual || r.pontos > atual.pontos) melhores.set(r.usuario_id, r)
  }
  return classificar([...melhores.values()]).slice(0, limite)
}

/**
 * Estatísticas de uma pessoa por jogo: partidas, melhor pontuação e os
 * recordes específicos (maior combo e sobrevivência na Roda, menor erro no
 * Cronômetro, maior sequência na Memória).
 */
export function estatisticasJogador(resultados, usuarioId) {
  const stats = {}
  for (const r of resultados) {
    if (r.usuario_id !== usuarioId) continue
    const d = r.detalhes || {}
    const s = (stats[r.tipo] ??= { partidas: 0, melhor: 0 })
    s.partidas += 1
    s.melhor = Math.max(s.melhor, r.pontos)
    if (r.tipo === 'roda') {
      s.maiorCombo = Math.max(s.maiorCombo ?? 0, d.maiorCombo ?? 0)
      s.maiorSobrevivencia = Math.max(s.maiorSobrevivencia ?? 0, d.duracao ?? 0)
    } else if (r.tipo === 'cronometro' && d.erroMs != null) {
      s.menorErroMs = Math.min(s.menorErroMs ?? Infinity, d.erroMs)
    } else if (r.tipo === 'memoria') {
      s.maiorSequencia = Math.max(s.maiorSequencia ?? 0, d.maiorSequencia ?? 0)
    }
  }
  return stats
}

export function textoClassificacao(classificados, nomeDe = r => r.nome) {
  return classificados
    .map(r => `${r.posicao}º ${nomeDe(r)} ${r.pontos}${r.bateuMeta === true ? ' ✓' : r.bateuMeta === false ? ' ✗' : ''}`)
    .join(' · ')
}

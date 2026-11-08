import { podeEditarFicha } from './permissoesFicha'
import { normalizarGrade } from './mapaEngine'

/**
 * Fase 53 — motor puro do combate com vários alvos / área.
 * Sem React, sem Supabase: tudo aqui é testável com objetos soltos.
 */

/**
 * Gestor, responsável pelo combatente (53) ou dono/editor da ficha (regra antiga).
 * `contarResponsavel: false` = só a regra antiga (para o que grava direto nas tabelas).
 */
export function podeAgirNoCombate(c, { isGestor, meuUserId, cardsPorFicha = {}, contarResponsavel = true }) {
  if (isGestor) return true
  if (contarResponsavel && meuUserId && c.controlador_id === meuUserId) return true
  return !!(c.ficha_id && podeEditarFicha(cardsPorFicha[c.ficha_id]?.ficha, meuUserId))
}

/**
 * CA base (jogador via card; inimigo via combatente) + mods de condição tipo
 * 'combate' (ex.: Envenenado -2 CA). `semBase` = a CA base é desconhecida.
 */
export function caInfo(c, cardsPorFicha, campoCaId, condicoes = []) {
  let base = null
  if (c.ficha_id) {
    const card = cardsPorFicha[c.ficha_id]
    if (card && campoCaId != null) {
      const v = Number(card.combate?.[campoCaId])
      base = Number.isNaN(v) ? null : v
    }
  } else if (c.ca != null) {
    base = Number(c.ca)
  }
  let delta = 0
  for (const cond of condicoes) {
    const m = cond.modificador_config
    if (m && m.tipo === 'combate' && m.valor != null) delta += Number(m.valor) || 0
  }
  if (base == null && delta === 0) return null
  return { base: base ?? 0, efetiva: (base ?? 0) + delta, delta, semBase: base == null }
}

/** Defesa efetiva do alvo, ou null quando não se sabe (então o ataque acerta). */
export function defesaDoAlvo(c, { cardsPorFicha = {}, campoCaId = null, condicoes = [] }) {
  const info = caInfo(c, cardsPorFicha, campoCaId, condicoes)
  return info && !info.semBase ? info.efetiva : null
}

/**
 * Onde a vida do alvo mora: na ficha (a FORMA ativa, F33) ou no combatente.
 * null = combatente com ficha cujo card ainda não chegou.
 */
export function vidaDoAlvo(c, cardsPorFicha = {}) {
  if (c.ficha_id) {
    const card = cardsPorFicha[c.ficha_id]
    if (!card) return null
    return {
      fichaId: card.ficha?.id || c.ficha_id,
      hpAtual: card.hpAtual ?? 0,
      hpMax: card.hpMax || card.hpMaxBase || 0,
      temp: card.ficha?.vida_temp_atual ?? 0,
    }
  }
  return { fichaId: null, hpAtual: c.hp_atual ?? 0, hpMax: c.hp_maximo ?? 0, temp: 0 }
}

/** Dano (delta<0) gasta a temporária antes; cura limita no máximo; piso 0. */
export function calcularVida({ hpAtual = 0, hpMax = 0, temp = 0 }, delta) {
  if (delta < 0) {
    let dano = -delta
    const consumido = Math.min(temp, dano)
    dano -= consumido
    return { hp: Math.max(0, hpAtual - dano), temp: temp - consumido }
  }
  return { hp: hpMax > 0 ? Math.min(hpMax, hpAtual + delta) : hpAtual + delta, temp }
}

/** Ids dos combatentes (fora da reserva) cujo token tem o centro a ≤ raio do ponto. */
export function alvosNaArea({ centro, raio, tokens = [], combatentes = [], grade }) {
  const g = normalizarGrade(grade)
  const porPx = (Number(g.unidade) || 1) / (Number(g.tamanho) > 0 ? Number(g.tamanho) : 70)
  const ids = []
  for (const c of combatentes) {
    if (c.reserva) continue
    // token.x/y é o CENTRO (CamadaTokens desenha com translate(x y))
    const tk = tokens.find(t => t.combatente_id === c.id)
      || tokens.find(t => !t.combatente_id && c.ficha_id && t.ficha_id === c.ficha_id)
    if (!tk) continue
    if (Math.hypot(tk.x - centro.x, tk.y - centro.y) * porPx <= raio + 1e-9) ids.push(c.id)
  }
  return ids
}

/** Ataque x defesa por alvo. Empate acerta; sem ataque ou sem defesa, acerta. */
export function resolverAcertos({ ataque, alvos = [], defesaDe }) {
  return alvos.map(c => {
    const defesa = defesaDe ? defesaDe(c) : null
    const acertou = ataque == null || defesa == null || ataque >= defesa
    return { id: c.id, defesa, acertou }
  })
}

const sinal = n => (n < 0 ? `−${-n}` : `+${n}`)

/**
 * Plano de uma ação. alvos = [{ c, acertou }]; barras = { [id]: ['vida', poolId…] }.
 * `escritas` segue o p_alvos da RPC aplicar_resultado_combate; `linhas` vai ao feed.
 * Quem errou só toma metade (piso) se `metadeAoErrar`; cura ignora o acerto.
 */
export function planejarAplicacao({ alvos, valor, modo = 'dano', barras = {}, metadeAoErrar = false, cardsPorFicha = {} }) {
  const escritas = []
  const linhas = []
  for (const { c, acertou } of alvos) {
    const aplica = modo === 'cura' || acertou
    const v = aplica ? valor : metadeAoErrar ? Math.floor(valor / 2) : 0
    if (v <= 0) { linhas.push(`${c.nome}: errou`); continue }
    const delta = modo === 'cura' ? v : -v
    const marcadas = barras[c.id] || ['vida']
    const partes = []

    if (marcadas.includes('vida')) {
      const vida = vidaDoAlvo(c, cardsPorFicha)
      if (vida) {
        const novo = calcularVida(vida, delta)
        const e = { combatente_id: c.id, ficha_id: vida.fichaId, hp: novo.hp }
        if (novo.temp !== vida.temp) e.temp = novo.temp
        escritas.push(e)
        partes.push(`${sinal(delta)} vida`)
      }
    }

    // pools moram na ficha base (card.id), não na forma
    const card = c.ficha_id ? cardsPorFicha[c.ficha_id] : null
    const pools = []
    for (const id of marcadas) {
      const p = id === 'vida' ? null : card?.pools?.find(x => x.id === id)
      if (!p) continue
      pools.push({ pool_id: p.id, atual: Math.min(p.maximo ?? Infinity, Math.max(0, p.atual + delta)) })
      partes.push(`${sinal(delta)} ${p.nome}`)
    }
    if (pools.length) escritas.push({ combatente_id: c.id, ficha_id: c.ficha_id, pools })

    const efeito = partes.join(', ')
    linhas.push(acertou ? `${c.nome}: ${efeito || 'nada'}` : `${c.nome}: errou${efeito ? `, ${efeito}` : ''}`)
  }
  return { escritas, linhas, total: valor }
}

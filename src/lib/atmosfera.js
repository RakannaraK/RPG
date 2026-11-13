/**
 * Fase 57 — atmosfera do mapa (puro, sem DOM): normalização do JSONB `mapas.atmosfera`,
 * operações de edição e o motor de partículas. O desenho fica em CamadaAtmosfera.
 */
import { ID_VALIDO, LIMITES, SONS_AMBIENTE, TIPOS_ATMOSFERA, corValida, limitar } from './efeitosVocabulario'
import { raioParaPx } from './luzMapa'
import { brilho, mover as moverFundo, nascer as nascerFundo } from './ambiente'

export const COR_ESCURIDAO = '#05070C'
export const COR_LUZ = '#FFC27A'

const novoId = () => Math.random().toString(36).slice(2, 10) || 'x'
const ehNum = n => typeof n === 'number' && Number.isFinite(n)
const lista = v => (Array.isArray(v) ? v : [])

function idDe(raw, usados) {
  let id = typeof raw === 'string' && ID_VALIDO.test(raw) ? raw : novoId()
  while (usados.has(id)) id = novoId()
  usados.add(id)
  return id
}

function normalizarEfeito(raw, usados) {
  if (!raw || typeof raw !== 'object' || !TIPOS_ATMOSFERA[raw.tipo]) return null
  const e = {
    id: idDe(raw.id, usados),
    tipo: raw.tipo,
    intensidade: limitar(raw.intensidade, 0.1, 1, 0.5),
    cor: corValida(raw.cor) ? raw.cor : null,
  }
  if (ehNum(raw.x) && ehNum(raw.y) && ehNum(raw.raio) && !TIPOS_ATMOSFERA[raw.tipo].soCena) {
    e.x = limitar(raw.x, -1e6, 1e6)
    e.y = limitar(raw.y, -1e6, 1e6)
    e.raio = limitar(raw.raio, 0.5, 60)
  }
  return e
}

function normalizarFonte(raw, usados) {
  if (!raw || typeof raw !== 'object' || !ehNum(raw.x) || !ehNum(raw.y)) return null
  return {
    id: idDe(raw.id, usados),
    x: limitar(raw.x, -1e6, 1e6),
    y: limitar(raw.y, -1e6, 1e6),
    raio: limitar(raw.raio, 0.5, 60, 4),
    cor: corValida(raw.cor) ? raw.cor : COR_LUZ,
    tremula: raw.tremula === true,
  }
}

/** Dado não confiável (banco, arquivo, broadcast) → forma completa e segura. */
export function normalizarAtmosfera(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const usados = new Set()
  const luz = r.luz && typeof r.luz === 'object' ? r.luz : {}
  return {
    efeitos: lista(r.efeitos).map(e => normalizarEfeito(e, usados)).filter(Boolean).slice(0, LIMITES.efeitos),
    luz: {
      escuridao: limitar(luz.escuridao, 0, 0.95, 0),
      cor: corValida(luz.cor) ? luz.cor : COR_ESCURIDAO,
      fontes: lista(luz.fontes).map(f => normalizarFonte(f, usados)).filter(Boolean).slice(0, LIMITES.fontes),
    },
    sons: [...new Set(lista(r.sons).filter(s => typeof s === 'string' && SONS_AMBIENTE[s]))].slice(0, LIMITES.sons),
    som: r.som !== false,
  }
}

export const ATMOSFERA_VAZIA = normalizarAtmosfera(null)

export const ehLocal = e => e.x !== undefined

// ── Operações (devolvem atmosfera nova, normalizada) ────────────────────────

const comEfeitos = (atm, efeitos) => normalizarAtmosfera({ ...atm, efeitos })
const comFontes = (atm, fontes) => normalizarAtmosfera({ ...atm, luz: { ...atm.luz, fontes } })

export const adicionarEfeito = (atm, novo) => comEfeitos(atm, [...atm.efeitos, { intensidade: 0.6, ...novo, id: undefined }])
export const atualizarEfeito = (atm, id, patch) => comEfeitos(atm, atm.efeitos.map(e => (e.id === id ? { ...e, ...patch, id } : e)))
export const removerEfeito = (atm, id) => comEfeitos(atm, atm.efeitos.filter(e => e.id !== id))

export const adicionarFonte = (atm, nova) => comFontes(atm, [...atm.luz.fontes, { ...nova, id: undefined }])
export const atualizarFonte = (atm, id, patch) => comFontes(atm, atm.luz.fontes.map(f => (f.id === id ? { ...f, ...patch, id } : f)))
export const removerFonte = (atm, id) => comFontes(atm, atm.luz.fontes.filter(f => f.id !== id))

export const definirLuz = (atm, { escuridao, cor }) =>
  normalizarAtmosfera({ ...atm, luz: { ...atm.luz, escuridao: escuridao ?? atm.luz.escuridao, cor: cor ?? atm.luz.cor } })

/** Cena pronta: troca efeitos de cena inteira, escuridão/cor e sons; mantém efeitos locais e fontes. */
export function aplicarCena(atm, cena) {
  const c = normalizarAtmosfera(cena?.atmosfera ?? cena)
  return normalizarAtmosfera({
    ...atm,
    efeitos: [...atm.efeitos.filter(ehLocal), ...c.efeitos.filter(e => !ehLocal(e)).map(e => ({ ...e, id: undefined }))],
    luz: { ...atm.luz, escuridao: c.luz.escuridao, cor: c.luz.cor },
    sons: c.sons,
  })
}

/** Tira o que `aplicarCena` põe. */
export const limparCena = atm =>
  normalizarAtmosfera({ ...atm, efeitos: atm.efeitos.filter(ehLocal), luz: { ...atm.luz, escuridao: 0, cor: COR_ESCURIDAO }, sons: [] })

/**
 * Coloca (ou move) algo no ponto do mapa. `unidade` = quanto vale um quadrado da grade
 * (os raios são guardados na unidade da grade; 2 quadrados = 2 × unidade).
 */
export function colocarNoMapa(atm, pedido, ponto, unidade = 1) {
  const { x, y } = ponto
  if (pedido?.oQue === 'efeito') {
    if (!TIPOS_ATMOSFERA[pedido.tipo] || TIPOS_ATMOSFERA[pedido.tipo].soCena) return atm
    return adicionarEfeito(atm, { tipo: pedido.tipo, x, y, raio: 2 * unidade })
  }
  if (pedido?.oQue === 'luz') return adicionarFonte(atm, { x, y, raio: 4 * unidade, cor: COR_LUZ, tremula: true })
  if (pedido?.oQue === 'mover') {
    if (atm.efeitos.some(e => e.id === pedido.id)) {
      return atualizarEfeito(atm, pedido.id, { x, y, raio: atm.efeitos.find(e => e.id === pedido.id).raio ?? 2 * unidade })
    }
    return atualizarFonte(atm, pedido.id, { x, y })
  }
  return atm
}

/** F61.B — alças arrastáveis: efeitos presos a um ponto e fontes de luz (raioPx já na escala do mapa). */
export function alcasDaAtmosfera(atm, grade) {
  const efeitos = atm.efeitos.filter(ehLocal).map(e => ({
    chave: `efeito:${e.id}`, tipo: 'efeito', id: e.id, x: e.x, y: e.y,
    raioPx: raioParaPx(e.raio, grade), nome: TIPOS_ATMOSFERA[e.tipo].nome, cor: e.cor || TIPOS_ATMOSFERA[e.tipo].cor,
  }))
  const fontes = atm.luz.fontes.map(f => ({
    chave: `fonte:${f.id}`, tipo: 'fonte', id: f.id, x: f.x, y: f.y,
    raioPx: raioParaPx(f.raio, grade), nome: 'Fonte de luz', cor: f.cor,
  }))
  return [...efeitos, ...fontes]
}

/** Volume (0–1) de cada laço de som: o maior entre os efeitos que o usam; extras entram com 0,6. */
export function volumesDaAtmosfera(atm) {
  if (atm.som === false) return {}
  const v = {}
  for (const e of atm.efeitos) {
    const s = TIPOS_ATMOSFERA[e.tipo]?.som
    if (s) v[s] = Math.max(v[s] || 0, e.intensidade)
  }
  for (const s of atm.sons) v[s] = Math.max(v[s] || 0, 0.6)
  return v
}

// ── Motor de partículas ─────────────────────────────────────────────────────
// regiao = { x, y, w, h } (cena inteira, px da tela) ou { cx, cy, r } (local, px do mapa).
// As partículas vivem em coordenadas da CAIXA da região (0..w, 0..h); quem desenha posiciona a caixa.

export const dimensoes = regiao => (regiao.r !== undefined ? { w: regiao.r * 2, h: regiao.r * 2 } : { w: regiao.w, h: regiao.h })

const DOS_AMBIENTE = ['brasas', 'neve', 'runas']
// partículas por 100 000 px² de região, a intensidade 1 / máximo por efeito
const POR_100K = { fogo: 40, brasas: 6, cinzas: 10, chuva: 14, neve: 10, areia: 25, vagalumes: 3, bolhas: 5, runas: 4 }
const MAX_POR_EFEITO = { fogo: 200, chuva: 220 }

export function tetoParticulas(densidade) {
  if (!(densidade > 0)) return 0
  const fraco = typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4
  return densidade <= 0.5 || fraco ? 350 : 700
}

/** Quantas partículas um efeito pede (antes do teto global). `area` em px². */
export function quantasParticulas(tipo, intensidade, area, densidade) {
  if (!(densidade > 0)) return 0
  if (tipo === 'neblina') return Math.round((10 + 8 * intensidade) * Math.min(1, densidade + 0.5))
  const taxa = POR_100K[tipo]
  if (!taxa) return 0
  const n = Math.round((taxa * area / 1e5) * intensidade * densidade)
  // fogueira pequena (efeito local) não pode ficar rala: o fogo tem um piso próprio
  const piso = tipo === 'fogo' ? Math.round(45 * intensidade * densidade) : 1
  return Math.min(MAX_POR_EFEITO[tipo] || 120, Math.max(1, piso, n))
}

const acaso = (min, max, rnd) => min + rnd() * (max - min)

export function nascer(tipo, regiao, rnd = Math.random, espalhada = false) {
  const { w, h } = dimensoes(regiao)
  const local = regiao.r !== undefined
  if (DOS_AMBIENTE.includes(tipo)) return nascerFundo(tipo, w, h, rnd, espalhada)
  const p = { x: acaso(0, w, rnd), y: acaso(0, h, rnd), vx: 0, vy: 0, t: 0, vida: Infinity, tam: 1, fase: acaso(0, Math.PI * 2, rnd), cor: 0, giro: 0 }
  switch (tipo) {
    case 'fogo': {
      p.vida = acaso(0.6, 1.2, rnd); p.tam = acaso(6, 18, rnd)
      if (local) {
        const ang = acaso(0, Math.PI * 2, rnd), d = regiao.r * 0.7 * rnd() ** 1.5 // mais denso no centro
        p.x = regiao.r + Math.cos(ang) * d; p.y = regiao.r + Math.sin(ang) * d * 0.6 + regiao.r * 0.3
        p.vy = -(regiao.r / p.vida) * acaso(0.5, 0.9, rnd) // sobe até ~1 raio
      } else {
        p.y = h - acaso(0, h * 0.12, rnd); p.vy = -acaso(70, 180, rnd)
      }
      p.vx = acaso(-12, 12, rnd)
      if (espalhada) p.t = acaso(0, p.vida, rnd)
      break
    }
    case 'cinzas':
      p.y = espalhada ? p.y : -acaso(0, 20, rnd); p.vy = acaso(14, 36, rnd); p.vx = acaso(-10, 10, rnd); p.tam = acaso(1, 3, rnd)
      break
    case 'chuva':
      p.y = espalhada ? p.y : -acaso(0, 40, rnd); p.vy = acaso(700, 1100, rnd); p.vx = -p.vy * 0.2; p.tam = acaso(10, 22, rnd)
      break
    case 'areia':
      p.x = espalhada ? p.x : -acaso(0, 40, rnd); p.vx = acaso(250, 450, rnd); p.vy = acaso(-8, 30, rnd); p.tam = acaso(0.8, 1.8, rnd)
      break
    case 'vagalumes':
      p.vx = acaso(-14, 14, rnd); p.vy = acaso(-14, 14, rnd); p.tam = acaso(1.5, 3, rnd); p.vida = acaso(6, 12, rnd)
      break
    case 'bolhas':
      p.y = espalhada ? p.y : h + acaso(0, 20, rnd); p.vy = -acaso(18, 44, rnd); p.tam = acaso(3, 9, rnd)
      break
    case 'neblina': {
      const base = local ? regiao.r : Math.min(w, h) / 2
      p.tam = acaso(0.5, 1, rnd) * Math.max(80, base * 0.8); p.vx = acaso(-9, 9, rnd); p.vy = acaso(-4, 4, rnd)
      p.fase = rnd() // aqui "fase" = sorteio do alfa (0–1)
      break
    }
    default: break
  }
  return p
}

/** Avança `dt` s. false = a partícula saiu/morreu e deve renascer. */
export function mover(p, tipo, dt, regiao) {
  const { w, h } = dimensoes(regiao)
  if (DOS_AMBIENTE.includes(tipo)) return moverFundo(p, tipo, dt, w, h)
  p.t += dt
  p.x += p.vx * dt
  p.y += p.vy * dt
  if (tipo === 'vagalumes') { p.vx += Math.sin(p.t * 1.3 + p.fase) * 20 * dt; p.vy += Math.cos(p.t * 1.1 + p.fase) * 20 * dt }
  if (tipo === 'bolhas') p.x += Math.sin(p.t * 2 + p.fase) * 12 * dt
  if (tipo === 'cinzas') p.x += Math.sin(p.t * 0.9 + p.fase) * 6 * dt
  if (p.t > p.vida) return false
  const m = tipo === 'neblina' ? p.tam : 30
  return p.x > -m && p.x < w + m && p.y > -m && p.y < h + m
}

/** Opacidade (0–1) da partícula ao longo da vida. */
export function opacidade(p, tipo, regiao) {
  if (DOS_AMBIENTE.includes(tipo)) return brilho(p, tipo, dimensoes(regiao).h)
  const k = Number.isFinite(p.vida) ? p.t / p.vida : 0
  const nasce = Math.min(1, p.t / 0.4)
  switch (tipo) {
    case 'fogo': return Math.min(1, p.t / 0.1) * (1 - k * k) * 0.85
    case 'vagalumes': return nasce * Math.min(1, (p.vida - p.t) / 1) * (0.5 + 0.5 * Math.sin(p.t * 3 + p.fase * 3))
    case 'neblina': return 0.12 + 0.18 * p.fase // ainda é multiplicada pela intensidade ao desenhar
    case 'chuva': return 0.35
    default: return nasce
  }
}

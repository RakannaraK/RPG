/**
 * Fase 24.4 — Estados com gatilhos (função PURA).
 * Não acessa banco nem React.
 *
 * Um estado é um contador central do sistema (ex: Fome 0-5, Sanidade 0-10) com
 * EFEITOS POR FAIXA de valor. NÃO é um segundo mecanismo de efeitos: este módulo
 * só SELECIONA (faixas, mesma semântica da F19.4) os modificadores da faixa
 * ativa — a aplicação passa pelo pipeline F12/18 normal (calcularValoresFinais).
 *
 * config_layout.estados = [{
 *   id, nome, min, max, inicial, destaque, feed,
 *   efeitos_por_faixa: [{ de, ate, modificadores: [...F12], aviso, bloqueios: [..] }],
 *   alimenta_dados_especiais,   -- F23: qtd de dados especiais = valor deste estado
 * }]
 */

/** Valor efetivo do estado (linha ausente = inicial), preso a [min, max]. */
export function clampEstado(valor, cfg = {}) {
  const min = Number(cfg.min ?? 0)
  const max = Number(cfg.max ?? 10)
  const v = Number(valor ?? cfg.inicial ?? min)
  return Math.max(min, Math.min(max, Math.floor(Number.isFinite(v) ? v : min)))
}

/** Faixa de efeito cobrindo o valor (extremos abertos: de/ate null). null se nenhuma. */
export function faixaAtivaDoEstado(cfg = {}, valor) {
  const v = Number(valor) || 0
  for (const f of cfg.efeitos_por_faixa || []) {
    const de = f.de == null || f.de === '' ? -Infinity : Number(f.de)
    const ate = f.ate == null || f.ate === '' ? Infinity : Number(f.ate)
    if (v >= de && v <= ate) return f
  }
  return null
}

/**
 * Modificadores das faixas ativas de TODOS os estados, carimbados com `_fonte`
 * (nome do estado) — entram no MESMO pipeline dos demais (F12/18).
 * @param {Array} estados — config_layout.estados
 * @param {Record<string, number>} valores — { [estado_id]: valor }
 */
export function modificadoresDeEstados(estados = [], valores = {}) {
  const out = []
  for (const cfg of estados) {
    const v = clampEstado(valores[cfg.id], cfg)
    const faixa = faixaAtivaDoEstado(cfg, v)
    for (const m of faixa?.modificadores || []) {
      out.push({ ...m, _fonte: cfg.nome || 'Estado', _estadoId: cfg.id })
    }
  }
  return out
}

/** Avisos das faixas ativas (chips destacados). [{ estadoId, nome, aviso }] */
export function avisosDeEstados(estados = [], valores = {}) {
  const out = []
  for (const cfg of estados) {
    const faixa = faixaAtivaDoEstado(cfg, clampEstado(valores[cfg.id], cfg))
    if (faixa?.aviso) out.push({ estadoId: cfg.id, nome: cfg.nome, aviso: faixa.aviso })
  }
  return out
}

/** Bloqueios informativos ativos (a mesa arbitra). [{ estadoId, nome, bloqueio }] */
export function bloqueiosDeEstados(estados = [], valores = {}) {
  const out = []
  for (const cfg of estados) {
    const faixa = faixaAtivaDoEstado(cfg, clampEstado(valores[cfg.id], cfg))
    for (const b of faixa?.bloqueios || []) {
      out.push({ estadoId: cfg.id, nome: cfg.nome, bloqueio: b })
    }
  }
  return out
}

/**
 * Mapa { id: valor, nome: valor } p/ o contexto de fórmula (estado(x) na F17)
 * e p/ a integração com os dados especiais da F23.
 */
export function mapaEstados(estados = [], valores = {}) {
  const m = {}
  for (const cfg of estados) {
    const v = clampEstado(valores[cfg.id], cfg)
    m[cfg.id] = v
    if (cfg.nome) m[cfg.nome] = v
  }
  return m
}

/** F23 — quantidade de dados especiais vinda de um estado (alimenta_dados_especiais). */
export function especiaisDeEstados(estados = [], valores = {}) {
  const cfg = (estados || []).find(e => e.alimenta_dados_especiais)
  if (!cfg) return null
  return clampEstado(valores[cfg.id], cfg)
}

/** Calor da faixa p/ a cor do contador (0 = mínimo … 1 = máximo). */
export function calorDoEstado(cfg = {}, valor) {
  const min = Number(cfg.min ?? 0)
  const max = Number(cfg.max ?? 10)
  if (max <= min) return 0
  return Math.max(0, Math.min(1, (clampEstado(valor, cfg) - min) / (max - min)))
}

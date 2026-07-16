/**
 * Fase 24.1 — Motor de TRILHAS (função PURA).
 * Não acessa banco nem React.
 *
 * Uma trilha é uma linha de N caixinhas; cada uma está vazia (null) ou marcada
 * com um TIPO (id de config.tipos_marca, cada um com `severidade`). Uma marca
 * mais severa sobrescreve uma menos severa, nunca o contrário.
 *
 * FONTE DE VERDADE: `marcas` é o array por caixinha, na ORDEM DE MARCAÇÃO
 * (marcas contíguas no início, vazias no fim — curar compacta). A ordenação
 * "severas à esquerda" é função de EXIBIÇÃO (ordenarExibicao), nunca mutação.
 *
 * CONTRATO DE MARCAÇÃO (os exemplos da spec são testes literais):
 *  1. Marcar T preenche a primeira caixinha vazia.
 *  2. Sem vazia + transbordo 'converter': a caixinha com o tipo MENOS severo
 *     mais antigo converte para o tipo imediatamente mais severo
 *     (evento 'transbordo_convertido'); todas já no mais severo → evento
 *     'encheu_do_maior' (nada muda).
 *  3. Marcar tipo mais severo sem vazia: sobrescreve a menos severa mais antiga.
 *  4. Curar T remove a marca T mais RECENTE daquele tipo.
 *  5. 'encheu_do_maior' também dispara no momento em que a trilha FICA toda do
 *     tipo mais severo (é aí que "Incapacitado" entra).
 */

const vazia = v => v == null

function mapaSeveridade(config) {
  const m = {}
  for (const t of config?.tipos_marca || []) m[t.id] = Number(t.severidade) || 0
  return m
}

/** O tipo mais severo da config (maior severidade). */
export function tipoMaisSevero(config) {
  let melhor = null
  for (const t of config?.tipos_marca || []) {
    if (!melhor || (Number(t.severidade) || 0) > (Number(melhor.severidade) || 0)) melhor = t
  }
  return melhor?.id || null
}

/** O tipo imediatamente mais severo que `tipoId` (null se já é o topo). */
function proximoTipo(tipoId, config) {
  const sev = mapaSeveridade(config)
  const atual = sev[tipoId] ?? 0
  let melhor = null
  for (const t of config?.tipos_marca || []) {
    const s = Number(t.severidade) || 0
    if (s > atual && (melhor == null || s < melhor.s)) melhor = { id: t.id, s }
  }
  return melhor ? melhor.id : null
}

/** Índice da marca mais antiga entre as de MENOR severidade presente. -1 se vazio. */
function idxMenosSeveraMaisAntiga(marcas, sev) {
  let menor = Infinity
  for (const m of marcas) if (!vazia(m)) menor = Math.min(menor, sev[m] ?? 0)
  if (menor === Infinity) return -1
  return marcas.findIndex(m => !vazia(m) && (sev[m] ?? 0) === menor)
}

const todasDoMaior = (marcas, topo) =>
  marcas.length > 0 && topo != null && marcas.every(m => m === topo)

/**
 * Aplica UMA marcação do tipo dado.
 * @returns {{ marcas: Array, eventos: string[] }}
 *   eventos: 'transbordo_convertido' | 'encheu_do_maior'
 */
export function marcar(marcas = [], tipoId, config = {}) {
  const out = [...marcas]
  const eventos = []
  const sev = mapaSeveridade(config)
  const topo = tipoMaisSevero(config)

  // Já toda no tipo mais severo: nada a marcar — só o aviso (regra 2, fim).
  if (todasDoMaior(out, topo)) return { marcas: out, eventos: ['encheu_do_maior'] }

  const iVazia = out.findIndex(vazia)
  if (iVazia !== -1) {
    // Regra 1 — primeira vazia
    out[iVazia] = tipoId
  } else {
    const sevT = sev[tipoId] ?? 0
    const iAlvo = idxMenosSeveraMaisAntiga(out, sev)
    const sevAlvo = iAlvo === -1 ? Infinity : (sev[out[iAlvo]] ?? 0)
    if (sevAlvo < sevT) {
      // Regra 3 — o tipo mais severo sobrescreve a menos severa mais antiga
      out[iAlvo] = tipoId
    } else if ((config.regra_transbordo || 'converter') === 'converter') {
      // Regra 2 — converte a menos severa mais antiga um passo acima
      const prox = proximoTipo(out[iAlvo], config)
      if (prox) {
        out[iAlvo] = prox
        eventos.push('transbordo_convertido')
      }
    }
    // 'ignorar' → não marca além do cheio (no-op silencioso)
  }

  // Regra 5 — acabou de encher do maior (é aqui que "Incapacitado" dispara)
  if (todasDoMaior(out, topo)) eventos.push('encheu_do_maior')
  return { marcas: out, eventos }
}

/**
 * Cura (remove) a marca mais RECENTE do tipo dado e compacta (marcas contíguas
 * no início, ordem de marcação preservada). Tipo ausente = no-op.
 * @returns {{ marcas: Array, curada: boolean }}
 */
export function curar(marcas = [], tipoId) {
  const out = [...marcas]
  let i = -1
  for (let k = out.length - 1; k >= 0; k--) {
    if (out[k] === tipoId) { i = k; break }
  }
  if (i === -1) return { marcas: out, curada: false }
  out.splice(i, 1)
  out.push(null)
  return { marcas: out, curada: true }
}

/**
 * Redimensiona a trilha quando o tamanho por fórmula muda (level-up):
 * cresce acrescentando vazias; encolhe removendo vazias primeiro (do fim) e
 * depois as MENOS severas (mais recentes primeiro). Nunca silencioso:
 * `removidas` lista os tipos das marcas perdidas para o chamador avisar.
 * @returns {{ marcas: Array, removidas: string[] }}
 */
export function redimensionar(marcas = [], novoTamanho, config = {}) {
  const n = Math.max(0, Math.floor(Number(novoTamanho) || 0))
  const out = [...marcas]
  const removidas = []
  const sev = mapaSeveridade(config)

  while (out.length < n) out.push(null)
  while (out.length > n) {
    let i = -1
    for (let k = out.length - 1; k >= 0; k--) if (vazia(out[k])) { i = k; break }
    if (i === -1) {
      let menor = Infinity
      for (const m of out) menor = Math.min(menor, sev[m] ?? 0)
      for (let k = out.length - 1; k >= 0; k--) {
        if ((sev[out[k]] ?? 0) === menor) { i = k; break }
      }
      removidas.push(out[i])
    }
    out.splice(i, 1)
  }
  return { marcas: out, removidas }
}

/**
 * Ordena para EXIBIÇÃO: severas à esquerda, depois menos severas, vazias no fim
 * (padrão V5). Estável — mesma severidade mantém a ordem de marcação. Nunca
 * altera a contagem nem o array armazenado. `ordem_marcada_primeiro: false`
 * devolve a ordem crua de marcação.
 */
export function ordenarExibicao(marcas = [], config = {}) {
  if (config.ordem_marcada_primeiro === false) return [...marcas]
  const sev = mapaSeveridade(config)
  const marcadas = marcas.filter(m => !vazia(m)).sort((a, b) => (sev[b] ?? 0) - (sev[a] ?? 0))
  const vazias = marcas.filter(vazia)
  return [...marcadas, ...vazias]
}

/**
 * Fase 24.2 — recuperação por descanso (integra F15). A config da trilha tem
 * `recuperacao = { "<descanso_id>": { "<tipo_id>": { modo: 'nada'|'total'|'fixo', valor } } }`.
 * 'total' cura todas as marcas do tipo; 'fixo' cura até `valor` (mais recentes
 * primeiro, mesma regra do curar). Sem regra p/ o descanso = no-op.
 * @returns {{ marcas: Array, curadas: Record<string, number> }}
 */
export function recuperarTrilha(marcas = [], config = {}, descansoId) {
  const regras = config?.recuperacao?.[descansoId]
  if (!regras) return { marcas: [...marcas], curadas: {} }
  let out = [...marcas]
  const curadas = {}
  for (const [tipoId, regra] of Object.entries(regras)) {
    const modo = regra?.modo || 'nada'
    if (modo === 'nada') continue
    const alvo = modo === 'total'
      ? out.filter(m => m === tipoId).length
      : Math.max(0, Math.floor(Number(regra?.valor) || 0))
    for (let i = 0; i < alvo; i++) {
      const r = curar(out, tipoId)
      if (!r.curada) break
      out = r.marcas
      curadas[tipoId] = (curadas[tipoId] || 0) + 1
    }
  }
  return { marcas: out, curadas }
}

/** Contagem por tipo + vazias (para "5/10" e chips). */
export function contarMarcas(marcas = []) {
  const porTipo = {}
  let livres = 0
  for (const m of marcas) {
    if (vazia(m)) livres++
    else porTipo[m] = (porTipo[m] || 0) + 1
  }
  return { porTipo, livres, total: marcas.length, marcadas: marcas.length - livres }
}

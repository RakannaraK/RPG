/**
 * Fase 23.1 — Motor de RESOLUÇÃO de rolagem (função PURA).
 * Não acessa banco nem React. RNG injetável (para testes determinísticos).
 *
 * O sistema define COMO uma rolagem se resolve. Quatro modos:
 *   soma       — rola, soma, compara (o de sempre — delega ao pipeline F7/18).
 *   sucessos   — parada de dados; conta dados ≥ dificuldade (WoD/V5).
 *   roll_under — sucesso se rolar ≤ alvo, com qualidades (Call of Cthulhu).
 *   faixas     — soma e cai numa faixa com rótulo/texto (PbtA).
 *
 * Transversais: explosão (limite de 20 por dado), dados especiais (marcações).
 *
 * Contrato: os exemplos canônicos da spec são testes LITERAIS. Divergir do
 * contrato = implementação errada. `dados` são os resultados JÁ rolados (a
 * camada F7 rola); o RNG só é usado para EXPANDIR explosões.
 */
import { rolarDados } from './dice.js'

const LIMITE_EXPLOSAO = 20 // trava de segurança: nunca vira loop infinito

/** Rolador de 1 dado. Injetável nos testes; default = RNG real da F7. */
function rolador(rolarDado) {
  return typeof rolarDado === 'function' ? rolarDado : (faces => rolarDados(1, faces)[0])
}

const soma = arr => arr.reduce((s, d) => s + (Number(d.valor) || 0), 0)

/**
 * Monta a parada de dados como objetos { valor, especial, explosao }.
 * Os dados em `especiais_idx` (índices na parada ORIGINAL) são marcados como
 * especiais (Dados de Fome). Explosões, quando ativas, são acrescentadas logo
 * após o dado que estourou e nunca são especiais.
 */
function montarParada(dados, faces, especiaisIdx, explodir, roll) {
  const idx = new Set(especiaisIdx || [])
  const out = []
  ;(dados || []).forEach((v, i) => {
    out.push({ valor: Number(v) || 0, especial: idx.has(i), explosao: false })
    if (explodir && Number(v) === faces) {
      let atual = Number(v)
      let n = 0
      while (atual === faces && n < LIMITE_EXPLOSAO) {
        atual = roll(faces)
        out.push({ valor: atual, especial: false, explosao: true })
        n++
      }
    }
  })
  return out
}

/** Marcação configurada para um evento com dado especial (23.5). null se não houver. */
function acharMarcacao(config, evento) {
  const lista = config?.dados_especiais?.marcacoes || []
  const m = lista.find(x => x?.evento === evento)
  return m ? { evento, rotulo: m.rotulo || '', texto: m.texto || '', cor: m.cor || null } : null
}

// ─────────────────────────────────────────────────────────── sucessos
function resolverSucessos(config, parada, dificuldade) {
  const faces = Number(config.dado) || 10
  const dif = Number(dificuldade ?? config.dificuldade_padrao ?? 6)

  let base = 0
  let maxCount = 0
  let uns = 0
  const dadosOut = parada.map(d => {
    let conta = 0
    if (d.valor >= dif) conta = (config.max_conta_dobrado && d.valor === faces) ? 2 : 1
    if (d.valor === faces) maxCount++
    if (d.valor === 1) uns++
    base += conta
    return { ...d, conta, sucesso: conta > 0 }
  })

  const pares = config.par_de_max_critico ? Math.floor(maxCount / 2) : 0
  const parBonus = pares * 2
  const critico = pares >= 1
  const anulados = config.um_anula_sucesso ? uns : 0
  const sucessos = Math.max(0, base + parBonus - anulados)
  const botch = !!config.botch && sucessos === 0 && uns >= 1

  // Marcações dos dados especiais (23.5): crítico envolvendo especial no máximo;
  // falha/botch com 1 num especial. Estrutura genérica; rótulos são do mestre.
  let marcacao = null
  const especialNoMax = dadosOut.some(d => d.especial && d.valor === faces)
  const especialNoUm = dadosOut.some(d => d.especial && d.valor === 1)
  if (critico && especialNoMax) marcacao = acharMarcacao(config, 'critico_com_especial')
  else if ((botch || sucessos === 0) && especialNoUm) marcacao = acharMarcacao(config, 'falha_com_especial')

  return {
    modo: 'sucessos',
    sucessos, critico, botch,
    dificuldade: dif,
    dados: dadosOut,
    detalhe: { base, pares, parBonus, anulados, maxCount, uns },
    ...(marcacao ? { marcacao } : {}),
  }
}

// ─────────────────────────────────────────────────────────── roll_under
/**
 * Limiar de desastre para o alvo. Liberdade ao criador: `desastre_faixas` é uma
 * tabela de degraus por faixa de alvo (ex CoC: alvo ≤ 49 → 96; senão → 100).
 * A primeira faixa cujo `ate_alvo` cobre o alvo vence (ate_alvo null = pega tudo).
 * Sem tabela, usa `desastre_em` (número; default 100).
 */
function limiarDesastre(config, alvo) {
  const faixas = config.desastre_faixas
  if (Array.isArray(faixas) && faixas.length) {
    const ordenadas = [...faixas].sort((a, b) => {
      const av = a.ate_alvo == null || a.ate_alvo === '' ? Infinity : Number(a.ate_alvo)
      const bv = b.ate_alvo == null || b.ate_alvo === '' ? Infinity : Number(b.ate_alvo)
      return av - bv
    })
    for (const f of ordenadas) {
      const ate = f.ate_alvo == null || f.ate_alvo === '' ? Infinity : Number(f.ate_alvo)
      if (alvo <= ate) return Number(f.desastre_em ?? 100)
    }
  }
  return Number(config.desastre_em ?? 100)
}

function resolverRollUnder(config, parada, alvoRaw) {
  const valor = parada.length ? parada[0].valor : 0
  const alvo = Math.max(0, Math.floor(Number(alvoRaw) || 0))
  const sucesso = valor <= alvo
  const critico = valor <= Number(config.critico_em ?? 1)
  const desastre = valor >= limiarDesastre(config, alvo)

  let qualidade = null
  if (config.faixas_qualidade && sucesso) {
    if (valor <= Math.floor(alvo / 5)) qualidade = 'extremo'
    else if (valor <= Math.floor(alvo / 2)) qualidade = 'bom'
    else qualidade = 'normal'
  }

  return { modo: 'roll_under', valor, alvo, sucesso, qualidade, critico, desastre }
}

// ─────────────────────────────────────────────────────────── faixas
/** Faixa cobrindo o total; entre as que cobrem, vence a de maior `de`
 *  (deixa o tier "opcional" mais alto — ex: 12+ — ganhar de 10+). */
function acharFaixa(faixas, total) {
  let escolhida = null
  let melhorDe = -Infinity
  for (const f of faixas || []) {
    const de = (f.de == null || f.de === '') ? -Infinity : Number(f.de)
    const ate = (f.ate == null || f.ate === '') ? Infinity : Number(f.ate)
    if (total >= de && total <= ate && de >= melhorDe) { melhorDe = de; escolhida = f }
  }
  return escolhida
}

function resolverFaixas(config, parada, modificador) {
  const total = soma(parada) + (Number(modificador) || 0)
  const f = acharFaixa(config.faixas, total)
  return {
    modo: 'faixas',
    total,
    faixa: f ? { rotulo: f.rotulo || '', texto: f.texto || '', cor: f.cor || null, opcional: !!f.opcional } : null,
    dados: parada,
  }
}

// ─────────────────────────────────────────────────────────── soma
function resolverSoma(parada, modificador) {
  return { modo: 'soma', total: soma(parada) + (Number(modificador) || 0), dados: parada }
}

/**
 * Resolve uma rolagem conforme o modo do sistema.
 * @param {object} p
 *   config         — config_layout.resolucao (o modo e seus campos)
 *   dados          — resultados brutos já rolados (array de números); no
 *                    roll_under, dados[0] é o d100
 *   dificuldade    — sobrescreve: dif (sucessos) / alvo (roll_under) / modificador (soma, faixas)
 *   especiais_idx  — índices (na parada original) dos dados especiais
 *   rolarDado      — (faces)=>int; injeção do RNG só para explosão
 * @returns resultado estruturado do modo (contratos da spec)
 */
export function resolverRolagem({ config = {}, dados = [], dificuldade, especiais_idx = [], rolarDado } = {}) {
  const modo = config.modo || 'soma'
  const faces = Number(config.dado) || 10
  const explodir = !!config.explosao?.ativo && modo !== 'roll_under' // d100 sob alvo não explode
  const parada = montarParada(dados, faces, especiais_idx, explodir, rolador(rolarDado))

  switch (modo) {
    case 'sucessos':   return resolverSucessos(config, parada, dificuldade)
    case 'roll_under': return resolverRollUnder(config, parada, dificuldade)
    case 'faixas':     return resolverFaixas(config, parada, dificuldade)
    default:           return resolverSoma(parada, dificuldade)
  }
}

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/**
 * Descrição do resultado para o feed (23.3). PURA. Recebe o resultado_estruturado
 * (tem `.modo`). soma → null (o feed usa o total normal). Devolve { texto, cor,
 * textoFaixa?, marcacao? } — os rótulos/textos que aparecem na mesa.
 */
export function descreverResultado(res) {
  if (!res || !res.modo || res.modo === 'soma') return null

  if (res.modo === 'sucessos') {
    const n = res.sucessos || 0
    const sufixo = res.critico ? ' — crítico!' : res.botch ? ' — botch!' : ''
    const cor = res.critico ? 'verde' : res.botch ? 'vermelho' : n > 0 ? 'verde' : 'roxo'
    return { texto: `${n} sucesso${n === 1 ? '' : 's'}${sufixo}`, cor, marcacao: res.marcacao || null }
  }
  if (res.modo === 'roll_under') {
    const q = res.critico ? 'Crítico'
      : res.desastre ? 'Desastre'
      : res.sucesso ? (res.qualidade ? cap(res.qualidade) : 'Sucesso')
      : 'Falha'
    const cor = res.critico ? 'verde' : res.desastre ? 'vermelho' : res.sucesso ? 'verde' : 'vermelho'
    return { texto: `${res.valor} vs ${res.alvo} — ${q}`, cor }
  }
  if (res.modo === 'faixas') {
    const f = res.faixa
    return { texto: `${f?.rotulo || '—'} (${res.total})`, cor: f?.cor || 'roxo', textoFaixa: f?.texto || '' }
  }
  return null
}

/**
 * Percentuais (F18) só fazem sentido matemático onde há um TOTAL numérico: soma e
 * faixas. Em sucessos/roll_under o resultado é contagem/comparação — um bônus %
 * não teria efeito. O editor usa isto para esconder/avisar (23.2/23.6).
 */
export function percentuaisAplicaveis(modo) {
  return modo === 'soma' || modo === 'faixas' || modo == null
}

/**
 * Vantagem/desvantagem POR MODO (23.6). Convenções documentadas, não improvisadas:
 *   soma/faixas → 'notacao' (vira 2dNkh1/kl1, como hoje)
 *   sucessos    → '±2 dados' na parada
 *   roll_under  → 'duas rolagens' (pega melhor/pior)
 */
export function estiloVantagem(modo) {
  if (modo === 'sucessos') return 'dados'
  if (modo === 'roll_under') return 'duas_rolagens'
  return 'notacao'
}

/**
 * Validação da config de resolução para o editor (23.2). Retorna erros (impedem)
 * e avisos (informam). Não bloqueia sobreposição de faixas: o tier "opcional" (12+
 * sobre 10+) é intencional — vence a de maior `de`.
 */
export function validarResolucao(config = {}) {
  const erros = []
  const avisos = []
  const modo = config.modo || 'soma'

  if (modo === 'sucessos') {
    if ((Number(config.dado) || 0) < 2) erros.push('O dado da parada precisa ter ao menos 2 lados.')
    if ((Number(config.dificuldade_padrao) || 0) < 1) erros.push('A dificuldade padrão precisa ser ao menos 1.')
  } else if (modo === 'roll_under') {
    if ((Number(config.dado) || 0) < 2) erros.push('O dado precisa ter ao menos 2 lados.')
  } else if (modo === 'faixas') {
    const fs = config.faixas || []
    if (fs.length === 0) erros.push('Defina ao menos uma faixa de resultado.')
    fs.forEach((f, i) => {
      if (!String(f.rotulo || '').trim()) erros.push(`Faixa ${i + 1}: dê um rótulo.`)
      const de = f.de == null || f.de === '' ? -Infinity : Number(f.de)
      const ate = f.ate == null || f.ate === '' ? Infinity : Number(f.ate)
      if (Number.isFinite(ate) && Number.isFinite(de) && ate < de) erros.push(`Faixa ${i + 1}: "até" menor que "de".`)
    })
  }

  if (!percentuaisAplicaveis(modo)) {
    avisos.push('Modificadores percentuais (F18) não se aplicam neste modo — o resultado é contagem/comparação, não um total.')
  }

  return { valido: erros.length === 0, erros, avisos }
}

/**
 * Re-resolve após uma rerolagem parcial (23.4): troca os dados nos índices dados
 * pelos novos e reaplica o contrato inteiro (sucessos recontados, faixa remapeada).
 * @param {object} paramsOriginais — os mesmos passados a resolverRolagem
 * @param {number[]} indicesRerolados — índices na parada original a substituir
 * @param {number[]} novosDados — novos valores, na ordem de indicesRerolados
 */
export function reresolver(paramsOriginais, indicesRerolados = [], novosDados = []) {
  const dados = [...(paramsOriginais.dados || [])]
  indicesRerolados.forEach((idx, k) => {
    if (idx >= 0 && idx < dados.length) dados[idx] = novosDados[k]
  })
  return resolverRolagem({ ...paramsOriginais, dados })
}

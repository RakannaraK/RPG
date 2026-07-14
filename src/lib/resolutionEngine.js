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
function resolverRollUnder(config, parada, alvoRaw) {
  const valor = parada.length ? parada[0].valor : 0
  const alvo = Math.max(0, Math.floor(Number(alvoRaw) || 0))
  const sucesso = valor <= alvo
  const critico = valor <= Number(config.critico_em ?? 1)
  const desastre = valor >= Number(config.desastre_em ?? 100)

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

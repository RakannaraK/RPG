/**
 * Fase 17 — Motor de Fórmulas (função PURA e SEGURA).
 *
 * Avalia expressões como "10 + mod(destreza) + mod(constituicao)" contra um
 * contexto de valores da ficha. NUNCA usa eval/Function — parser recursivo
 * descendente próprio. Não importa Supabase nem React.
 *
 * Gramática (contrato — não mudar sem registrar na spec):
 *   números (int/decimal), + - * / ( ) com precedência padrão
 *   variáveis-função (arg = nome/id bruto): atributo(x) mod(x) pericia(x) recurso(x)
 *     nivel(classe)[F19: nível na classe, 0 se ausente] · reservadas: pool(x)[F20] maestria(x)[F21]
 *   variáveis simples: nivel, proficiencia[F19], vida_atual, vida_max, x (só na fórmula de modificador)
 *   funções matemáticas: piso teto arredondar abs (1 arg) · min max (2 args)
 *   case-insensitive; nomes resolvidos por id OU nome normalizado (sem acento, minúsculo)
 */

export class FormulaError extends Error {
  constructor(message, pos) {
    super(message)
    this.name = 'FormulaError'
    this.pos = pos
  }
}

const NAME_FUNCS = new Set(['atributo', 'mod', 'pericia', 'recurso', 'nivel', 'pool', 'maestria'])
const MATH_FUNCS = { piso: 1, teto: 1, arredondar: 1, abs: 1, min: 2, max: 2 }
// Variáveis simples embutidas (resolvidas em evalVar): nivel, proficiencia[F19],
// vida_atual, vida_max, x (só na fórmula de modificador). Nomes fora dessa lista
// só resolvem via atalho da notação (_nomeSoltoEhAtributo) — senão, erro na avaliação.

const MAX_LEN = 1000
const MAX_DEPTH = 200

export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// ---------------------------------------------------------------- Parser
const isDigit = c => c >= '0' && c <= '9'
const isAlpha = c => (c >= 'a' && c <= 'z') || c === '_'
const isAlnum = c => isAlpha(c) || isDigit(c)

function skipWs(p) {
  while (p.i < p.src.length && (p.src[p.i] === ' ' || p.src[p.i] === '\t' || p.src[p.i] === '\n')) p.i++
}

function parseNumber(p) {
  const start = p.i
  let dots = 0
  while (p.i < p.src.length && (isDigit(p.src[p.i]) || p.src[p.i] === '.')) {
    if (p.src[p.i] === '.' && ++dots > 1) throw new FormulaError('Número com mais de um ponto decimal', p.i)
    p.i++
  }
  const s = p.src.slice(start, p.i)
  const v = parseFloat(s)
  if (Number.isNaN(v)) throw new FormulaError(`Número inválido '${s}'`, start)
  return { type: 'num', value: v }
}

function parseIdent(p) {
  const start = p.i
  while (p.i < p.src.length && isAlnum(p.src[p.i])) p.i++
  const name = p.src.slice(start, p.i)

  const aposIdent = p.i
  skipWs(p)
  if (p.src[p.i] === '(') {
    p.i++ // consome '('

    if (MATH_FUNCS[name] !== undefined) {
      const args = []
      skipWs(p)
      if (p.src[p.i] !== ')') {
        args.push(parseExpr(p))
        skipWs(p)
        while (p.src[p.i] === ',') { p.i++; args.push(parseExpr(p)); skipWs(p) }
      }
      if (p.src[p.i] !== ')') throw new FormulaError(`Parêntese ')' esperado em ${name}(`, p.i)
      p.i++
      const arity = MATH_FUNCS[name]
      if (args.length !== arity) throw new FormulaError(`${name}() espera ${arity} argumento(s), recebeu ${args.length}`, start)
      return { type: 'mathcall', fn: name, args }
    }

    if (NAME_FUNCS.has(name)) {
      // Argumento capturado como NOME BRUTO (aceita id UUID com hífens ou nome)
      const s2 = p.i
      while (p.i < p.src.length && p.src[p.i] !== ')') p.i++
      if (p.src[p.i] !== ')') throw new FormulaError(`Parêntese ')' esperado em ${name}(`, p.i)
      const arg = p.src.slice(s2, p.i).trim()
      p.i++
      if (!arg) throw new FormulaError(`${name}() precisa de um nome`, start)
      return { type: 'call', fn: name, arg }
    }

    throw new FormulaError(`Função '${name}' desconhecida`, start)
  }

  // Não é chamada de função → variável simples. Aceita qualquer nome na SINTAXE;
  // se é conhecida ou não é decidido na avaliação (permite o atalho da notação).
  p.i = aposIdent
  return { type: 'var', name }
}

function parsePrimary(p) {
  skipWs(p)
  const c = p.src[p.i]
  if (c === undefined) throw new FormulaError('Fim inesperado da fórmula', p.i)
  if (c === '(') {
    p.i++
    const e = parseExpr(p)
    skipWs(p)
    if (p.src[p.i] !== ')') throw new FormulaError("Parêntese ')' esperado", p.i)
    p.i++
    return e
  }
  if (isDigit(c) || c === '.') return parseNumber(p)
  if (isAlpha(c)) return parseIdent(p)
  throw new FormulaError(`Caractere inesperado '${c}'`, p.i)
}

function parseUnary(p) {
  skipWs(p)
  const c = p.src[p.i]
  if (c === '-') { p.i++; return { type: 'neg', operand: parseUnary(p) } }
  if (c === '+') { p.i++; return parseUnary(p) }
  return parsePrimary(p)
}

function parseMulDiv(p) {
  let left = parseUnary(p)
  for (;;) {
    skipWs(p)
    const c = p.src[p.i]
    if (c === '*' || c === '/') { p.i++; left = { type: 'binop', op: c, left, right: parseUnary(p) } }
    else return left
  }
}

function parseExpr(p) {
  let left = parseMulDiv(p)
  for (;;) {
    skipWs(p)
    const c = p.src[p.i]
    if (c === '+' || c === '-') { p.i++; left = { type: 'binop', op: c, left, right: parseMulDiv(p) } }
    else return left
  }
}

// 17.6 — cache de AST por texto (memoiza o parse das fórmulas do sistema).
// ASTs são imutáveis (a avaliação não muta), então compartilhar é seguro.
const _astCache = new Map()

/**
 * Tokeniza e parseia a fórmula numa AST (memoizado). @throws {FormulaError}
 */
export function parseFormula(texto) {
  if (typeof texto !== 'string') throw new FormulaError('A fórmula precisa ser um texto')
  if (texto.length > MAX_LEN) throw new FormulaError('Fórmula longa demais')
  const cached = _astCache.get(texto)
  if (cached) return cached
  const src = normalizar(texto)
  if (src === '') throw new FormulaError('Fórmula vazia')
  const p = { src, i: 0 }
  const ast = parseExpr(p)
  skipWs(p)
  if (p.i < src.length) throw new FormulaError(`Token inesperado '${src[p.i]}'`, p.i)
  if (_astCache.size > 1000) _astCache.clear()
  _astCache.set(texto, ast)
  return ast
}

// ------------------------------------------------------------- Avaliação
function comoNumero(v, categoria, nome) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) throw new FormulaError(`${categoria} '${nome}' não tem valor numérico`)
  return n
}

function resolverNome(map, nome, categoria) {
  if (map && typeof map === 'object') {
    if (nome in map) return comoNumero(map[nome], categoria, nome)
    const alvo = normalizar(nome)
    if (alvo in map) return comoNumero(map[alvo], categoria, nome)
    for (const k of Object.keys(map)) if (normalizar(k) === alvo) return comoNumero(map[k], categoria, nome)
  }
  throw new FormulaError(`${categoria} '${nome}' não existe neste sistema`)
}

// Fase 19 — nível da ficha numa classe (por id ou nome normalizado).
// Ausente = 0 (a ficha simplesmente não tem essa classe), nunca erro.
function resolverNivelClasse(map, nome) {
  if (map && typeof map === 'object') {
    if (nome in map) return Number(map[nome]) || 0
    const alvo = normalizar(nome)
    if (alvo in map) return Number(map[alvo]) || 0
    for (const k of Object.keys(map)) if (normalizar(k) === alvo) return Number(map[k]) || 0
  }
  return 0
}

function evalVar(name, ctx) {
  switch (name) {
    case 'nivel':      return comoNumero(ctx.nivel ?? 0, 'nível', 'nivel')
    case 'vida_atual': return comoNumero(ctx.vida_atual ?? 0, 'vida', 'vida_atual')
    case 'vida_max':   return comoNumero(ctx.vida_max ?? 0, 'vida', 'vida_max')
    case 'x':
      if (ctx._x === undefined) throw new FormulaError("'x' só existe na fórmula do modificador de atributo")
      return ctx._x
    case 'proficiencia': {
      // Fase 19 — avalia a fórmula de proficiência do sistema (config_layout).
      if (ctx._emProficiencia) throw new FormulaError("'proficiencia' não pode referenciar a si mesma")
      const f = ctx.formula_proficiencia
      if (f == null || String(f).trim() === '') {
        throw new FormulaError('Este sistema não define proficiência')
      }
      return avaliarFormula(f, { ...ctx, _emProficiencia: true })
    }
  }
  // Atalho opt-in (só na camada de notação de dado, Fase 17.2): nome solto que
  // não é variável embutida é resolvido como o atributo com aquele nome.
  if (ctx._nomeSoltoEhAtributo) return resolverNome(ctx.atributos, name, 'atributo')
  throw new FormulaError(`Variável '${name}' desconhecida`)
}

function evalCall(fn, arg, ctx) {
  switch (fn) {
    case 'atributo': return resolverNome(ctx.atributos, arg, 'atributo')
    case 'pericia':  return resolverNome(ctx.pericias, arg, 'perícia')
    case 'recurso':  return resolverNome(ctx.recursos, arg, 'recurso')
    case 'mod': {
      const attr = resolverNome(ctx.atributos, arg, 'atributo')
      const f = ctx.formulaModificador
      if (f == null || f === '') return attr // sem fórmula: mod(a) === atributo(a)
      return avaliarFormula(f, { ...ctx, _x: attr })
    }
    case 'nivel':    return resolverNivelClasse(ctx.niveisClasse, arg) // Fase 19
    case 'pool':     throw new FormulaError("'pool()' estará disponível na Fase 20")
    case 'maestria': throw new FormulaError("'maestria()' estará disponível na Fase 21")
    default: throw new FormulaError(`Função '${fn}' desconhecida`)
  }
}

function evalNode(node, ctx, depth) {
  if (depth > MAX_DEPTH) throw new FormulaError('Fórmula profunda demais')
  switch (node.type) {
    case 'num': return node.value
    case 'neg': return -evalNode(node.operand, ctx, depth + 1)
    case 'binop': {
      const a = evalNode(node.left, ctx, depth + 1)
      const b = evalNode(node.right, ctx, depth + 1)
      switch (node.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/':
          if (b === 0) throw new FormulaError('Divisão por zero')
          return a / b
        default: throw new FormulaError(`Operador '${node.op}' desconhecido`)
      }
    }
    case 'var':  return evalVar(node.name, ctx)
    case 'call': return evalCall(node.fn, node.arg, ctx)
    case 'mathcall': {
      const a = node.args.map(x => evalNode(x, ctx, depth + 1))
      switch (node.fn) {
        case 'piso':       return Math.floor(a[0])
        case 'teto':       return Math.ceil(a[0])
        case 'arredondar': return Math.round(a[0])
        case 'abs':        return Math.abs(a[0])
        case 'min':        return Math.min(a[0], a[1])
        case 'max':        return Math.max(a[0], a[1])
        default: throw new FormulaError(`Função '${node.fn}' desconhecida`)
      }
    }
    default: throw new FormulaError('Nó de fórmula desconhecido')
  }
}

/**
 * Avalia uma fórmula (string ou AST) contra um contexto. @returns {number}
 * @param {object} contexto { atributos, formulaModificador, nivel, pericias, recursos, vida_atual, vida_max }
 * @throws {FormulaError}
 */
export function avaliarFormula(formula, contexto = {}) {
  const ast = formula && typeof formula === 'object' && formula.type ? formula : parseFormula(formula)
  const r = evalNode(ast, contexto, 0)
  if (typeof r !== 'number' || !Number.isFinite(r)) throw new FormulaError('Resultado não numérico')
  return r
}

/**
 * Fase 17.5 — detecta uso de atributo()/mod() (proibido em fórmula de modificador,
 * para evitar auto-referência/dependência circular com o motor).
 */
export function usaAtributoOuMod(texto) {
  return /(^|[^a-z0-9_])(atributo|mod)\s*\(/i.test(normalizar(texto))
}

/**
 * Valida a SINTAXE (não avalia). Para feedback ao vivo nos editores.
 * @returns {{ valida: boolean, erro?: string, pos?: number }}
 */
export function validarFormula(texto) {
  try {
    parseFormula(texto)
    return { valida: true }
  } catch (e) {
    return { valida: false, erro: e.message, pos: e.pos }
  }
}

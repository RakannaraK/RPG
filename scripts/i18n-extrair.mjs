// Extrai os textos de t('…'), tn(n, '…', '…') e tx('contexto', '…') de src/ (F66).
// Uso: node scripts/i18n-extrair.mjs [--faltando]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const AREAS = ['ui', 'pages', 'ficha', 'sistema', 'mesa', 'mapa', 'sessao', 'jogos', 'lib']
export const IDS_IDIOMA = ['en', 'es']

// Primeiro prefixo que casar. O que não casar (engines, templates…) cai em `lib`.
const PREFIXOS = [
  ['ui', ['src/components/ui/', 'src/components/auth/', 'src/components/ajuda/', 'src/components/arte/', 'src/components/marca/', 'src/components/notificacoes/', 'src/components/painel/', 'src/components/preferencias/', 'src/components/comunidade/', 'src/components/cinematica/', 'src/components/chamada/', 'src/components/ErrorBoundary.jsx', 'src/App.jsx']],
  ['pages', ['src/pages/']],
  ['ficha', ['src/components/ficha/']],
  ['sistema', ['src/components/sistema/']],
  ['mesa', ['src/components/mesa/']],
  ['mapa', ['src/components/mapa/']],
  ['sessao', ['src/components/sessao/']],
  ['jogos', ['src/components/dados/', 'src/components/minigames/', 'src/components/bestiario/']],
]

export function areaDe(caminho) {
  for (const [area, prefs] of PREFIXOS) if (prefs.some(p => caminho.startsWith(p))) return area
  return 'lib'
}

function arquivos(dir, saida = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const c = join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'i18n') arquivos(c, saida) }
    else if (/\.(jsx?|mjs)$/.test(e.name) && !/\.test\.[jt]sx?$/.test(e.name)) saida.push(c)
  }
  return saida
}

const BARRA = String.fromCharCode(92)
const ESC = { n: '\n', t: '\t', r: '\r' }

// Lê um texto literal a partir de `i` (aspas simples, duplas ou crase sem ${}). null = não é literal.
function literal(src, i) {
  const q = src[i]
  if (q !== "'" && q !== '"' && q !== '`') return null
  let s = ''
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j]
    if (c === BARRA) {
      const n = src[++j]
      if (n === 'u' && /^[0-9a-fA-F]{4}/.test(src.slice(j + 1, j + 5))) { s += String.fromCharCode(parseInt(src.slice(j + 1, j + 5), 16)); j += 4 }
      else s += ESC[n] ?? n
    } else if (c === q) return { texto: s, fim: j + 1 }
    else if (c === '$' && src[j + 1] === '{') return null
    else if (c === '\n' && q !== '`') return null
    else s += c
  }
  return null
}

const espaco = (src, i) => { while (/\s/.test(src[i] ?? '')) i++; return i }

// Pula uma expressão qualquer até a vírgula do nível de fora (para o `n` do tn).
function pularExpressao(src, i) {
  let prof = 0
  for (; i < src.length; i++) {
    const c = src[i]
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === BARRA) i++
    } else if ('([{'.includes(c)) prof++
    else if (')]}'.includes(c)) { if (prof === 0) return -1; prof-- }
    else if (c === ',' && prof === 0) return i
  }
  return -1
}

// Troca comentários por espaços (mantém tamanho e quebras de linha, então a linha continua certa).
// Passa por cima de texto entre aspas/crase e de regex, para não confundir `//` de URL com comentário.
export function tirarComentarios(src) {
  let o = ''
  let i = 0
  let ultimo = '' // último caractere significativo (para distinguir regex de divisão)
  const branco = s => s.replace(/[^\n]/g, ' ')
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '/') {
      let j = src.indexOf('\n', i)
      if (j < 0) j = src.length
      o += branco(src.slice(i, j)); i = j
    } else if (c === '/' && d === '*') {
      let j = src.indexOf('*/', i + 2)
      j = j < 0 ? src.length : j + 2
      o += branco(src.slice(i, j)); i = j
    } else if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      for (; j < src.length && src[j] !== c; j++) {
        if (src[j] === BARRA) j++
        else if (src[j] === '\n' && c !== '`') break
      }
      j = Math.min(j + 1, src.length)
      o += src.slice(i, j); i = j; ultimo = c
    } else if (c === '/' && (ultimo === '' || '(,=:[!&|?{};'.includes(ultimo))) {
      let j = i + 1
      let classe = false
      for (; j < src.length && src[j] !== '\n'; j++) {
        if (src[j] === BARRA) j++
        else if (src[j] === '[') classe = true
        else if (src[j] === ']') classe = false
        else if (src[j] === '/' && !classe) break
      }
      j = Math.min(j + 1, src.length)
      o += src.slice(i, j); i = j; ultimo = '/'
    } else {
      o += c; i++
      if (!/\s/.test(c)) ultimo = c
    }
  }
  return o
}

// Esvazia o conteúdo de textos entre aspas/crase (mantém tamanho e quebras de linha).
function tirarTextos(src) {
  let o = ''
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c !== "'" && c !== '"' && c !== '`') { o += c; continue }
    let j = i + 1
    for (; j < src.length && src[j] !== c; j++) {
      if (src[j] === BARRA) j++
      else if (src[j] === '\n' && c !== '`') break
    }
    o += c + src.slice(i + 1, j).replace(/[^\n]/g, ' ') + (src[j] === c ? c : '')
    i = j
  }
  return o
}

// Linhas onde uma variável local esconde t/tn/tx importados de ../i18n (quem importa precisa do nome livre).
// Prefere acusar a mais: não entende escopo nem parênteses aninhados em parâmetros.
export function variaveisQueEscondem(fonte) {
  const imp = fonte.match(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*i18n['"]/)
  if (!imp) return []
  const src = tirarTextos(fonte)
  const achados = []
  for (const n of imp[1].split(',').map(s => s.trim()).filter(x => x === 't' || x === 'tn' || x === 'tx')) {
    const lista = new RegExp(String.raw`(?<![\w$.])${n}(?![\w$:])`)
    const regs = [
      [new RegExp(String.raw`\b(?:const|let|var)\s+${n}(?![\w$])`, 'g')],
      [/\b(?:const|let|var)\s*[{[][^;]*?[}\]]\s*=(?!=)/g, lista],
      [new RegExp(String.raw`(?<![\w$.])${n}\s*=>`, 'g')],
      [/\(([^()]*)\)\s*=>/g, lista],
      [/\bfunction\s*[\w$]*\s*\(([^()]*)\)/g, lista],
      [new RegExp(String.raw`\bcatch\s*\(\s*${n}\s*\)`, 'g')],
    ]
    for (const [re, filtro] of regs) {
      for (const m of src.matchAll(re)) {
        if (filtro && !filtro.test(m[1] ?? m[0])) continue
        achados.push({ linha: src.slice(0, m.index).split('\n').length, nome: n })
      }
    }
    // `t.x` com o t importado: sobra de uma variável local renomeada pela metade (não dá erro de lint)
    for (const m of src.matchAll(new RegExp(String.raw`(?<![\w$.])${n}\s*(?:\?\.|\.|\[)`, 'g'))) {
      achados.push({ linha: src.slice(0, m.index).split('\n').length, nome: n, motivo: `\`${n}.\` usa a função de tradução como objeto (variável renomeada pela metade?)` })
    }
  }
  return achados
}

const CHAMADAS = { t: { literais: 1, tx: false }, tn: { literais: 2, tx: false }, tx: { literais: 2, tx: true } }
const variaveis = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1])

/** Varre src/ e devolve { fontes: { area: [textos] }, problemas: [{ arquivo, linha, motivo }] }. */
export function extrair(raiz = RAIZ) {
  const porTexto = new Map() // chave -> índice da melhor área
  const problemas = []
  for (const arq of arquivos(join(raiz, 'src'))) {
    const rel = relative(raiz, arq).split(BARRA).join('/')
    const ai = AREAS.indexOf(areaDe(rel))
    const src = tirarComentarios(readFileSync(arq, 'utf8').split('\r\n').join('\n'))
    for (const v of variaveisQueEscondem(src)) problemas.push({ arquivo: rel, linha: v.linha, motivo: v.motivo || `variável local \`${v.nome}\` esconde a função de tradução` })
    for (const m of src.matchAll(/(?<![\w$.])(tn|tx|t)\(/g)) {
      const linha = src.slice(0, m.index).split('\n').length
      const problema = motivo => problemas.push({ arquivo: rel, linha, motivo })
      const { literais } = CHAMADAS[m[1]]
      let i = m.index + m[0].length
      const textos = []
      let prox = ''
      let ok = true
      if (m[1] === 'tn') {
        i = pularExpressao(src, i)
        ok = i >= 0
        if (ok) i++
      }
      for (let k = 0; ok && k < literais; k++) {
        i = espaco(src, i)
        const l = literal(src, i)
        if (!l) { ok = false; break }
        i = espaco(src, l.fim)
        prox = src[i]
        if (k < literais - 1 ? prox !== ',' : prox !== ',' && prox !== ')') { ok = false; break }
        textos.push(l.texto)
        i++
      }
      if (!ok) { problema('argumento não literal'); continue }
      const texto = m[1] === 'tx' ? textos[1] : textos
      const torta = [].concat(texto).join(' ').match(/\{(?!\w+\})[^{}\s]*\}/)
      if (torta) { problema(`${torta[0]} não é variável: use só letras, como {total}`); continue }
      const exigidas = [].concat(texto).flatMap(variaveis).filter(v => !(m[1] === 'tn' && v === 'n'))
      if (exigidas.length && prox === ')') { problema(`texto com {${exigidas[0]}} sem o segundo argumento com os valores`); continue }
      const chaves = m[1] === 'tx' ? [`${textos[1]}|${textos[0]}`] : textos
      for (const x of chaves) if (!porTexto.has(x) || porTexto.get(x) > ai) porTexto.set(x, ai)
    }
  }
  const fontes = Object.fromEntries(AREAS.map(a => [a, []]))
  for (const [texto, ai] of porTexto) fontes[AREAS[ai]].push(texto)
  for (const a of AREAS) fontes[a].sort()
  return { fontes, problemas }
}

export async function faltando(fontes, raiz = RAIZ) {
  const res = {}
  for (const id of IDS_IDIOMA) {
    res[id] = {}
    for (const a of AREAS) {
      const dic = (await import(pathToFileURL(join(raiz, 'src/i18n', id, `${a}.js`)).href)).default
      res[id][a] = fontes[a].filter(x => !dic[x]).length
    }
  }
  return res
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  const { fontes, problemas } = extrair()
  const iLista = args.indexOf('--lista')
  if (iLista >= 0) {
    // JSON com os textos da área sem tradução no idioma (vale tradução de qualquer área do idioma)
    const [id, area] = args.slice(iLista + 1)
    if (!IDS_IDIOMA.includes(id) || !AREAS.includes(area)) { console.error('uso: --lista <en|es> <area>'); process.exit(1) }
    const dic = {}
    for (const a of AREAS) Object.assign(dic, (await import(pathToFileURL(join(RAIZ, 'src/i18n', id, `${a}.js`)).href)).default)
    console.log(JSON.stringify(fontes[area].filter(x => !dic[x])))
  } else {
    const gravar = !args.includes('--sem-gravar')
    if (gravar) writeFileSync(join(RAIZ, 'src/i18n/fontes.json'), JSON.stringify(fontes, null, 2) + String.fromCharCode(10))
    const total = AREAS.reduce((n, a) => n + fontes[a].length, 0)
    console.log(`${total} textos${gravar ? ' em src/i18n/fontes.json' : ''}:`, AREAS.map(a => `${a} ${fontes[a].length}`).join(', '))
    for (const p of problemas) console.log(`ATENÇÃO ${p.arquivo}:${p.linha}: ${p.motivo}`)
    if (args.includes('--faltando')) {
      const f = await faltando(fontes)
      for (const id of IDS_IDIOMA) console.log(`faltando ${id}:`, AREAS.map(a => `${a} ${f[id][a]}`).join(', '))
    }
  }
}

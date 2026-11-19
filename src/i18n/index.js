// Multi-idioma (F66): o texto em português é a chave. Sem tradução, devolve o português.
export const IDIOMAS = [
  { id: 'pt', nome: 'Português', locale: 'pt-BR' },
  { id: 'en', nome: 'English', locale: 'en-US' },
  { id: 'es', nome: 'Español', locale: 'es-ES' },
]

const CHAVE = 'dp-idioma'
const CARREGAR = { en: () => import('./en.js'), es: () => import('./es.js') }

let atual = 'pt'
let dic = {}

export function idiomaAtual() { return atual }
export function locale() { return IDIOMAS.find(i => i.id === atual).locale }

const tem = k => Object.hasOwn(dic, k) && dic[k]

function preencher(s, vars) {
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? String(vars[k]) : m)) : s
}

export function t(texto, vars) {
  return preencher(tem(texto) ? dic[texto] : texto, vars)
}

// Mesma palavra, sentidos diferentes: procura 'texto|contexto', depois 'texto', depois o português.
export function tx(contexto, texto, vars) {
  const k = `${texto}|${contexto}`
  return preencher(tem(k) ? dic[k] : tem(texto) ? dic[texto] : texto, vars)
}

export function tn(n, um, varios, vars) {
  return t(n === 1 ? um : varios, { n, ...vars })
}

function escolhido() {
  try {
    const salvo = localStorage.getItem(CHAVE)
    if (IDIOMAS.some(i => i.id === salvo)) return salvo
    for (const l of navigator.languages?.length ? navigator.languages : [navigator.language]) {
      const nav = (l || '').slice(0, 2).toLowerCase()
      if (nav === 'pt' || nav === 'en' || nav === 'es') return nav
    }
    return 'pt'
  } catch { return 'pt' }
}

export async function iniciarIdioma() {
  atual = 'pt'
  dic = {}
  const id = escolhido()
  if (CARREGAR[id]) {
    try { dic = (await CARREGAR[id]()).default || {}; atual = id } catch { dic = {} }
  }
  try { document.documentElement.lang = locale() } catch {}
}

export function trocarIdioma(id) {
  try { localStorage.setItem(CHAVE, id) } catch {}
  try { window.location.reload() } catch {}
}

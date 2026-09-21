/**
 * Fase 36 — comunidade (puro). O que viaja é sempre o ARQUIVO PORTÁTIL: a
 * ficha/criatura no formato da F30 ou o sistema no formato do export. Nunca a
 * ficha ao vivo de ninguém, nunca dados da mesa.
 */

export const TIPOS_PUBLICACAO = [
  { id: 'ficha', nome: 'Ficha', icone: '📜' },
  { id: 'criatura', nome: 'Criatura', icone: '🐾' },
  { id: 'sistema', nome: 'Sistema', icone: '⚙️' },
  { id: 'arte', nome: 'Arte', icone: '🎨' },
]

export const LIMITE_CONTEUDO_BYTES = 1_000_000
export const DENUNCIAS_PARA_ESCONDER = 3

export const nomeDoTipo = tipo => TIPOS_PUBLICACAO.find(t => t.id === tipo)?.nome || tipo
export const iconeDoTipo = tipo => TIPOS_PUBLICACAO.find(t => t.id === tipo)?.icone || '📦'

/** "fantasia, baixo nível" → ['fantasia', 'baixo nível'] (sem repetir, até 8). */
export function normalizarEtiquetas(texto) {
  const brutas = Array.isArray(texto) ? texto : String(texto || '').split(',')
  const vistas = new Set()
  const out = []
  for (const bruta of brutas) {
    const e = String(bruta).trim().toLocaleLowerCase('pt-BR').slice(0, 24)
    if (!e || vistas.has(e)) continue
    vistas.add(e)
    out.push(e)
    if (out.length === 8) break
  }
  return out
}

/**
 * Confere uma publicação antes de mandar.
 * @returns {{ ok: true } | { ok: false, erro: string }}
 */
export function validarPublicacao({ tipo, titulo, conteudo, imagem_url } = {}) {
  if (!TIPOS_PUBLICACAO.some(t => t.id === tipo)) return { ok: false, erro: 'Escolha o que está publicando.' }
  const t = String(titulo || '').trim()
  if (t.length < 2) return { ok: false, erro: 'Dê um título (pelo menos 2 letras).' }
  if (t.length > 120) return { ok: false, erro: 'O título passou de 120 letras.' }
  if (tipo === 'arte') {
    if (!String(imagem_url || '').trim()) return { ok: false, erro: 'Arte precisa de uma imagem.' }
    return { ok: true }
  }
  if (!conteudo || typeof conteudo !== 'object') return { ok: false, erro: 'Escolha o arquivo exportado (.json).' }
  const bytes = new TextEncoder().encode(JSON.stringify(conteudo)).length
  if (bytes > LIMITE_CONTEUDO_BYTES) {
    return { ok: false, erro: `O arquivo tem ${(bytes / 1_000_000).toFixed(1)} MB; o limite é 1 MB.` }
  }
  if (tipo === 'sistema') {
    // export de sistema: tem as coleções na raiz (atributos, habilidades…)
    if (!Array.isArray(conteudo.atributos) && !conteudo.sistema) return { ok: false, erro: 'Este arquivo não parece um sistema exportado.' }
  } else if (conteudo.formato !== 'rpg-ficha' || conteudo.tipo !== 'ficha') {
    return { ok: false, erro: 'Este arquivo não parece uma ficha exportada do RPG Ficha.' }
  }
  return { ok: true }
}

/** Filtra a vitrine por tipo, etiqueta e busca livre (tudo opcional). */
export function filtrarVitrine(publicacoes = [], { tipo = null, etiqueta = null, busca = '' } = {}) {
  const q = String(busca || '').trim().toLocaleLowerCase('pt-BR')
  return publicacoes.filter(p => {
    if (tipo && p.tipo !== tipo) return false
    if (etiqueta && !(p.etiquetas || []).includes(etiqueta)) return false
    if (!q) return true
    return [p.titulo, p.descricao, p.autor, ...(p.etiquetas || [])]
      .some(campo => String(campo || '').toLocaleLowerCase('pt-BR').includes(q))
  })
}

/** Etiquetas mais usadas na vitrine (para os atalhos de filtro). */
export function etiquetasPopulares(publicacoes = [], limite = 12) {
  const conta = new Map()
  for (const p of publicacoes) for (const e of p.etiquetas || []) conta.set(e, (conta.get(e) || 0) + 1)
  return [...conta.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).slice(0, limite).map(([e, n]) => ({ etiqueta: e, usos: n }))
}

/** Ordena a vitrine: 'recentes' (padrão) ou 'curtidas'. */
export function ordenarVitrine(publicacoes = [], modo = 'recentes') {
  const lista = [...publicacoes]
  if (modo === 'curtidas') return lista.sort((a, b) => (b.curtidas || 0) - (a.curtidas || 0) || Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
  return lista.sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
}

/** O que dizer na publicação já obtida/curtida. */
export const textoCurtidas = n => `${n || 0} ${Number(n) === 1 ? 'curtida' : 'curtidas'}`

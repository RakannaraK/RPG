/**
 * Fases 41/42 — enciclopédia da mesa (puro): verbetes com campos por tipo,
 * menções `[[Título]]`, busca sem acento e o "quem sabe o quê" da revelação.
 *
 * O jogador nunca lê a tabela: recebe de `verbetes_visiveis` só os campos
 * revelados (os outros vêm null). Então tudo aqui funciona com campos faltando.
 */
import { normalizar } from './formulaEngine'
import { normalizarEtiquetas } from './comunidade'

export const LIMITES = { titulo: 120, resumo: 500, corpo: 20000, segredo: 5000, campo: 1000 }

// ids dos campos casam com o CHECK do banco: campos\.[a-z_]{1,40}
export const TIPOS_VERBETE = [
  { id: 'npc', nome: 'NPC', icone: 'elmo', campos: [
    { id: 'aparencia', nome: 'Aparência' }, { id: 'personalidade', nome: 'Personalidade' },
    { id: 'motivacao', nome: 'O que quer' }, { id: 'onde_encontrar', nome: 'Onde encontrar' },
  ] },
  { id: 'local', nome: 'Local', icone: 'mapa', campos: [
    { id: 'regiao', nome: 'Região' }, { id: 'atmosfera', nome: 'Como é' }, { id: 'perigos', nome: 'Perigos' },
  ] },
  { id: 'faccao', nome: 'Facção', icone: 'escudo', campos: [
    { id: 'objetivo', nome: 'Objetivo' }, { id: 'lider', nome: 'Quem lidera' }, { id: 'simbolo', nome: 'Símbolo' },
  ] },
  { id: 'divindade', nome: 'Divindade', icone: 'lanterna', campos: [
    { id: 'dominio', nome: 'Domínio' }, { id: 'simbolo', nome: 'Símbolo' }, { id: 'dogma', nome: 'Dogma' },
  ] },
  { id: 'item', nome: 'Item', icone: 'bau', campos: [
    { id: 'raridade', nome: 'Raridade' }, { id: 'efeito', nome: 'Efeito' }, { id: 'origem', nome: 'Origem' },
  ] },
  { id: 'lore', nome: 'História', icone: 'tomo', campos: [{ id: 'epoca', nome: 'Época' }] },
  { id: 'handout', nome: 'Documento', icone: 'pergaminho', campos: [] },
  { id: 'outro', nome: 'Outro', icone: 'nota', campos: [] },
]

export const tipoDe = id => TIPOS_VERBETE.find(t => t.id === id) || TIPOS_VERBETE[TIPOS_VERBETE.length - 1]

/** Nome legível de um campo revelável ("campos.aparencia" -> "Aparência"). */
export function nomeDoCampo(campo, tipo) {
  const fixos = { titulo: 'Nome', resumo: 'Resumo', imagem: 'Imagem', corpo: 'Texto', tags: 'Etiquetas' }
  if (fixos[campo]) return fixos[campo]
  const id = String(campo).replace(/^campos\./, '')
  return tipoDe(tipo).campos.find(c => c.id === id)?.nome || id
}

/** O que dá para revelar deste verbete (só o que tem conteúdo; o segredo nunca). */
export function camposRevelaveis(v) {
  if (!v) return []
  const lista = ['titulo']
  if (v.resumo?.trim()) lista.push('resumo')
  if (v.imagem_url) lista.push('imagem')
  if (v.corpo?.trim()) lista.push('corpo')
  if (v.tags?.length) lista.push('tags')
  for (const [k, valor] of Object.entries(v.campos || {})) {
    if (String(valor ?? '').trim()) lista.push(`campos.${k}`)
  }
  return lista
}

// ---------------------------------------------------------------- menções

const MENCAO = /\[\[([^[\]\n]{1,120})\]\]/g

/** Títulos mencionados no texto, na ordem, sem repetir. */
export function mencoes(texto) {
  const vistos = new Set()
  const lista = []
  for (const m of String(texto || '').matchAll(MENCAO)) {
    const t = m[1].trim()
    if (t && !vistos.has(normalizar(t))) { vistos.add(normalizar(t)); lista.push(t) }
  }
  return lista
}

/**
 * Texto -> partes para renderizar: `{ texto }` ou `{ texto, alvo }` (menção que
 * achou um verbete). Menção sem alvo vira texto simples — para o jogador, um
 * verbete ainda secreto não pode aparecer como link.
 */
export function partesComMencoes(texto, verbetes = []) {
  const porTitulo = new Map()
  for (const v of verbetes) if (v.titulo) porTitulo.set(normalizar(v.titulo), v)
  const partes = []
  let ultimo = 0
  for (const m of String(texto || '').matchAll(MENCAO)) {
    if (m.index > ultimo) partes.push({ texto: texto.slice(ultimo, m.index) })
    const nome = m[1].trim()
    const alvo = porTitulo.get(normalizar(nome))
    partes.push(alvo ? { texto: nome, alvo } : { texto: nome })
    ultimo = m.index + m[0].length
  }
  if (ultimo < String(texto || '').length) partes.push({ texto: texto.slice(ultimo) })
  // junta textos vizinhos (menção sem alvo ao lado de texto)
  return partes.reduce((acc, p) => {
    const ant = acc[acc.length - 1]
    if (ant && !ant.alvo && !p.alvo) ant.texto += p.texto
    else acc.push({ ...p })
    return acc
  }, [])
}

/** Quem cita este verbete (no texto, resumo ou campos que o leitor vê). */
export function citadoPor(verbete, verbetes = []) {
  if (!verbete?.titulo) return []
  const alvo = normalizar(verbete.titulo)
  return verbetes.filter(v => v.id !== verbete.id && [v.corpo, v.resumo, ...Object.values(v.campos || {})]
    .some(t => mencoes(t).some(m => normalizar(m) === alvo)))
}

// ---------------------------------------------------------------- busca

/** Busca sem acento/maiúscula em tudo que o leitor vê; filtro opcional por tipo. */
export function buscarVerbetes(verbetes = [], { busca = '', tipo = null } = {}) {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  return verbetes.filter(v => {
    if (tipo && v.tipo !== tipo) return false
    if (!termos.length) return true
    const alvo = normalizar([v.titulo, v.resumo, v.corpo, ...(v.tags || []), ...Object.values(v.campos || {})].filter(Boolean).join(' '))
    return termos.every(t => alvo.includes(t))
  })
}

/** Ordem da lista: por título (sem título, i.e. ainda secreto, vai para o fim). */
export const ordenarVerbetes = (verbetes = []) =>
  [...verbetes].sort((a, b) => (a.titulo ? 0 : 1) - (b.titulo ? 0 : 1) || String(a.titulo || '').localeCompare(String(b.titulo || ''), 'pt-BR'))

// ---------------------------------------------------------------- revelação

/**
 * Quem sabe o quê de UM verbete: Map usuario_id -> Set(campo). A revelação à
 * mesa toda (usuario_id null) vale para todo mundo e aparece em `todos`.
 */
export function quemSabe(revelacoes = [], verbeteId, usuarios = []) {
  const doVerbete = revelacoes.filter(r => r.verbete_id === verbeteId)
  const todos = new Set(doVerbete.filter(r => !r.usuario_id).map(r => r.campo))
  const porUsuario = new Map(usuarios.map(u => [u, new Set(todos)]))
  for (const r of doVerbete) if (r.usuario_id && porUsuario.has(r.usuario_id)) porUsuario.get(r.usuario_id).add(r.campo)
  return { todos, porUsuario }
}

/** "Oculto", "Parcial" ou "Revelado" para quem joga (resumo da linha na lista do mestre). */
export function estadoRevelacao(verbete, revelacoes = [], usuarios = []) {
  const revelaveis = camposRevelaveis(verbete)
  const { porUsuario } = quemSabe(revelacoes, verbete.id, usuarios)
  const sabem = [...porUsuario.values()]
  if (!sabem.some(s => s.size)) return 'oculto'
  const tudo = sabem.length && sabem.every(s => revelaveis.every(c => s.has(c)))
  return tudo ? 'revelado' : 'parcial'
}

/** Normaliza o formulário do mestre para o banco (e diz o que está errado). */
export function validarVerbete(v = {}) {
  const titulo = String(v.titulo || '').trim()
  if (!titulo) return { ok: false, erro: 'Dê um nome ao verbete.' }
  if (titulo.length > LIMITES.titulo) return { ok: false, erro: `Nome com até ${LIMITES.titulo} letras.` }
  if (!TIPOS_VERBETE.some(t => t.id === v.tipo)) return { ok: false, erro: 'Escolha o tipo.' }
  for (const k of ['resumo', 'corpo', 'segredo']) {
    if (String(v[k] || '').length > LIMITES[k]) return { ok: false, erro: `${nomeDoCampo(k, v.tipo)} passou do limite de ${LIMITES[k]} letras.` }
  }
  const campos = {}
  for (const c of tipoDe(v.tipo).campos) {
    const valor = String(v.campos?.[c.id] ?? '').trim().slice(0, LIMITES.campo)
    if (valor) campos[c.id] = valor
  }
  return {
    ok: true,
    linha: {
      tipo: v.tipo, titulo,
      resumo: String(v.resumo || '').trim() || null,
      corpo: String(v.corpo || '').trim() || null,
      segredo: String(v.segredo || '').trim() || null,
      imagem_url: v.imagem_url || null,
      tags: normalizarEtiquetas(v.tags), campos,
    },
  }
}

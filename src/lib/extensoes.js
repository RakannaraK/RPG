// Fase 60 — extensões da mesa: pacotes de cenas (atmosfera) e efeitos de ação.
// Arquivo importado é entrada NÃO confiável: tudo passa por validarPacote (só o vocabulário de efeitosVocabulario.js).
import { TIPOS_ATMOSFERA, SONS_AMBIENTE, FORMAS_VFX, SONS_VFX, LIMITES, ID_VALIDO, corValida, limitar, textoCurto } from './efeitosVocabulario'
import { PACOTE_ESSENCIAL, CATALOGO } from './extensoes/catalogo'

export { PACOTE_ESSENCIAL, CATALOGO }
const FORMATO = 'dado-e-pena/extensao'
const ehObj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const lista = v => (Array.isArray(v) ? v : [])
const idOk = id => typeof id === 'string' && ID_VALIDO.test(id)

function normalizarCena(c) {
  if (!ehObj(c) || !idOk(c.id) || !textoCurto(c.nome)) return null
  const at = ehObj(c.atmosfera) ? c.atmosfera : {}
  const luz = ehObj(at.luz) ? at.luz : {}
  return {
    id: c.id,
    nome: textoCurto(c.nome),
    atmosfera: {
      efeitos: lista(at.efeitos)
        .filter(e => ehObj(e) && Object.hasOwn(TIPOS_ATMOSFERA, e.tipo))
        .slice(0, LIMITES.efeitos)
        .map(e => ({ tipo: e.tipo, intensidade: limitar(e.intensidade, 0.1, 1, 0.5), cor: corValida(e.cor) ? e.cor : null })),
      luz: { escuridao: limitar(luz.escuridao, 0, 0.95, 0), cor: corValida(luz.cor) ? luz.cor : '#05070C' },
      sons: lista(at.sons).filter(s => typeof s === 'string' && Object.hasOwn(SONS_AMBIENTE, s)).slice(0, LIMITES.sons),
    },
  }
}

function normalizarEfeito(e) {
  if (!ehObj(e) || !idOk(e.id) || !textoCurto(e.nome) || !Object.hasOwn(FORMAS_VFX, e.forma)) return null
  const cores = lista(e.cores)
  return {
    id: e.id,
    nome: textoCurto(e.nome),
    forma: e.forma,
    cores: [corValida(cores[0]) ? cores[0] : '#FFFFFF', corValida(cores[1]) ? cores[1] : '#FFFFFF'],
    som: SONS_VFX.includes(e.som) ? e.som : null,
  }
}

// Normaliza uma lista, descarta item ruim/repetido/acima do limite e anota em `erros`.
function filtrar(itens, normalizar, max, rotulo, erros) {
  const vistos = new Set()
  const bons = []
  lista(itens).forEach((it, i) => {
    const n = normalizar(it)
    if (!n || vistos.has(n.id)) { erros.push(`${rotulo} ${i + 1} descartado(a): inválido(a) ou repetido(a).`); return }
    if (bons.length >= max) { erros.push(`${rotulo} ${i + 1} descartado(a): limite de ${max}.`); return }
    vistos.add(n.id)
    bons.push(n)
  })
  return bons
}

/** json = texto ou objeto. → { ok, pacote, erros } */
export function validarPacote(json) {
  const erros = []
  const falha = msg => ({ ok: false, pacote: null, erros: [msg, ...erros] })
  let p = json
  if (typeof json === 'string') {
    if (new TextEncoder().encode(json).length > LIMITES.bytesPacote) return falha(`Arquivo grande demais (máximo ${LIMITES.bytesPacote} bytes).`)
    try { p = JSON.parse(json) } catch { return falha('O arquivo não é um JSON válido.') }
  } else if (new TextEncoder().encode(JSON.stringify(json ?? null)).length > LIMITES.bytesPacote) return falha('Extensão grande demais.')
  if (!ehObj(p) || p.formato !== FORMATO || p.versao !== 1) return falha('Não é uma extensão do Dado & Pena (formato ou versão errados).')
  if (!idOk(p.id)) return falha('Identificador (id) da extensão inválido.')
  const cenas = filtrar(p.cenas, normalizarCena, LIMITES.cenasPorPacote, 'Cena', erros)
  const efeitos = filtrar(p.efeitos, normalizarEfeito, LIMITES.efeitosPorPacote, 'Efeito', erros)
  if (!cenas.length && !efeitos.length) return falha('A extensão não tem nenhuma cena nem efeito válido.')
  return {
    ok: true, erros,
    pacote: { formato: FORMATO, versao: 1, id: p.id, nome: textoCurto(p.nome) || p.id, descricao: textoCurto(p.descricao, 200), autor: textoCurto(p.autor), cenas, efeitos },
  }
}

/** Essencial + catálogo instalado + importados válidos. Id repetido: fica o primeiro. */
export function conteudoInstalado(extensoes) {
  const pacotes = [PACOTE_ESSENCIAL]
  for (const x of lista(extensoes)) {
    const p = typeof x === 'string' ? CATALOGO.find(c => c.id === x) : validarPacote(x).pacote
    if (p && !pacotes.some(q => q.id === p.id)) pacotes.push(p)
  }
  const cenas = [], efeitos = []
  const idsCena = new Set(), idsEfeito = new Set()
  for (const p of pacotes) {
    for (const c of p.cenas) if (!idsCena.has(c.id)) { idsCena.add(c.id); cenas.push({ ...c, pacote: p.nome }) }
    for (const e of p.efeitos) if (!idsEfeito.has(e.id)) { idsEfeito.add(e.id); efeitos.push({ ...e, pacote: p.nome }) }
  }
  return { pacotes, cenas, efeitos }
}

export const exportarPacote = pacote => JSON.stringify(pacote, null, 2)

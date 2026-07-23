// Motor puro (sem DB, sem React) de export/import de sistema (Sub-fase A).
// Serializa o grafo de um sistema para um objeto portável e o desserializa
// gerando ids novos e remapeando TODAS as referências internas — inclusive as
// embutidas no config_layout (seja como valor, seja como chave de objeto).

export const VERSAO_FORMATO = 1

// Campos ligados ao ambiente (mesa/usuário/tempo): não viajam no export.
const CAMPOS_AMBIENTE = ['mesa_id', 'sistema_id', 'criador_id', 'created_at', 'updated_at']

// Coleções de conteúdo de um sistema (todas penduradas em sistema_id).
export const COLECOES = [
  'atributos', 'pericias', 'racas', 'classes', 'habilidades',
  'poderes', 'linhas_poder', 'pools', 'categorias_item',
  'propriedades_item', 'recompensas_nivel',
]

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ehUuid(v) {
  return typeof v === 'string' && RE_UUID.test(v)
}

function defaultGerarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function semAmbiente(obj) {
  const out = {}
  for (const k of Object.keys(obj || {})) {
    if (!CAMPOS_AMBIENTE.includes(k)) out[k] = obj[k]
  }
  return out
}

// Coleta todo uuid presente na estrutura (como valor OU como chave de objeto).
function coletarUuids(valor, destino) {
  if (Array.isArray(valor)) {
    for (const item of valor) coletarUuids(item, destino)
  } else if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (ehUuid(k)) destino.add(k)
      coletarUuids(v, destino)
    }
  } else if (ehUuid(valor)) {
    destino.add(valor)
  }
}

// Reconstrói a estrutura trocando todo uuid conhecido (valor ou chave) pelo novo.
function remapear(valor, mapa) {
  if (Array.isArray(valor)) {
    return valor.map(item => remapear(item, mapa))
  }
  if (valor && typeof valor === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(valor)) {
      const chave = mapa.has(k) ? mapa.get(k) : k
      out[chave] = remapear(v, mapa)
    }
    return out
  }
  if (typeof valor === 'string' && mapa.has(valor)) {
    return mapa.get(valor)
  }
  return valor
}

// Serializa o grafo de um sistema num objeto portável (sem campos de ambiente).
export function serializarSistema(grafo) {
  const sistema = (grafo && grafo.sistema) || {}
  const out = {
    versao: VERSAO_FORMATO,
    sistema: {
      nome: sistema.nome ?? '',
      descricao: sistema.descricao ?? null,
      config_layout: sistema.config_layout ?? {},
    },
  }
  for (const col of COLECOES) {
    out[col] = ((grafo && grafo[col]) || []).map(semAmbiente)
  }
  return out
}

// Desserializa: gera ids novos e remapeia TODA referência interna (valores e
// chaves), inclusive dentro do config_layout. Não atribui sistema_id/mesa_id —
// isso é responsabilidade da camada de banco na inserção (Sub-fase B).
export function desserializarSistema(json, gerarId = defaultGerarId) {
  const fonte = json || {}

  const idsAntigos = new Set()
  for (const col of COLECOES) {
    for (const row of fonte[col] || []) {
      if (row && ehUuid(row.id)) idsAntigos.add(row.id)
    }
  }
  coletarUuids(fonte.sistema && fonte.sistema.config_layout, idsAntigos)

  const mapa = new Map()
  for (const antigo of idsAntigos) mapa.set(antigo, gerarId())

  const resultado = {
    sistema: {
      nome: (fonte.sistema && fonte.sistema.nome) ?? '',
      descricao: (fonte.sistema && fonte.sistema.descricao) ?? null,
      config_layout: remapear((fonte.sistema && fonte.sistema.config_layout) ?? {}, mapa),
    },
  }
  for (const col of COLECOES) {
    resultado[col] = (fonte[col] || []).map(row => remapear(row, mapa))
  }
  return resultado
}

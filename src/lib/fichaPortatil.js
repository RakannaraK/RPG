// Fase 30.3 — ficha portátil (puro, sem banco nem React).
//
// Exportar troca cada referência ao sistema (atributo, perícia, classe…) pelo
// NOME; importar casa esses nomes com o sistema da mesa de destino. Assim a
// ficha viaja entre mesas cujos sistemas têm ids diferentes (até entre
// sistemas diferentes: o que não casar é avisado e fica de fora).

export const FORMATO_FICHA = { formato: 'rpg-ficha', tipo: 'ficha', versao: 1 }

// Colunas de fichas que o arquivo pode trazer (o resto — dono, mesa, sistema,
// acesso, pasta — é de quem importa; nunca vem do arquivo).
const CAMPOS_FICHA = [
  'nome_personagem', 'raca', 'classe', 'nivel', 'hp_atual', 'hp_maximo', 'notas', 'imagem_url',
  'tracos', 'proficiencias', 'xp', 'carteira', 'vida_temp_atual',
  'macros', // F39
]
const CAMPOS_AMBIENTE = ['id', 'ficha_id', 'created_at', 'updated_at']

const chave = s => String(s ?? '').trim().toLocaleLowerCase('pt-BR')
const rotuloConfig = e => e?.nome || e?.rotulo || e?.label || e?.id

/** Lista do sistema → rótulo de cada item (nome, ou composto quando o nome não basta). */
function colecoes(sistema) {
  const s = sistema || {}
  const nomeClasse = id => (s.classes || []).find(c => c.id === id)?.nome ?? ''
  const mods = [
    ...(s.racas || []).flatMap(r => (r.modificadores || []).map(m => ({ ...m, _dono: `raça ${r.nome}` }))),
    ...(s.classes || []).flatMap(c => (c.modificadores || []).map(m => ({ ...m, _dono: `classe ${c.nome}` }))),
    ...(s.habilidades || []).flatMap(h => (h.modificadores || []).map(m => ({ ...m, _dono: `habilidade ${h.nome}` }))),
  ]
  const cfg = s.sistema?.config_layout || {}
  return {
    atributos: [s.atributos, r => r.nome],
    pericias: [s.pericias, r => r.nome],
    racas: [s.racas, r => r.nome],
    classes: [s.classes, r => r.nome],
    habilidades: [s.habilidades, r => r.nome],
    poderes: [s.poderes, r => r.nome],
    linhas_poder: [s.linhas_poder, r => r.nome],
    pools: [s.pools, r => r.nome],
    categorias_item: [s.categorias_item, r => r.nome],
    recompensas_nivel: [s.recompensas_nivel, r => `${nomeClasse(r.classe_id)} · nível ${r.nivel} · ${r.titulo}`],
    modificadores: [mods, m => `${m._dono} · ${m.alvo ?? ''} · ${m.descricao ?? ''}`],
    estados: [cfg.estados, rotuloConfig],
    trilhas: [cfg.trilhas, rotuloConfig],
    campos_combate: [cfg.campos_combate, rotuloConfig],
  }
}

// tabela da ficha → [coluna com o id, nome no arquivo, coleção do sistema, rótulo do aviso]
const REFS = {
  valores_atributos: ['atributo_id', 'atributo', 'atributos', 'Atributo'],
  pericias_ficha: ['pericia_id', 'pericia', 'pericias', 'Perícia'],
  classes_ficha: ['classe_id', 'classe', 'classes', 'Classe'],
  habilidades_ficha: ['habilidade_id', 'habilidade', 'habilidades', 'Habilidade'],
  poderes_ficha: ['poder_id', 'poder', 'poderes', 'Poder'],
  linhas_ficha: ['linha_id', 'linha', 'linhas_poder', 'Linha de poder'],
  pools_ficha: ['pool_id', 'pool', 'pools', 'Reserva'],
  recompensas_ficha: ['recompensa_id', 'recompensa', 'recompensas_nivel', 'Recompensa'],
  condicoes_manuais_ficha: ['modificador_id', 'modificador', 'modificadores', 'Condição'],
  estados_ficha: ['estado_id', 'estado', 'estados', 'Estado'],
  trilhas_ficha: ['trilha_id', 'trilha', 'trilhas', 'Trilha'],
  valores_combate: ['campo_id', 'campo', 'campos_combate', 'Campo de combate'],
}
const SEM_REFS = ['imagens_ficha', 'projetos_ficha', 'slots_ficha', 'pontos_status_ficha']
export const TABELAS_FICHA = [...Object.keys(REFS), ...SEM_REFS, 'itens_ficha', 'maestrias_ficha']

function semAmbiente(row) {
  const out = { ...row }
  for (const c of CAMPOS_AMBIENTE) delete out[c]
  return out
}

/**
 * Ficha + linhas filhas + sistema de origem → objeto do arquivo.
 * @param filhos { [tabela]: linhas } (tabelas ausentes = vazias)
 */
export function exportarFicha({ ficha, filhos = {}, sistema = null }) {
  const cols = colecoes(sistema)
  const nomes = Object.fromEntries(Object.entries(cols).map(([k, [lista, rot]]) => [k, new Map((lista || []).map(r => [r.id, rot(r)]))]))

  const out = {
    ...FORMATO_FICHA,
    exportado_em: new Date().toISOString(),
    sistema: { nome: sistema?.sistema?.nome ?? null },
    ficha: {
      ...Object.fromEntries(CAMPOS_FICHA.filter(c => ficha?.[c] !== undefined).map(c => [c, ficha[c]])),
      raca_ref: nomes.racas.get(ficha?.raca_id) ?? null,
      classe_ref: nomes.classes.get(ficha?.classe_id) ?? null,
    },
    filhos: {},
  }

  for (const [tabela, [coluna, como, colecao]] of Object.entries(REFS)) {
    out.filhos[tabela] = (filhos[tabela] || []).map(row => {
      const { [coluna]: id, ...resto } = semAmbiente(row)
      return { ...resto, [como]: nomes[colecao].get(id) ?? id } // sem nome conhecido: leva o id (casa se for o mesmo sistema)
    })
  }
  for (const tabela of SEM_REFS) out.filhos[tabela] = (filhos[tabela] || []).map(semAmbiente)

  const itens = filhos.itens_ficha || []
  out.filhos.itens_ficha = itens.map((row, i) => {
    const { categoria_id, ...resto } = semAmbiente(row)
    return { ...resto, _idx: i, categoria: nomes.categorias_item.get(categoria_id) ?? null }
  })
  out.filhos.maestrias_ficha = (filhos.maestrias_ficha || []).map(row => {
    const { categoria_id, item_id, ...resto } = semAmbiente(row)
    const idx = itens.findIndex(it => it.id === item_id)
    return { ...resto, categoria: nomes.categorias_item.get(categoria_id) ?? null, item: idx >= 0 ? idx : null }
  })
  return out
}

/** Nome de arquivo seguro: "Lorde Vex" → "lorde_vex.ficha.json". */
export function nomeArquivoFicha(nome) {
  const base = String(nome || 'ficha').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'ficha'
  return `${base}.ficha.json`
}

/**
 * Arquivo + sistema de destino → linhas prontas para gravar e avisos do que não casou.
 * `gerarId` cria os ids novos (ficha e itens, para as maestrias apontarem).
 * @returns {{ fichaId, ficha, filhos: {[tabela]: linhas}, avisos: string[], sistemaOrigem }}
 */
export function planejarImportacao(json, sistema, gerarId = () => crypto.randomUUID()) {
  if (!json || json.formato !== FORMATO_FICHA.formato || json.tipo !== FORMATO_FICHA.tipo) {
    throw new Error('Este arquivo não é uma ficha exportada do RPG Ficha.')
  }
  if (Number(json.versao) > FORMATO_FICHA.versao) {
    throw new Error('Esta ficha foi exportada por uma versão mais nova do site. Atualize a página e tente de novo.')
  }
  const cols = colecoes(sistema)
  // nome → id e id → id (o mesmo sistema reconhece o id direto)
  const ids = Object.fromEntries(Object.entries(cols).map(([k, [lista, rot]]) => {
    const m = new Map()
    for (const r of lista || []) { m.set(chave(rot(r)), r.id); m.set(chave(r.id), r.id) }
    return [k, m]
  }))
  const achar = (colecao, nome) => (nome == null ? null : ids[colecao].get(chave(nome)) ?? null)
  const avisos = new Set()
  const fichaId = gerarId()
  const f = json.ficha || {}

  const ficha = Object.fromEntries(CAMPOS_FICHA.filter(c => f[c] !== undefined).map(c => [c, f[c]]))
  ficha.id = fichaId
  ficha.nome_personagem = String(ficha.nome_personagem || '').trim() || 'Personagem importado'
  ficha.raca_id = achar('racas', f.raca_ref)
  ficha.classe_id = achar('classes', f.classe_ref)
  if (f.raca_ref && !ficha.raca_id) avisos.add(`Raça “${f.raca_ref}” não existe neste sistema (fica só o texto).`)
  if (f.classe_ref && !ficha.classe_id) avisos.add(`Classe “${f.classe_ref}” não existe neste sistema (fica só o texto).`)

  const entrada = json.filhos || {}
  const filhos = {}
  for (const [tabela, [coluna, como, colecao, rotulo]] of Object.entries(REFS)) {
    const vistos = new Set() // índices únicos (ficha, atributo) etc.: fica o primeiro
    filhos[tabela] = []
    for (const row of entrada[tabela] || []) {
      const { [como]: nome, ...resto } = semAmbiente(row)
      const id = achar(colecao, nome)
      if (!id) { avisos.add(`${rotulo} “${nome}” não existe neste sistema.`); continue }
      if (vistos.has(id)) continue
      vistos.add(id)
      filhos[tabela].push({ ...resto, [coluna]: id, ficha_id: fichaId })
    }
  }
  for (const tabela of SEM_REFS) filhos[tabela] = (entrada[tabela] || []).map(r => ({ ...semAmbiente(r), ficha_id: fichaId }))

  const idDoItem = new Map()
  filhos.itens_ficha = (entrada.itens_ficha || []).map((row, i) => {
    const { _idx, categoria, ...resto } = semAmbiente(row)
    const id = gerarId()
    idDoItem.set(_idx ?? i, id)
    const categoria_id = achar('categorias_item', categoria)
    if (categoria && !categoria_id) avisos.add(`Categoria de item “${categoria}” não existe neste sistema (o item entra sem categoria).`)
    return { ...resto, id, categoria_id, ficha_id: fichaId }
  })
  filhos.maestrias_ficha = []
  for (const row of entrada.maestrias_ficha || []) {
    const { categoria, item, ...resto } = semAmbiente(row)
    const categoria_id = achar('categorias_item', categoria)
    if (!categoria_id) { avisos.add(`Maestria em “${categoria}” não entra: a categoria não existe neste sistema.`); continue }
    filhos.maestrias_ficha.push({ ...resto, categoria_id, item_id: item == null ? null : idDoItem.get(item) ?? null, ficha_id: fichaId })
  }

  return { fichaId, ficha, filhos, avisos: [...avisos], sistemaOrigem: json.sistema?.nome ?? null }
}

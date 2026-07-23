import { supabase } from './supabase'

// Carrega o grafo COMPLETO de um sistema (todas as tabelas penduradas em
// sistema_id + os modificadores aninhados sob raças/classes/habilidades), no
// formato que systemSerializer.serializarSistema espera. Usado pelo export.
export async function carregarSistemaCompleto(sistemaId) {
  if (!sistemaId) throw new Error('Sistema não informado.')

  const { data: sistema, error: eSis } = await supabase
    .from('sistemas').select('*').eq('id', sistemaId).single()
  if (eSis) throw eSis

  const tabelas = [
    'atributos', 'pericias', 'racas', 'classes', 'habilidades',
    'poderes', 'linhas_poder', 'pools', 'categorias_item',
    'propriedades_item', 'recompensas_nivel',
  ]
  const respostas = await Promise.all(
    tabelas.map(t => supabase.from(t).select('*').eq('sistema_id', sistemaId))
  )
  const dados = {}
  tabelas.forEach((t, i) => {
    if (respostas[i].error) throw respostas[i].error
    dados[t] = respostas[i].data || []
  })

  // modificadores: buscados por id do pai e aninhados (mesmo padrão do useSistema)
  const racaIds = dados.racas.map(r => r.id)
  const classeIds = dados.classes.map(c => c.id)
  const habIds = dados.habilidades.map(h => h.id)

  const [mRacas, mClasses, mHabs] = await Promise.all([
    racaIds.length ? supabase.from('modificadores').select('*').in('raca_id', racaIds) : Promise.resolve({ data: [] }),
    classeIds.length ? supabase.from('modificadores').select('*').in('classe_id', classeIds) : Promise.resolve({ data: [] }),
    habIds.length ? supabase.from('modificadores').select('*').in('habilidade_id', habIds) : Promise.resolve({ data: [] }),
  ])

  return {
    sistema,
    atributos: dados.atributos,
    pericias: dados.pericias,
    racas: dados.racas.map(r => ({ ...r, modificadores: (mRacas.data || []).filter(m => m.raca_id === r.id) })),
    classes: dados.classes.map(c => ({ ...c, modificadores: (mClasses.data || []).filter(m => m.classe_id === c.id) })),
    habilidades: dados.habilidades.map(h => ({ ...h, modificadores: (mHabs.data || []).filter(m => m.habilidade_id === h.id) })),
    poderes: dados.poderes,
    linhas_poder: dados.linhas_poder,
    pools: dados.pools,
    categorias_item: dados.categorias_item,
    propriedades_item: dados.propriedades_item,
    recompensas_nivel: dados.recompensas_nivel,
  }
}

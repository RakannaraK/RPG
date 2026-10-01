/**
 * Fase 52 — editor de sistema em seções (puro): o que mudou desde o último
 * salvamento e em qual seção. As listas que salvam sozinhas (raças, classes,
 * pools, poderes…) não passam por aqui; isto cobre o que depende do botão
 * "Salvar sistema": nome/descrição, atributos, perícias e as opções do layout.
 */

export const SECOES_SISTEMA = [
  { id: 'geral', rotulo: 'Geral', icone: 'ajustes', descricao: 'Nome, descrição e o arquivo do sistema (exportar).' },
  { id: 'atributos', rotulo: 'Atributos', icone: 'dado', descricao: 'As características das fichas e como cada uma é gerada: dados, valor fixo ou pontos.' },
  { id: 'ficha', rotulo: 'Ficha', icone: 'editar', descricao: 'O que aparece na ficha: perícias, combate, vida, como as rolagens se resolvem e a progressão.' },
  { id: 'racas', rotulo: 'Raças e classes', icone: 'pessoas', descricao: 'Origens e classes com os bônus e as habilidades de cada uma. Salva na hora.' },
  { id: 'descansos', rotulo: 'Descansos', icone: 'relogio', descricao: 'O que cada tipo de descanso recupera: vida, recursos e espaços.' },
  { id: 'recursos', rotulo: 'Recursos', icone: 'raio', descricao: 'Pontos gastáveis (mana, fôlego…) e espaços de magia. As listas salvam na hora.' },
  { id: 'poderes', rotulo: 'Poderes', icone: 'magia', descricao: 'Catálogo de poderes, magias ou técnicas, e linhas de poder. As listas salvam na hora.' },
  { id: 'maestria', rotulo: 'Maestria e itens', icone: 'espada', descricao: 'Maestria por uso e categorias de item.' },
  { id: 'simulador', rotulo: 'Simulador', icone: 'play', descricao: 'Teste o sistema numa ficha de mentira antes de usar com os jogadores.' },
]

// opções do layout que moram em seções próprias (o resto é da seção "Ficha")
const CONFIG_DE_SECAO = { descansos: 'descansos', poderes_rotulo: 'poderes', slots: 'recursos' }

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

/**
 * Seções com alteração não salva. `base` e `atual` têm a mesma forma:
 * { nome, descricao, atributos, pericias, configLayout, removidos }.
 */
export function secoesAlteradas(base, atual) {
  const s = new Set()
  if (!base || !atual) return s
  if (!igual(base.nome, atual.nome) || !igual(base.descricao, atual.descricao)) s.add('geral')
  if (!igual(base.atributos, atual.atributos) || (atual.removidos?.atributos?.length > 0)) s.add('atributos')
  if (!igual(base.pericias, atual.pericias) || (atual.removidos?.pericias?.length > 0)) s.add('ficha')
  const chaves = new Set([...Object.keys(base.configLayout || {}), ...Object.keys(atual.configLayout || {})])
  for (const k of chaves) {
    if (!igual(base.configLayout?.[k], atual.configLayout?.[k])) s.add(CONFIG_DE_SECAO[k] || (k.startsWith('maestria') || k.startsWith('categorias') ? 'maestria' : 'ficha'))
  }
  return s
}

/** "Atributos e Ficha" — para a barra de alterações. */
export function textoAlteradas(secoes) {
  const nomes = SECOES_SISTEMA.filter(x => secoes.has(x.id)).map(x => x.rotulo)
  if (!nomes.length) return ''
  return nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
}

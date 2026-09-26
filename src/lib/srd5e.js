/**
 * Fase 50 — bestiário do SRD 5.1 (puro): criatura -> arquivo de ficha portátil
 * (o mesmo formato do "exportar ficha", F30), para entrar pelo import que já existe.
 *
 * Cada sistema chama os atributos do seu jeito ("Força", "FOR", "STR"...): a
 * conversão procura o nome equivalente no sistema da mesa, para o valor cair no
 * lugar certo em vez de virar aviso.
 */
import { FORMATO_FICHA } from './fichaPortatil'
import { normalizar } from './formulaEngine'

export const ATRIBUICAO_SRD = 'Contém material do System Reference Document 5.1 (SRD 5.1) da Wizards of the Coast LLC, '
  + 'disponível em https://dnd.wizards.com/resources/systems-reference-document, licenciado pela Creative Commons '
  + 'Attribution 4.0 International (https://creativecommons.org/licenses/by/4.0/legalcode). '
  + 'Tradução e adaptação para o português pelo Dado & Pena.'

// nome padrão -> jeitos comuns de chamar o mesmo atributo
const ATRIBUTOS = [
  ['Força', ['forca', 'for', 'str', 'strength']],
  ['Destreza', ['destreza', 'des', 'dex', 'dexterity']],
  ['Constituição', ['constituicao', 'con', 'constitution']],
  ['Inteligência', ['inteligencia', 'int', 'intelligence']],
  ['Sabedoria', ['sabedoria', 'sab', 'wis', 'wisdom']],
  ['Carisma', ['carisma', 'car', 'cha', 'charisma']],
]
const CA = ['ca', 'classe de armadura', 'armadura', 'defesa', 'ac', 'armor class']

/** Nome que o sistema usa para esse conceito (ou o padrão, que vira aviso na prévia). */
function nomeNoSistema(padrao, apelidos, nomesDoSistema) {
  return nomesDoSistema.find(n => apelidos.includes(normalizar(n))) || padrao
}

export const modificador = valor => Math.floor((valor - 10) / 2)
const comSinal = n => (n >= 0 ? `+${n}` : `${n}`)

/** Bloco de texto da criatura (vai nos "traços" da ficha: nada se perde se o sistema for outro). */
export function blocoDeTexto(c) {
  const siglas = ['FOR', 'DES', 'CON', 'INT', 'SAB', 'CAR']
  const linhas = [
    `${c.tamanho} · ${c.tipo} · ${c.tendencia}`,
    `CA ${c.ca}${c.caNota ? ` (${c.caNota})` : ''} · PV ${c.pv} (${c.pvDados}) · Deslocamento ${c.desloc}`,
    siglas.map((s, i) => `${s} ${c.atr[i]} (${comSinal(modificador(c.atr[i]))})`).join(' · '),
    c.extras,
    `Nível de desafio ${c.nd}`,
  ]
  if (c.tracos?.length) linhas.push('', 'TRAÇOS', ...c.tracos)
  linhas.push('', 'AÇÕES', ...c.acoes.map(a => {
    if (a.texto) return `${a.nome}. ${a.texto}`
    const ataque = a.ataque != null ? `${comSinal(a.ataque)} para acertar, ${a.alcance}. ` : ''
    return `${a.nome}. ${ataque}Dano ${a.dano} ${a.tipo}.${a.obs ? ` ${a.obs}` : ''}`
  }))
  return linhas.filter(l => l != null).join('\n')
}

/**
 * Criatura -> arquivo portátil. `sistema` é o grafo do sistema da mesa
 * (carregarSistemaCompleto), usado só para achar os nomes equivalentes.
 */
export function criaturaParaArquivo(c, sistema = null) {
  const nomesAtr = (sistema?.atributos || []).map(a => a.nome)
  const campos = sistema?.sistema?.config_layout?.campos_combate || []
  const campoCa = campos.find(k => CA.includes(normalizar(k.nome || k.rotulo || '')))
  return {
    ...FORMATO_FICHA,
    exportado_em: new Date(0).toISOString(),
    sistema: { nome: 'D&D 5e (SRD 5.1)' },
    ficha: {
      nome_personagem: c.nome,
      nivel: 1,
      hp_maximo: c.pv,
      hp_atual: c.pv,
      tracos: blocoDeTexto(c),
      notas: ATRIBUICAO_SRD,
    },
    filhos: {
      valores_atributos: ATRIBUTOS.map(([padrao, apelidos], i) => ({ atributo: nomeNoSistema(padrao, apelidos, nomesAtr), valor: c.atr[i] })),
      valores_combate: campoCa ? [{ campo: campoCa.nome || campoCa.rotulo, valor: String(c.ca) }] : [],
      itens_ficha: c.acoes.filter(a => a.dano).map((a, i) => ({
        _idx: i,
        nome: a.nome,
        tipo: 'arma',
        equipado: true,
        descricao: [a.ataque != null ? `${comSinal(a.ataque)} para acertar, ${a.alcance}.` : null, a.obs].filter(Boolean).join(' ') || null,
        atributos_extras: { ...(a.ataque != null ? { ataque: `1d20+${a.ataque}` } : {}), dano: a.dano, tipo_dano: a.tipo },
      })),
    },
  }
}

/** Busca sem acento por nome, tipo ou ND; ordena por ND e depois por nome. */
export function buscarCriaturas(lista = [], busca = '') {
  const ndNum = nd => (String(nd).includes('/') ? 1 / Number(String(nd).split('/')[1]) : Number(nd))
  const t = normalizar(busca)
  return lista
    .filter(c => !t || normalizar(`${c.nome} ${c.tipo} nd ${c.nd}`).includes(t))
    .sort((a, b) => ndNum(a.nd) - ndNum(b.nd) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

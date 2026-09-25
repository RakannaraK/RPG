/**
 * Fase 46 — gerador de NPC sem IA (puro): tabelas escritas à mão + sorteio com
 * semente (o mesmo mulberry32 dos minigames), então dá para testar e repetir.
 * As frases são neutras de gênero de propósito; só o nome e o ofício flexionam.
 */
import { proximo } from './minigames/semente'

export const ESTILOS_NOME = [
  { id: 'brasileiro', nome: 'Brasileiro' },
  { id: 'fantasia', nome: 'Fantasia' },
]

const NOMES_BR = {
  f: ['Ana', 'Beatriz', 'Benedita', 'Cecília', 'Conceição', 'Dandara', 'Graça', 'Helena', 'Iara', 'Joana', 'Jurema', 'Luíza', 'Maria', 'Rosa', 'Tereza', 'Vitória'],
  m: ['Antônio', 'Benedito', 'Bento', 'Caetano', 'Diogo', 'Francisco', 'Inácio', 'Joaquim', 'José', 'Lourenço', 'Manoel', 'Raimundo', 'Sebastião', 'Severino', 'Tomé', 'Zé'],
}
const SOBRENOMES_BR = ['da Silva', 'dos Santos', 'Ferreira', 'Pereira', 'Almeida', 'Barbosa', 'Carvalho', 'Nascimento', 'Rocha', 'Souza', 'Cavalcanti', 'Monteiro', 'Batista', 'Ribeiro', 'Queiroz', 'Aragão']

const SILABAS = {
  inicio: ['Al', 'Bel', 'Cor', 'Dar', 'El', 'Fen', 'Gal', 'Har', 'Ith', 'Jor', 'Kael', 'Lir', 'Mor', 'Nar', 'Or', 'Pel', 'Quel', 'Ren', 'Syl', 'Tor', 'Ul', 'Vey', 'Wyn', 'Zar'],
  meio: ['', '', 'a', 'e', 'i', 'o', 'an', 'ar', 'el', 'en', 'ir', 'or'],
  fim: {
    f: ['a', 'ia', 'wen', 'riel', 'ise', 'ara', 'eth', 'ynn'],
    m: ['ric', 'an', 'or', 'us', 'dor', 'mir', 'th', 'ek'],
  },
}
const SOBRENOMES_FANTASIA = ['Pedranegra', 'Ventoalto', 'do Corvo', 'Martelo-Rubro', 'Brasaviva', 'Lua-Cinza', 'Folhaseca', 'Ferro-Velho', 'da Colina', 'Mão-de-Prata', 'Cinzafria', 'do Vau']

// [masculino, feminino]
const OFICIOS = [
  ['ferreiro', 'ferreira'], ['taverneiro', 'taverneira'], ['guarda', 'guarda'], ['sacerdote', 'sacerdotisa'],
  ['mercador', 'mercadora'], ['ladrão', 'ladra'], ['caçador', 'caçadora'], ['escriba', 'escriba'],
  ['curandeiro', 'curandeira'], ['marinheiro', 'marinheira'], ['bardo', 'barda'], ['fazendeiro', 'fazendeira'],
  ['nobre decadente', 'nobre decadente'], ['mendigo', 'mendiga'], ['alquimista', 'alquimista'], ['mensageiro', 'mensageira'],
  ['coveiro', 'coveira'], ['contrabandista', 'contrabandista'], ['cartógrafo', 'cartógrafa'], ['pescador', 'pescadora'],
  ['mercenário', 'mercenária'], ['bibliotecário', 'bibliotecária'], ['vendedor de amuletos', 'vendedora de amuletos'], ['cocheiro', 'cocheira'],
]

export const TABELAS_NPC = {
  aparencia: [
    'cicatriz atravessando a sobrancelha esquerda', 'dentes de ouro que brilham ao sorrir', 'nunca tira o capuz',
    'mãos manchadas de tinta', 'tatuagem de serpente no pescoço', 'cabelo trançado com contas de osso',
    'um olho de cada cor', 'cheiro forte de fumo de cachimbo', 'roupas finas, mas remendadas',
    'anda com uma bengala de que não parece precisar', 'voz rouca, quase um sussurro', 'sardas pelo rosto inteiro',
    'orelha cortada pela metade', 'anéis em todos os dedos', 'botas enlameadas até o joelho',
    'sempre com um gato no ombro', 'sobrancelhas enormes e expressivas', 'queimadura antiga nas duas mãos',
    'altura fora do comum', 'sorriso que não chega aos olhos',
  ],
  personalidade: [
    // cada uma completa "<ofício> que ..." no resumo do verbete
    'desconfia de quem não conhece', 'ri alto de qualquer coisa', 'fala pouco e observa muito',
    'tem generosidade de sobra', 'se ofende com facilidade', 'tem pavor de magia',
    'deixa a curiosidade vencer o bom senso', 'conta cada moeda duas vezes', 'adora uma boa fofoca',
    'leva tudo ao pé da letra', 'vive de saudade dos velhos tempos', 'tem fé cega nos deuses',
    'faz piada nas piores horas', 'é leal até o fim a quem ajuda', 'mente por hábito, mesmo sem motivo',
    'trata todo mundo como cliente',
  ],
  maneirismo: [
    'termina toda frase com uma pergunta', 'cita provérbios que ninguém conhece', 'fala de si na terceira pessoa',
    'assobia de nervoso', 'gesticula demais', 'nunca olha nos olhos', 'chama todo mundo de "meu bem"',
    'conta nos dedos enquanto pensa', 'esquece nomes e inventa apelidos', 'fala baixo, obrigando a chegar perto',
    'estala os dedos antes de responder', 'repete a última palavra de quem falou',
  ],
  motivacao: [
    'pagar uma dívida antiga com gente perigosa', 'reencontrar o irmão que sumiu no mar', 'provar que vale mais do que dizem',
    'juntar dinheiro para sair da cidade', 'proteger a família a qualquer custo', 'vingar a morte de quem lhe ensinou tudo',
    'recuperar uma herança roubada', 'deixar o nome na história', 'achar a cura para uma doença que esconde',
    'manter o negócio de pé num ano ruim', 'descobrir quem é seu pai de verdade', 'fugir de um casamento arranjado',
    'ganhar o perdão de um velho amigo', 'subir na vida, custe o que custar',
  ],
  segredo: [
    'é informante da guarda', 'deve dinheiro ao chefe dos ladrões', 'já foi de um culto — e o culto ainda procura',
    'roubou o que tem de mais valioso', 'vem de família nobre e se esconde', 'sabe onde há um tesouro enterrado, mas tem medo de ir',
    'carrega uma maldição que piora a cada lua cheia', 'causou uma morte por acidente e escondeu tudo', 'trabalha para o vilão sem saber',
    'tem um filho que ninguém conhece', 'falsifica documentos para quem pagar', 'ouviu o que não devia e está sendo seguido',
  ],
  gancho: [
    'pede ajuda para achar um animal fugido — que não é bem um animal', 'oferece um mapa rasgado em troca de proteção',
    'confunde um dos heróis com um velho conhecido', 'precisa que alguém entregue uma carta sem abrir',
    'paga bem para vigiarem a casa esta noite', 'está sendo cobrado na frente de todos quando os heróis chegam',
    'tem uma informação e só troca por um favor', 'pede escolta até a próxima cidade',
    'vende um item que claramente foi roubado', 'desmaia na frente dos heróis com um bilhete na mão',
    'desafia o grupo para uma aposta', 'precisa de testemunhas para um acordo',
  ],
}

// campos sorteáveis um a um (o nome e o ofício dependem do gênero sorteado)
export const CAMPOS_NPC = ['nome', 'ocupacao', 'aparencia', 'personalidade', 'maneirismo', 'motivacao', 'segredo', 'gancho']

/** Um sorteio: `[item, estadoNovo]`. */
function sortear(lista, s) {
  const p = proximo(s)
  return [lista[Math.floor(p.valor * lista.length)], p.s]
}

function gerarNome(estilo, genero, s) {
  let a, b, c, d
  if (estilo === 'fantasia') {
    ;[a, s] = sortear(SILABAS.inicio, s)
    ;[b, s] = sortear(SILABAS.meio, s)
    ;[c, s] = sortear(SILABAS.fim[genero], s)
    ;[d, s] = sortear(SOBRENOMES_FANTASIA, s)
    return [`${a}${b}${c} ${d}`, s]
  }
  ;[a, s] = sortear(NOMES_BR[genero], s)
  ;[d, s] = sortear(SOBRENOMES_BR, s)
  return [`${a} ${d}`, s]
}

/** Sorteia um campo só (para o botão de "rolar de novo este"). */
export function sortearCampo(campo, { estilo = 'brasileiro', genero = 'f' } = {}, s) {
  if (campo === 'nome') return gerarNome(estilo, genero, s)
  if (campo === 'ocupacao') {
    const [par, s2] = sortear(OFICIOS, s)
    return [par[genero === 'f' ? 1 : 0], s2]
  }
  return sortear(TABELAS_NPC[campo], s)
}

/** NPC inteiro. Devolve também a semente seguinte, para continuar sorteando. */
export function gerarNpc({ estilo = 'brasileiro', s = 1 } = {}) {
  let genero
  ;[genero, s] = sortear(['f', 'm'], s)
  const npc = { estilo, genero }
  for (const campo of CAMPOS_NPC) [npc[campo], s] = sortearCampo(campo, npc, s)
  return { npc, s }
}

const maiuscula = t => (t ? t[0].toLocaleUpperCase('pt-BR') + t.slice(1) : t)

/** NPC -> linha de verbete da enciclopédia (F41). Segredo e gancho vão para as notas do mestre. */
export function npcParaVerbete(npc) {
  return {
    tipo: 'npc',
    titulo: npc.nome,
    resumo: `${maiuscula(npc.ocupacao)} que ${npc.personalidade}.`,
    campos: {
      aparencia: maiuscula(npc.aparencia) + '.',
      personalidade: `${maiuscula(npc.personalidade)}; ${npc.maneirismo}.`,
      motivacao: maiuscula(npc.motivacao) + '.',
    },
    segredo: `Segredo: ${npc.segredo}.\nGancho: ${npc.gancho}.`,
    corpo: '',
    tags: ['gerado'],
  }
}

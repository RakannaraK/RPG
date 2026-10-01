/**
 * Fase 35 — personalização (puro): temas, fontes e limites do áudio enviado.
 * As paletas mexem só no ACENTO: o contraste do texto continua o mesmo, para
 * nenhum tema deixar a leitura ruim.
 */

// F52 — cada tema tem uma "afinidade": a partícula do fundo e a frase que a
// descreve nas preferências. A cor das partículas vem de --energia-* (tokens.css).
export const TEMAS = [
  { id: 'violeta', nome: 'Violeta', amostra: '#8B5CF6', cores: ['#A78BFA', '#60A5FA'], particula: 'runas', energia: 'Energia arcana roxa e azulada' },
  { id: 'esmeralda', nome: 'Esmeralda', amostra: '#10B981', cores: ['#6EE7B7', '#A7F3D0'], particula: 'eter', energia: 'Partículas etéreas flutuando' },
  { id: 'carmim', nome: 'Carmim', amostra: '#E11D48', cores: ['#FB923C', '#F43F5E'], particula: 'brasas', energia: 'Brasas subindo devagar' },
  { id: 'ambar', nome: 'Âmbar', amostra: '#F59E0B', cores: ['#FCD34D', '#F59E0B'], particula: 'faiscas', energia: 'Faíscas douradas' },
  { id: 'gelo', nome: 'Gelo', amostra: '#38BDF8', cores: ['#E0F2FE', '#7DD3FC'], particula: 'neve', energia: 'Poeira congelada e névoa' },
]

export const FONTES = [
  { id: 'padrao', nome: 'Padrão' },
  { id: 'serifada', nome: 'Serifada' },
  { id: 'mono', nome: 'Monoespaçada' },
  { id: 'facil', nome: 'Leitura fácil (mais espaço)' },
]

export const LIMITE_SOM = { segundos: 15, bytes: 1_500_000 }

// F52 — movimento funcional (modal, aba, página) e ambientação (partículas,
// fogo, aura) se desligam em separado. O primeiro de cada lista é o padrão.
export const ANIMACOES = [
  { id: 'completas', nome: 'Completas', dica: 'Transições de tela, de abas e de janelas.' },
  { id: 'reduzidas', nome: 'Reduzidas', dica: 'Só um esmaecer curto; nada desliza nem pulsa.' },
  { id: 'desligadas', nome: 'Desligadas', dica: 'Tudo troca na hora.' },
]
export const EFEITOS = [
  { id: 'completos', nome: 'Completos', dica: 'Partículas, chama arcana e luz ambiente.' },
  { id: 'sutis', nome: 'Sutis', dica: 'Só brilho e luz, sem nada se mexendo no fundo.' },
  { id: 'desligados', nome: 'Desligados', dica: 'Fundo liso, sem efeito nenhum.' },
]
export const TAMANHOS_TEXTO = [
  { id: 'normal', nome: 'Normal' },
  { id: 'grande', nome: 'Grande' },
  { id: 'maior', nome: 'Maior' },
]

export const ehTemaValido = id => TEMAS.some(t => t.id === id)
export const ehFonteValida = id => FONTES.some(f => f.id === id)
const valido = (lista, id) => lista.some(x => x.id === id)

/** Atributos que o site usa no <html> para aplicar a aparência. O padrão de
 *  cada opção não marca nada (o <html> fica limpo para quem não mexeu). */
export function atributosDeAparencia({ tema, fonte, animacoes, efeitos, tamanho_texto, alto_contraste } = {}) {
  return {
    'data-tema': ehTemaValido(tema) && tema !== 'violeta' ? tema : null,
    'data-fonte': ehFonteValida(fonte) && fonte !== 'padrao' ? fonte : null,
    'data-animacoes': valido(ANIMACOES, animacoes) && animacoes !== 'completas' ? animacoes : null,
    'data-efeitos': valido(EFEITOS, efeitos) && efeitos !== 'completos' ? efeitos : null,
    'data-tamanho': valido(TAMANHOS_TEXTO, tamanho_texto) && tamanho_texto !== 'normal' ? tamanho_texto : null,
    'data-contraste': alto_contraste === true ? 'alto' : null,
  }
}

/** Movimento reduzido: pedido do sistema operacional OU escolha da pessoa. */
export const reduzMovimento = (animacoes, sistemaPediu) => !!sistemaPediu || (animacoes != null && animacoes !== 'completas')

/** Partículas no fundo só com efeitos completos e movimento normal. */
export const particulasLigadas = (efeitos, reduzido) => !reduzido && (efeitos == null || efeitos === 'completos')

/**
 * Verifica o arquivo de som antes de enviar.
 * @param arquivo {{ type, size, name }} (File do navegador)
 * @param duracaoSegundos número lido pelo navegador (null = ainda não sei)
 * @returns {{ ok: true } | { ok: false, erro: string }}
 */
export function validarSom(arquivo, duracaoSegundos = null) {
  if (!arquivo) return { ok: false, erro: 'Escolha um arquivo de áudio.' }
  const tipo = String(arquivo.type || '')
  if (!tipo.startsWith('audio/')) return { ok: false, erro: 'O arquivo precisa ser de áudio (mp3, ogg, wav…).' }
  if (Number(arquivo.size) > LIMITE_SOM.bytes) {
    return { ok: false, erro: `O arquivo tem ${(arquivo.size / 1_000_000).toFixed(1)} MB; o limite é ${(LIMITE_SOM.bytes / 1_000_000).toFixed(1)} MB.` }
  }
  if (duracaoSegundos != null && Number.isFinite(duracaoSegundos) && duracaoSegundos > LIMITE_SOM.segundos + 0.5) {
    return { ok: false, erro: `O som tem ${duracaoSegundos.toFixed(1)} s; o limite é ${LIMITE_SOM.segundos} s.` }
  }
  return { ok: true }
}

/** Extensão segura a partir do tipo/nome (para o caminho no Storage). */
export function extensaoDoSom(arquivo) {
  const doNome = String(arquivo?.name || '').match(/\.([a-z0-9]{2,4})$/i)?.[1]
  if (doNome) return doNome.toLowerCase()
  const doTipo = String(arquivo?.type || '').split('/')[1]
  return (doTipo || 'mp3').replace(/[^a-z0-9]/gi, '').slice(0, 4).toLowerCase() || 'mp3'
}

/** Uma mídia de habilidade é som? (se não, tratamos como imagem) */
export const midiaEhSom = url => /\.(mp3|ogg|wav|m4a|aac|opus|webm)(\?|$)/i.test(String(url || ''))

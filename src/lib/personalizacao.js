/**
 * Fase 35 — personalização (puro): temas, fontes e limites do áudio enviado.
 * As paletas mexem só no ACENTO: o contraste do texto continua o mesmo, para
 * nenhum tema deixar a leitura ruim.
 */

export const TEMAS = [
  { id: 'violeta', nome: 'Violeta (padrão)', amostra: '#8B5CF6' },
  { id: 'esmeralda', nome: 'Esmeralda', amostra: '#10B981' },
  { id: 'carmim', nome: 'Carmim', amostra: '#E11D48' },
  { id: 'ambar', nome: 'Âmbar', amostra: '#F59E0B' },
  { id: 'gelo', nome: 'Gelo', amostra: '#38BDF8' },
]

export const FONTES = [
  { id: 'padrao', nome: 'Padrão' },
  { id: 'serifada', nome: 'Serifada' },
  { id: 'mono', nome: 'Monoespaçada' },
  { id: 'facil', nome: 'Leitura fácil (mais espaço)' },
]

export const LIMITE_SOM = { segundos: 15, bytes: 1_500_000 }

export const ehTemaValido = id => TEMAS.some(t => t.id === id)
export const ehFonteValida = id => FONTES.some(f => f.id === id)

/** Atributos que o site usa no <html> para aplicar tema e fonte. */
export function atributosDeAparencia({ tema, fonte } = {}) {
  return {
    'data-tema': ehTemaValido(tema) && tema !== 'violeta' ? tema : null, // padrão não precisa de marca
    'data-fonte': ehFonteValida(fonte) && fonte !== 'padrao' ? fonte : null,
  }
}

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

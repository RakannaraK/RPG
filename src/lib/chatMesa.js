import { validarNotacao } from './diceNotation'

/** Fase 29.2 — regras do chat da mesa (puro). */

export const TAMANHO_MAX_MENSAGEM = 2000
const GESTORES = ['mestre', 'co-mestre']

/**
 * O que o texto digitado vira:
 *   '/r 2d6+3 ataque' → { tipo: 'rolagem', notacao: '2d6+3', rotulo: 'ataque' }
 *   'olá'             → { tipo: 'mensagem', texto: 'olá' }
 *   erro de comando   → { tipo: 'erro', erro }
 *   só espaços        → null
 */
export function interpretarEntrada(bruto) {
  const texto = String(bruto || '').trim()
  if (!texto) return null
  if (!texto.startsWith('/')) {
    if (texto.length > TAMANHO_MAX_MENSAGEM) return { tipo: 'erro', erro: `Mensagem longa demais (máximo ${TAMANHO_MAX_MENSAGEM} caracteres).` }
    return { tipo: 'mensagem', texto }
  }
  const [comando, notacao = '', ...resto] = texto.split(/\s+/)
  if (!['/r', '/roll', '/rolar'].includes(comando.toLowerCase())) {
    return { tipo: 'erro', erro: `Comando desconhecido: ${comando}. Use /r 2d6+3 para rolar.` }
  }
  if (!validarNotacao(notacao)) {
    return { tipo: 'erro', erro: notacao ? `Notação inválida: ${notacao}. Ex.: /r 1d20+5 ataque` : 'Diga o que rolar. Ex.: /r 1d20+5 ataque' }
  }
  return { tipo: 'rolagem', notacao, rotulo: resto.join(' ') || null }
}

/**
 * Destinatários (coluna `para`) da opção escolhida no seletor.
 * 'todos' → null (mesa toda) · 'mestres' → mestre e co-mestres · id de usuário → só ele.
 * Nunca inclui o próprio autor (ele lê a mensagem de qualquer jeito).
 */
export function destinatarios(opcao, membros, meuId) {
  if (!opcao || opcao === 'todos') return null
  const ids = opcao === 'mestres'
    ? membros.filter(m => GESTORES.includes(m.role)).map(m => m.usuario_id)
    : [opcao]
  const para = ids.filter(id => id && id !== meuId)
  return para.length ? para : null
}

/** Opções do seletor "para quem": mesa toda, mestres (se houver outro) e cada membro. */
export function opcoesDestino(membros, meuId) {
  const outros = membros.filter(m => m.usuario_id !== meuId)
  const temMestre = outros.some(m => GESTORES.includes(m.role))
  return [
    { valor: 'todos', rotulo: 'Mesa toda' },
    ...(temMestre ? [{ valor: 'mestres', rotulo: '🎩 Só os mestres' }] : []),
    ...outros.map(m => ({ valor: m.usuario_id, rotulo: `🤫 ${m.nome}` })),
  ]
}

/** "🤫 para Aria e Borin" (quem mandou) / "🤫 sussurro para você" (quem recebeu) / null. */
export function rotuloSussurro(msg, meuId, nomeDe) {
  if (!msg.para?.length) return null
  if (msg.autor_id === meuId) {
    const nomes = msg.para.map(nomeDe)
    const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0]
    return `🤫 para ${lista}`
  }
  return msg.para.length > 1 ? '🤫 sussurro para você e outros' : '🤫 sussurro para você'
}

/** Mensagens de outros depois de `vistoEm` (ISO). */
export function contarNaoLidas(mensagens, vistoEm, meuId) {
  const desde = vistoEm ? Date.parse(vistoEm) : 0
  return mensagens.filter(m => m.autor_id !== meuId && Date.parse(m.created_at) > desde).length
}

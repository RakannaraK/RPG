/**
 * Fase 52 — guia do mestre em passos (puro). Cada passo só aparece como feito
 * quando dá para CONFIRMAR pelo que existe no banco — nunca por palpite.
 */
export function passosDoGuia({ mesaId = null, atributos = 0, outrosMembros = 0, fichas = 0, sessoes = 0 } = {}) {
  const aba = nome => (mesaId ? `/mesa/${mesaId}?aba=${encodeURIComponent(nome)}` : null)
  return [
    { id: 'mesa', titulo: 'Crie a mesa', texto: 'A mesa é o seu grupo de jogo: ali ficam as fichas, o sistema e as sessões.', feito: !!mesaId, acao: mesaId ? null : { rotulo: 'Criar mesa', para: '/dashboard', criar: true } },
    { id: 'sistema', titulo: 'Monte o sistema', texto: 'Na aba Sistema: comece de um modelo pronto, importe um .json ou crie do zero. Dá para mudar tudo depois.', feito: atributos > 0, acao: aba('Sistema') && { rotulo: 'Ir para o sistema', para: aba('Sistema') } },
    { id: 'convite', titulo: 'Convide os jogadores', texto: 'Mande o código ou o link de convite. Quem abrir o link entra direto.', feito: outrosMembros > 0, acao: aba('Membros') && { rotulo: 'Ver o convite', para: aba('Membros') } },
    { id: 'fichas', titulo: 'Criem os personagens', texto: 'Cada jogador cria a ficha seguindo o sistema da mesa.', feito: fichas > 0, acao: aba('Fichas') && { rotulo: 'Ver as fichas', para: aba('Fichas') } },
    { id: 'sessao', titulo: 'Comece a sessão', texto: 'O modo sessão junta fichas, rolagens e combate ao vivo para todo mundo.', feito: sessoes > 0, acao: mesaId && { rotulo: 'Abrir a mesa', para: `/mesa/${mesaId}` } },
  ]
}

export const quantosFeitos = passos => passos.filter(p => p.feito).length

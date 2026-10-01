/**
 * Fase 52 — apresentação das notificações (puro): ícone por tipo, grupos por
 * dia e hora relativa. O banco grava `tipo` livre (sessao_iniciada,
 * promovido_comestre, removido_mesa, pedido_vaga, verbete_revelado…); o
 * prefixo decide o ícone, então tipo novo cai num ícone que faz sentido.
 */

const ICONES = [
  [/^sess|agenda/, 'vivo'],
  [/promov|rebaix|papel|posse|mestre/, 'coroa'],
  [/remov|expul|saiu/, 'porta'],
  [/vaga|pedido|convite|entrou/, 'pessoas'],
  [/verbete|revel|handout|encicl/, 'olho'],
  [/desafio|minigame|jogo/, 'dado'],
]

export function iconeDaNotificacao(tipo) {
  const t = String(tipo || '')
  return ICONES.find(([re]) => re.test(t))?.[1] || 'sino'
}

const DIA = 86_400_000
const inicioDoDia = d => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Separa em Hoje / Ontem / Esta semana / Antes, mantendo a ordem de chegada. */
export function agruparPorDia(lista, agora = new Date()) {
  const hoje = inicioDoDia(agora)
  const grupos = []
  for (const n of lista || []) {
    const t = new Date(n.created_at).getTime()
    const rotulo = t >= hoje ? 'Hoje' : t >= hoje - DIA ? 'Ontem' : t >= hoje - 6 * DIA ? 'Esta semana' : 'Antes'
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.rotulo === rotulo) ultimo.itens.push(n)
    else grupos.push({ rotulo, itens: [n] })
  }
  return grupos
}

/** "agora", "5 min", "3 h", "ontem 19:32", "14/07 19:32". */
export function quandoFoi(ts, agora = new Date()) {
  if (!ts) return ''
  const d = new Date(ts)
  const seg = Math.floor((agora - d) / 1000)
  if (seg < 60) return 'agora'
  if (seg < 3600) return `${Math.floor(seg / 60)} min`
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.getTime() >= inicioDoDia(agora)) return `${Math.floor(seg / 3600)} h`
  if (d.getTime() >= inicioDoDia(agora) - DIA) return `ontem ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
}

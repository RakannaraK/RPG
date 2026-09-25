/**
 * Fase 40 — agenda da mesa (puro): quando o grupo se encontra na vida real.
 *
 * Um evento tem `inicio` (instante), `duracao_min`, `recorrencia` e `ate`
 * (data local opcional em que a recorrência acaba). As contas de calendário
 * (mês seguinte, "hoje", "amanhã") são feitas no FUSO da mesa, nunca no do
 * servidor — senão uma sessão às 22h viraria "amanhã" em UTC.
 */

export const FUSO_PADRAO = 'America/Sao_Paulo'

export const RECORRENCIAS = [
  { id: 'nenhuma', nome: 'Uma vez' },
  { id: 'semanal', nome: 'Toda semana' },
  { id: 'quinzenal', nome: 'A cada 2 semanas' },
  { id: 'mensal', nome: 'Todo mês' },
]

const MIN = 60 * 1000
const DIA = 24 * 60 * MIN

/** Partes de data/hora de um instante, vistas no fuso pedido. */
export function partesNoFuso(data, timeZone = FUSO_PADRAO) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p = Object.fromEntries(f.formatToParts(data).map(x => [x.type, x.value]))
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute, segundo: +p.second }
}

/** Instante que corresponde a um horário de parede no fuso (sem biblioteca). */
export function deHorarioNoFuso({ ano, mes, dia, hora = 0, minuto = 0 }, timeZone = FUSO_PADRAO) {
  let t = Date.UTC(ano, mes - 1, dia, hora, minuto)
  for (let i = 0; i < 2; i++) { // duas voltas bastam: acerta o deslocamento do fuso
    const p = partesNoFuso(new Date(t), timeZone)
    const visto = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto)
    t += Date.UTC(ano, mes - 1, dia, hora, minuto) - visto
  }
  return new Date(t)
}

function diasNoMes(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** A n-ésima ocorrência (n = 0 é a primeira). */
export function enesimaOcorrencia(evento, n, timeZone = FUSO_PADRAO) {
  const base = new Date(evento.inicio)
  if (evento.recorrencia === 'semanal') return new Date(base.getTime() + n * 7 * DIA)
  if (evento.recorrencia === 'quinzenal') return new Date(base.getTime() + n * 14 * DIA)
  if (evento.recorrencia === 'mensal') {
    const p = partesNoFuso(base, timeZone)
    const totalMeses = p.mes - 1 + n
    const ano = p.ano + Math.floor(totalMeses / 12)
    const mes = (totalMeses % 12) + 1
    // dia 31 num mês de 30: cai no último dia do mês
    const dia = Math.min(p.dia, diasNoMes(ano, mes))
    return deHorarioNoFuso({ ano, mes, dia, hora: p.hora, minuto: p.minuto }, timeZone)
  }
  return n === 0 ? base : null
}

function dataLocalISO(data, timeZone) {
  const p = partesNoFuso(data, timeZone)
  return `${p.ano}-${String(p.mes).padStart(2, '0')}-${String(p.dia).padStart(2, '0')}`
}

/**
 * Próxima ocorrência que ainda não TERMINOU (sessão em andamento conta).
 * @returns {{ inicio: Date, fim: Date } | null}
 */
export function proximaOcorrencia(evento, agora = new Date(), timeZone = FUSO_PADRAO) {
  if (!evento?.inicio) return null
  const duracao = (Number(evento.duracao_min) || 180) * MIN
  const passo = evento.recorrencia === 'semanal' ? 7 * DIA : evento.recorrencia === 'quinzenal' ? 14 * DIA : null
  // pula direto para perto de agora nas recorrências de passo fixo
  let n = passo ? Math.max(0, Math.floor((agora - new Date(evento.inicio) - duracao) / passo)) : 0
  for (let volta = 0; volta < 1000; volta++, n++) {
    const inicio = enesimaOcorrencia(evento, n, timeZone)
    if (!inicio) return null
    if (evento.ate && dataLocalISO(inicio, timeZone) > evento.ate) return null
    const fim = new Date(inicio.getTime() + duracao)
    if (fim > agora) return { inicio, fim }
    if (evento.recorrencia === 'nenhuma' || !evento.recorrencia) return null
  }
  return null
}

/** A mais próxima entre várias agendas da mesa. */
export function proximaDaMesa(eventos, agora = new Date(), timeZone = FUSO_PADRAO) {
  let melhor = null
  for (const ev of eventos || []) {
    const o = proximaOcorrencia(ev, agora, timeZone)
    if (o && (!melhor || o.inicio < melhor.inicio)) melhor = { evento: ev, ...o }
  }
  return melhor
}

/** Chave estável de uma ocorrência (bate com o timestamptz que volta do banco). */
export const chaveOcorrencia = data => new Date(data).toISOString()

/** "hoje às 20:00", "amanhã às 20:00", "sáb., 27/09 às 20:00". */
export function textoQuando(inicio, agora = new Date(), timeZone = FUSO_PADRAO) {
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }).format(inicio)
  const dia = dataLocalISO(inicio, timeZone)
  const hoje = dataLocalISO(agora, timeZone)
  const amanha = dataLocalISO(new Date(agora.getTime() + DIA), timeZone)
  if (dia === hoje) return `hoje às ${hora}`
  if (dia === amanha) return `amanhã às ${hora}`
  const data = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'short', day: '2-digit', month: '2-digit' }).format(inicio)
  return `${data} às ${hora}`
}

/** "acontecendo agora", "começa em 40 min", "daqui a 5 h", "daqui a 3 dias". */
export function textoFalta(inicio, fim, agora = new Date()) {
  if (agora >= inicio && agora < fim) return 'acontecendo agora'
  const ms = inicio - agora
  if (ms <= 0) return 'já passou'
  const min = Math.round(ms / MIN)
  if (min < 60) return `começa em ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `daqui a ${h} h`
  // dias para baixo: 2 dias e 19 h é "daqui a 2 dias", como se fala
  const d = Math.floor(min / (60 * 24))
  return `daqui a ${d} ${d === 1 ? 'dia' : 'dias'}`
}

/** Conta as respostas de UMA ocorrência. */
export function contarRespostas(presencas, ocorrencia) {
  const chave = chaveOcorrencia(ocorrencia)
  const c = { vou: 0, talvez: 0, nao: 0 }
  for (const p of presencas || []) {
    if (chaveOcorrencia(p.ocorrencia) === chave && c[p.resposta] !== undefined) c[p.resposta]++
  }
  return c
}

export function validarAgenda({ inicio, duracao_min, recorrencia, ate }) {
  if (!inicio || Number.isNaN(new Date(inicio).getTime())) return { ok: false, erro: 'Escolha dia e hora.' }
  const d = Number(duracao_min)
  if (!Number.isFinite(d) || d < 15 || d > 1440) return { ok: false, erro: 'Duração entre 15 min e 24 h.' }
  if (!RECORRENCIAS.some(r => r.id === recorrencia)) return { ok: false, erro: 'Recorrência inválida.' }
  if (ate && recorrencia !== 'nenhuma' && ate < dataLocalISO(new Date(inicio), FUSO_PADRAO)) {
    return { ok: false, erro: 'O fim da recorrência é antes da primeira sessão.' }
  }
  return { ok: true }
}

/**
 * Fase 29 — calendário do mundo (puro, sem React nem banco).
 *
 * Datas são { ano, mes, dia } com mes e dia começando em 1. Internamente tudo
 * vira "dia absoluto" (dias desde 1/1 do ano 1, pode ser negativo), o que
 * deixa avançar/voltar e dia da semana triviais.
 */

export const PRESETS_CALENDARIO = {
  gregoriano: {
    nome: 'Gregoriano (sem ano bissexto)',
    meses: [
      ['Janeiro', 31], ['Fevereiro', 28], ['Março', 31], ['Abril', 30], ['Maio', 31], ['Junho', 30],
      ['Julho', 31], ['Agosto', 31], ['Setembro', 30], ['Outubro', 31], ['Novembro', 30], ['Dezembro', 31],
    ].map(([nome, dias]) => ({ nome, dias })),
    dias_semana: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
    deslocamento: 1, // 1/1 do ano 1 foi uma segunda
    sufixo_ano: '',
  },
  fantasia: {
    nome: 'Fantasia (12 meses de 30 dias)',
    meses: ['Degelo', 'Semeadura', 'Florada', 'Chuvas', 'Sol Alto', 'Colheita',
      'Vindima', 'Brumas', 'Geada', 'Longa Noite', 'Cinzas', 'Renascer'].map(nome => ({ nome, dias: 30 })),
    dias_semana: ['Dia da Lua', 'Dia do Ferro', 'Dia da Chama', 'Dia da Raiz', 'Dia do Vento', 'Dia da Pedra', 'Dia do Sol'],
    deslocamento: 0,
    sufixo_ano: '',
  },
}

const inteiro = (v, padrao) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : padrao)
const mod = (a, n) => ((a % n) + n) % n

/** Config vinda do banco (pode estar vazia ou torta) → calendário utilizável. */
export function normalizarCalendario(config) {
  const c = config && typeof config === 'object' ? config : {}
  const meses = (Array.isArray(c.meses) ? c.meses : [])
    .map((m, i) => ({ nome: String(m?.nome || '').trim() || `Mês ${i + 1}`, dias: Math.max(1, inteiro(m?.dias, 30)) }))
  if (meses.length === 0) return { ...PRESETS_CALENDARIO.fantasia, nome: String(c.nome || '').trim() || PRESETS_CALENDARIO.fantasia.nome }
  const dias_semana = (Array.isArray(c.dias_semana) ? c.dias_semana : []).map(d => String(d || '').trim()).filter(Boolean)
  return {
    nome: String(c.nome || '').trim() || 'Calendário',
    meses,
    dias_semana,
    deslocamento: dias_semana.length ? mod(inteiro(c.deslocamento, 0), dias_semana.length) : 0,
    sufixo_ano: String(c.sufixo_ano || '').trim(),
  }
}

export const diasNoAno = cal => cal.meses.reduce((s, m) => s + m.dias, 0)

/** Ajusta mês/dia para caberem no calendário (ex.: depois de o mestre encurtar um mês). */
export function limitarData(data, cal) {
  const mes = Math.min(Math.max(1, inteiro(data?.mes, 1)), cal.meses.length)
  const dia = Math.min(Math.max(1, inteiro(data?.dia, 1)), cal.meses[mes - 1].dias)
  return { ano: inteiro(data?.ano, 1), mes, dia }
}

export function diaAbsoluto(data, cal) {
  const d = limitarData(data, cal)
  let n = (d.ano - 1) * diasNoAno(cal)
  for (let i = 0; i < d.mes - 1; i++) n += cal.meses[i].dias
  return n + d.dia - 1
}

export function deAbsoluto(n, cal) {
  const total = diasNoAno(cal)
  const ano = Math.floor(n / total) + 1
  let resto = n - (ano - 1) * total
  let mes = 1
  while (resto >= cal.meses[mes - 1].dias) {
    resto -= cal.meses[mes - 1].dias
    mes++
  }
  return { ano, mes, dia: resto + 1 }
}

export const avancarDias = (data, n, cal) => deAbsoluto(diaAbsoluto(data, cal) + inteiro(n, 0), cal)

/** Índice em cal.dias_semana, ou null se o calendário não tem semana. */
export function diaDaSemana(data, cal) {
  if (!cal.dias_semana.length) return null
  return mod(diaAbsoluto(data, cal) + cal.deslocamento, cal.dias_semana.length)
}

/**
 * Semanas do mês para desenhar a grade: arrays de `colunas` posições, com
 * null antes do dia 1 e depois do último. Sem semana definida, linhas de 7.
 */
export function gradeDoMes(ano, mes, cal) {
  const colunas = cal.dias_semana.length || 7
  const inicio = diaDaSemana({ ano, mes, dia: 1 }, cal) ?? 0
  const dias = cal.meses[mes - 1].dias
  const celulas = [...Array(inicio).fill(null), ...Array.from({ length: dias }, (_, i) => i + 1)]
  while (celulas.length % colunas) celulas.push(null)
  const semanas = []
  for (let i = 0; i < celulas.length; i += colunas) semanas.push(celulas.slice(i, i + colunas))
  return semanas
}

const casaNoDia = (e, d) => e.mes === d.mes && e.dia === d.dia && (e.ano == null || e.ano === d.ano)

export const eventosDoDia = (eventos, data) => (eventos || []).filter(e => casaNoDia(e, data))

/**
 * Próximas ocorrências a partir de `data` (inclusive), até `horizonte` dias.
 * Evento anual conta a próxima vez que acontece; evento único, só se ainda vem.
 * @returns [{ evento, data, emDias }] em ordem
 */
export function proximosEventos(eventos, data, cal, { horizonte = diasNoAno(cal), limite = 5 } = {}) {
  const hoje = diaAbsoluto(data, cal)
  const out = []
  for (const e of eventos || []) {
    let alvo
    if (e.ano == null) {
      alvo = diaAbsoluto({ ano: data.ano, mes: e.mes, dia: e.dia }, cal)
      if (alvo < hoje) alvo = diaAbsoluto({ ano: data.ano + 1, mes: e.mes, dia: e.dia }, cal)
    } else {
      alvo = diaAbsoluto(e, cal)
    }
    const emDias = alvo - hoje
    if (emDias >= 0 && emDias <= horizonte) out.push({ evento: e, data: deAbsoluto(alvo, cal), emDias })
  }
  return out.sort((a, b) => a.emDias - b.emDias).slice(0, limite)
}

/** "Dia da Chama, 15 de Florada de 1024 DR" (sem o dia da semana se o calendário não tiver). */
export function formatarData(data, cal, { semana = true } = {}) {
  const d = limitarData(data, cal)
  const sd = semana ? diaDaSemana(d, cal) : null
  const base = `${d.dia} de ${cal.meses[d.mes - 1].nome} de ${d.ano}${cal.sufixo_ano ? ` ${cal.sufixo_ano}` : ''}`
  return sd == null ? base : `${cal.dias_semana[sd]}, ${base}`
}

export function textoPassagem(n) {
  const abs = Math.abs(n)
  const dias = `${abs} ${abs === 1 ? 'dia' : 'dias'}`
  if (n < 0) return `O calendário voltou ${dias}`
  return abs === 1 ? 'Passou 1 dia' : `Passaram ${dias}`
}

import { supabase } from './supabase'
import { carregarSistemaCompleto } from './carregarSistemaCompleto'
import { TABELAS_FICHA, exportarFicha, planejarImportacao } from './fichaPortatil'
import { serializarSistema } from '../engines/systemSerializer'
import { TABELAS_MESA, montarArquivoMesa } from './exportMesa'

/** Fase 30.3 — ler e gravar a ficha inteira (export, import, duplicar). */

async function sistemaDaMesa(mesaId) {
  const { data } = await supabase.from('sistemas').select('id').eq('mesa_id', mesaId).maybeSingle()
  return data?.id || null
}

async function grafoDoSistema(sistemaId) {
  if (!sistemaId) return null
  try { return await carregarSistemaCompleto(sistemaId) } catch { return null }
}

/** Ficha + todas as linhas filhas (só o que o RLS deixa ver). */
export async function carregarFichaCompleta(fichaId) {
  const { data: ficha, error } = await supabase.from('fichas').select('*').eq('id', fichaId).single()
  if (error) throw new Error(error.message)
  const respostas = await Promise.all(TABELAS_FICHA.map(t => supabase.from(t).select('*').eq('ficha_id', fichaId)))
  const filhos = {}
  TABELAS_FICHA.forEach((t, i) => { filhos[t] = respostas[i].data || [] })
  return { ficha, filhos }
}

/** Objeto do arquivo .json da ficha. */
export async function exportarFichaDoBanco(fichaId) {
  const { ficha, filhos } = await carregarFichaCompleta(fichaId)
  const sistema = await grafoDoSistema(ficha.sistema_id)
  return { ficha, arquivo: exportarFicha({ ficha, filhos, sistema }) }
}

/** Lê o arquivo e planeja a importação no sistema da mesa (prévia dos avisos). */
export async function prepararImportacao(json, mesaId) {
  const sistemaId = await sistemaDaMesa(mesaId)
  const plano = planejarImportacao(json, await grafoDoSistema(sistemaId))
  return { ...plano, sistemaId }
}

/**
 * Grava a ficha planejada. Se algo falhar no meio, apaga a ficha criada — as
 * filhas vão junto (ON DELETE CASCADE), então não sobra ficha pela metade.
 */
export async function gravarImportacao(plano, { mesaId, donoId, nome = null, extras = {} }) {
  const ficha = { ...plano.ficha, mesa_id: mesaId, dono_id: donoId, sistema_id: plano.sistemaId || null, ...extras }
  if (nome) ficha.nome_personagem = nome
  const { error } = await supabase.from('fichas').insert(ficha)
  if (error) throw new Error(error.message)
  try {
    // itens antes das maestrias (que apontam para eles); o resto em paralelo
    const itens = plano.filhos.itens_ficha || []
    if (itens.length) {
      const { error: e } = await supabase.from('itens_ficha').insert(itens)
      if (e) throw e
    }
    const outras = Object.entries(plano.filhos).filter(([t, linhas]) => t !== 'itens_ficha' && linhas.length)
    const resultados = await Promise.all(outras.map(([t, linhas]) => supabase.from(t).insert(linhas)))
    const falhou = resultados.findIndex(r => r.error)
    if (falhou >= 0) throw resultados[falhou].error
  } catch (e) {
    await supabase.from('fichas').delete().eq('id', plano.fichaId)
    throw new Error(`Importação desfeita: ${e.message}`)
  }
  return plano.fichaId
}

/** Cópia da ficha na mesma mesa, no nome de quem duplicou. */
export async function duplicarFicha(fichaId, { mesaId, donoId, extras = {}, nome = null }) {
  const { ficha, arquivo } = await exportarFichaDoBanco(fichaId)
  const plano = planejarImportacao(arquivo, await grafoDoSistema(ficha.sistema_id))
  plano.sistemaId = ficha.sistema_id
  // F31: a cópia de uma criatura continua criatura (e privada como a original)
  const herdado = ficha.tipo_ficha === 'criatura'
    ? { tipo_ficha: 'criatura', privada: ficha.privada, especie: ficha.especie, ameaca: ficha.ameaca, som_preset: ficha.som_preset }
    : {}
  return gravarImportacao(plano, {
    mesaId, donoId, extras: { ...herdado, ...extras },
    nome: nome || `${ficha.nome_personagem} (cópia)`.slice(0, 200),
  })
}

/** Todas as linhas da mesa numa tabela, de 1000 em 1000 (o limite do PostgREST). Tabela ausente = []. */
async function todasAsLinhas(tabela, mesaId) {
  const linhas = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('*').eq('mesa_id', mesaId).range(de, de + 999)
    if (error) return linhas
    linhas.push(...data)
    if (data.length < 1000) return linhas
  }
}

/** F45 — objeto do arquivo .json da mesa inteira (só o que o RLS deixa quem baixa ver). */
export async function exportarMesaDoBanco(mesaId) {
  const { data: mesa, error } = await supabase.from('mesas').select('*').eq('id', mesaId).single()
  if (error) throw new Error(error.message)
  const grafo = await grafoDoSistema(await sistemaDaMesa(mesaId))
  const { data: lista } = await supabase.from('fichas').select('id').eq('mesa_id', mesaId)
  // o sistema é lido uma vez só, não uma por ficha
  const fichas = await Promise.all((lista || []).map(async ({ id }) => {
    const { ficha, filhos } = await carregarFichaCompleta(id)
    return exportarFicha({ ficha, filhos, sistema: grafo })
  }))
  const tabelas = Object.fromEntries(await Promise.all(TABELAS_MESA.map(async t => [t, await todasAsLinhas(t, mesaId)])))
  const { data: bau } = await supabase.from('itens_ficha').select('*').eq('bau_mesa_id', mesaId)
  return montarArquivoMesa({ mesa, sistema: grafo ? serializarSistema(grafo) : null, fichas, tabelas, bau: bau || [] })
}

/**
 * Fase 51 — mesas procurando jogadores (puro).
 */
import { normalizar } from './formulaEngine'

export const textoVagas = n => `${n} ${Number(n) === 1 ? 'vaga' : 'vagas'}`

export function validarAnuncio({ sistema, quando, vagas, iniciantes, descricao } = {}) {
  const d = String(descricao || '').trim()
  if (!d) return { ok: false, erro: 'Conte em poucas linhas como é a campanha.' }
  if (d.length > 1000) return { ok: false, erro: 'Descrição com até 1000 letras.' }
  const v = Number(vagas)
  if (!Number.isInteger(v) || v < 1 || v > 20) return { ok: false, erro: 'Vagas de 1 a 20.' }
  return {
    ok: true,
    linha: {
      sistema: String(sistema || '').trim().slice(0, 60) || null,
      quando: String(quando || '').trim().slice(0, 120) || null,
      vagas: v, iniciantes: !!iniciantes, descricao: d,
    },
  }
}

/**
 * O que o botão do cartão mostra para quem está vendo:
 * 'sem-login' | 'convidado' | 'membro' | 'pendente' | 'recusado' | 'pode-pedir'.
 */
export function situacao(mesaId, { logado, convidado, minhasMesas = [], meusPedidos = [] }) {
  if (!logado) return 'sem-login'
  if (minhasMesas.includes(mesaId)) return 'membro'
  if (convidado) return 'convidado'
  const pedido = meusPedidos.find(p => p.mesa_id === mesaId)
  if (pedido?.status === 'pendente') return 'pendente'
  if (pedido?.status === 'recusado') return 'recusado'
  return 'pode-pedir'
}

/** Busca sem acento no nome, sistema, horário e descrição; filtro "aceita iniciantes". */
export function filtrarMesas(lista = [], { busca = '', iniciantes = false } = {}) {
  const t = normalizar(busca)
  return lista.filter(m => (!iniciantes || m.iniciantes)
    && (!t || normalizar([m.nome, m.sistema, m.quando, m.descricao].filter(Boolean).join(' ')).includes(t)))
}

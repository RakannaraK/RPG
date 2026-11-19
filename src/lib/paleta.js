import { normalizar } from './formulaEngine'
import { rotuloDe } from './recentes'
import { t } from '../i18n'

/** F62.D — busca global (Ctrl+K): monta e filtra os destinos. Puro, sem tela. */
const MAXIMO = 30
const PAPEIS = { mestre: t('Mestre'), 'co-mestre': t('Co-mestre'), jogador: t('Jogador') }
const ORDEM = [t('Recentes'), t('Mesas'), t('Personagens'), t('Páginas')]

export const abrirBusca = () => window.dispatchEvent(new Event('dp:abrir-busca'))

// Recentes só trazem ids; o nome vem da mesa/ficha (mesma regra do "Continuar" do painel).
function itemRecente(v, mesas, personagens) {
  const mesa = mesas.find(m => m.id === v.mesaId)
  if (!mesa) return null
  const ficha = v.fichaId && personagens.find(p => p.id === v.fichaId)
  return { chave: `r:${v.rota}`, grupo: t('Recentes'), titulo: rotuloDe(v, mesa, ficha), detalhe: v.tipo === 'mesa' ? t('Mesa') : mesa.nome, rota: v.rota }
}

export function montarItens({ recentes = [], mesas = [], personagens = [] }) {
  const lista = [
    ...recentes.map(v => itemRecente(v, mesas, personagens)).filter(Boolean),
    ...mesas.map(m => ({ chave: `m:${m.id}`, grupo: t('Mesas'), titulo: m.nome, detalhe: PAPEIS[m.role] || '', rota: `/mesa/${m.id}` })),
    ...mesas.filter(m => !m.arquivada).map(m => ({ chave: `p:${m.id}`, grupo: t('Mesas'), titulo: t('Mapa — {nome}', { nome: m.nome }), detalhe: PAPEIS[m.role] || '', rota: `/mesa/${m.id}/mapa` })),
    ...personagens.map(p => ({ chave: `f:${p.id}`, grupo: t('Personagens'), titulo: p.nome_personagem || t('Ficha'), detalhe: p.mesa?.nome || '', rota: `/mesa/${p.mesa_id}/ficha/${p.id}` })),
    { chave: 'g:painel', grupo: t('Páginas'), titulo: t('Painel'), detalhe: '', rota: '/dashboard' },
    { chave: 'g:comunidade', grupo: t('Páginas'), titulo: t('Comunidade'), detalhe: '', rota: '/comunidade' },
  ]
  const vistas = new Set()
  return ORDEM.flatMap(g => lista.filter(i => i.grupo === g)).filter(i => !vistas.has(i.rota) && vistas.add(i.rota))
}

export function filtrarItens(itens, texto) {
  const q = normalizar(texto)
  if (!q) return itens
  const palavras = q.split(/\s+/)
  const ok = itens.filter(i => {
    const alvo = normalizar(`${i.titulo} ${i.detalhe}`)
    return palavras.every(p => alvo.includes(p))
  })
  const comeca = i => normalizar(i.titulo).startsWith(q)
  return [...ok.filter(comeca), ...ok.filter(i => !comeca(i))].slice(0, MAXIMO)
}

const GRUPO_BUSCA = { ficha: t('Fichas'), item: t('Itens'), bau: t('Itens'), verbete: t('Verbetes') }

/** F67 — linhas de `buscar_conteudo` (dado do banco) no formato de item da paleta. Sem dedupe: itens da mesma ficha são resultados distintos. */
export function itensDaBusca(linhas) {
  if (!Array.isArray(linhas)) return []
  const ordem = ['ficha', 'item', 'bau', 'verbete']
  const itens = linhas.filter(l => l && GRUPO_BUSCA[l.tipo] && l.id && l.mesa_id).map(l => {
    const mesa = l.mesa_nome || ''
    const base = { chave: `b:${l.tipo}:${l.id}`, grupo: GRUPO_BUSCA[l.tipo] }
    if (l.tipo === 'ficha') return { ...base, titulo: l.titulo, detalhe: `${l.detalhe === 'criatura' ? t('Criatura') : t('Ficha')} · ${mesa}`, rota: `/mesa/${l.mesa_id}/ficha/${l.id}` }
    if (l.tipo === 'item') return { ...base, titulo: l.titulo, detalhe: `${l.detalhe || ''} · ${mesa}`, rota: `/mesa/${l.mesa_id}/ficha/${l.ficha_id}` }
    if (l.tipo === 'bau') return { ...base, titulo: l.titulo, detalhe: `${t('Baú do grupo')} · ${mesa}`, rota: `/mesa/${l.mesa_id}?aba=Fichas` }
    return { ...base, titulo: l.titulo || t('Verbete sem título'), detalhe: mesa, rota: `/mesa/${l.mesa_id}?aba=Enciclopédia&verbete=${l.id}` }
  })
  // item e baú dividem o grupo "Itens"; ordem estável fichas, itens, baús, verbetes
  return ordem.flatMap(tp => itens.filter(i => i.chave.startsWith(`b:${tp}:`)))
}

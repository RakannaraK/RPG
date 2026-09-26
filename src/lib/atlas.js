/**
 * Fase 48 — atlas da campanha (puro): pinos em coordenadas relativas (0..1),
 * para ficarem no mesmo lugar do desenho em qualquer tamanho de tela.
 */
import { tipoDe } from './enciclopedia'

const entre01 = v => Math.min(1, Math.max(0, v))

/** Clique na imagem -> posição relativa ao desenho. */
export function posicaoNoMapa(clientX, clientY, rect) {
  if (!rect?.width || !rect?.height) return null
  return {
    x: Number(entre01((clientX - rect.left) / rect.width).toFixed(4)),
    y: Number(entre01((clientY - rect.top) / rect.height).toFixed(4)),
  }
}

/**
 * Pinos de UM mapa, cada um com o verbete que o leitor enxerga. Pino cujo
 * verbete o leitor não tem (a RLS já esconde, mas a lista pode chegar antes
 * da revelação sumir) sai da lista.
 */
export function pinosDoMapa(pinos = [], atlasId, verbetes = []) {
  const porId = new Map(verbetes.map(v => [v.id, v]))
  return pinos
    .filter(p => p.atlas_id === atlasId && porId.has(p.verbete_id))
    .map(p => {
      const v = porId.get(p.verbete_id)
      return { ...p, verbete: v, rotulo: v.titulo || `${tipoDe(v.tipo).nome} desconhecido`, icone: tipoDe(v.tipo).icone }
    })
}

/** Verbetes que ainda não têm pino neste mapa (o que o mestre pode fixar). */
export function semPino(verbetes = [], pinos = [], atlasId) {
  const fixados = new Set(pinos.filter(p => p.atlas_id === atlasId).map(p => p.verbete_id))
  return verbetes.filter(v => !fixados.has(v.id))
}

export function validarAtlas({ nome, imagem_url } = {}) {
  const n = String(nome || '').trim()
  if (!n) return { ok: false, erro: 'Dê um nome ao mapa.' }
  if (n.length > 80) return { ok: false, erro: 'Nome com até 80 letras.' }
  if (!imagem_url) return { ok: false, erro: 'Escolha a imagem do mapa.' }
  return { ok: true, nome: n }
}

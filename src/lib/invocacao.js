// Fase 31.2 — invocar criatura do bestiário no combate (puro).

const RE_DEFESA = /(defesa|armadura|\bca\b|\bcd\b)/i

/**
 * Nomes numerados que não colidem com quem já está no combate:
 * "Goblin" com 3 e já existindo "Goblin 1" e "Goblin 2" → 3, 4, 5.
 * Quantidade 1 e nome livre → sem número.
 */
export function nomesDaInvocacao(nome, quantidade, nomesExistentes = []) {
  const base = String(nome || '').trim() || 'Criatura'
  const qtd = Math.max(1, Math.trunc(Number(quantidade) || 1))
  const usados = new Set(nomesExistentes.map(n => String(n).trim()))
  if (qtd === 1 && !usados.has(base)) return [base]
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(\\d+)$`)
  let maior = 0
  for (const n of usados) {
    const m = re.exec(String(n).trim())
    if (m) maior = Math.max(maior, Number(m[1]))
  }
  return Array.from({ length: qtd }, (_, i) => `${base} ${maior + i + 1}`)
}

/**
 * Sugestão de defesa a partir dos campos de combate da criatura: o primeiro
 * campo numérico cujo nome fale de defesa/armadura/CA.
 * ponytail: heurística pelo nome — o sistema não marca qual campo é a defesa;
 * o mestre confere no diálogo antes de invocar.
 * @returns {{ campoId, nome, valor }|null}
 */
export function defesaSugerida(valoresCombate = [], camposCombate = []) {
  const valorDe = id => {
    const bruto = valoresCombate.find(v => v.campo_id === id)?.valor
    const n = Number(bruto)
    return Number.isFinite(n) ? n : null
  }
  const candidatos = camposCombate.filter(c => RE_DEFESA.test(c.nome || c.rotulo || ''))
  for (const c of [...candidatos, ...camposCombate]) {
    const valor = valorDe(c.id)
    if (valor != null) return { campoId: c.id, nome: c.nome || c.rotulo || 'Defesa', valor }
  }
  return null
}

/**
 * Linhas de combatente para invocar. `fichasProprias` (boss) entra com uma
 * ficha por combatente; sem elas, todos apontam para a criatura do bestiário.
 * @returns [{ nome, tipo, hp_atual, hp_maximo, ca, ficha_id }]
 */
export function planejarInvocacao({ criatura, quantidade = 1, tipo = 'inimigo', vida, defesa, nomesExistentes = [], fichasProprias = null }) {
  const nomes = nomesDaInvocacao(criatura?.nome_personagem, quantidade, nomesExistentes)
  const hp = vida === '' || vida == null ? (criatura?.hp_maximo ?? null) : Number(vida)
  const ca = defesa === '' || defesa == null ? null : Number(defesa)
  return nomes.map((nome, i) => ({
    nome,
    tipo,
    hp_atual: Number.isFinite(hp) ? hp : null,
    hp_maximo: Number.isFinite(hp) ? hp : null,
    ca: Number.isFinite(ca) ? ca : null,
    ficha_id: fichasProprias ? fichasProprias[i] ?? null : criatura?.id ?? null,
  }))
}

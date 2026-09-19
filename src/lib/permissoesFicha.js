/**
 * Fase 30 — quem edita a ficha na interface: o dono ou um editor liberado por
 * ele. O banco confere de novo (RLS + gatilho), isto só decide o que mostrar.
 */
export const podeEditarFicha = (ficha, usuarioId) =>
  !!usuarioId && !!ficha && (ficha.dono_id === usuarioId || (ficha.editores || []).includes(usuarioId))

/** { usuarioId: 'ver' | 'editar' } a partir das colunas da ficha. */
export const acessoDaFicha = ficha => Object.fromEntries([
  ...(ficha?.leitores || []).map(id => [id, 'ver']),
  ...(ficha?.editores || []).map(id => [id, 'editar']), // editar vence ver
])

/** Volta para as colunas; o dono nunca entra nas listas. */
export function colunasDeAcesso(acesso, donoId) {
  const ids = nivel => Object.keys(acesso).filter(id => acesso[id] === nivel && id !== donoId)
  return { leitores: ids('ver'), editores: ids('editar') }
}

/**
 * Agrupa fichas por pasta: sem pasta primeiro, depois pastas em ordem alfabética.
 * @returns [{ pasta: string|null, fichas }]
 */
export function agruparPorPasta(fichas) {
  const grupos = new Map()
  for (const f of fichas) {
    const p = f.pasta?.trim() || null
    if (!grupos.has(p)) grupos.set(p, [])
    grupos.get(p).push(f)
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })))
    .map(([pasta, lista]) => ({ pasta, fichas: lista }))
}

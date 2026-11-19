import { memo, useId } from 'react'

/**
 * Fase 58 — escuridão da cena com buracos de luz (máscara estática) + brilho das fontes.
 * Só enfeite: não esconde token de ninguém. Só o brilho treme (CSS).
 */
export default memo(function CamadaLuz({ atmosfera, fontes, largura, altura, translucida, reduzido, recortes }) {
  const id = useId().replace(/:/g, '')
  const escuridao = atmosfera?.luz?.escuridao || 0
  if (!(escuridao > 0.02)) return null
  const lista = fontes || []
  const cor = atmosfera?.luz?.cor || '#05070C'
  return (
    <g pointerEvents="none">
      <defs>
        <radialGradient id={`${id}-m`}>
          <stop offset="0" stopColor="black" />
          <stop offset="0.55" stopColor="black" />
          <stop offset="1" stopColor="black" stopOpacity="0" />
        </radialGradient>
        {/* F63: a luz não atravessa parede (recorte = polígono visível da fonte) */}
        {lista.filter(f => recortes?.[f.id]).map(f => (
          <clipPath key={f.id} id={`${id}-c-${f.id}`}><path d={recortes[f.id]} /></clipPath>
        ))}
        {lista.map(f => (
          <radialGradient key={f.id} id={`${id}-g-${f.id}`}>
            <stop offset="0" stopColor={f.cor} stopOpacity="1" />
            <stop offset="1" stopColor={f.cor} stopOpacity="0" />
          </radialGradient>
        ))}
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={largura} height={altura}>
          <rect width={largura} height={altura} fill="white" />
          {lista.map(f => (
            <g key={f.id} clipPath={recortes?.[f.id] ? `url(#${id}-c-${f.id})` : undefined}>
              <circle cx={f.x} cy={f.y} r={f.raioPx} fill={`url(#${id}-m)`} />
            </g>
          ))}
        </mask>
      </defs>
      <rect width={largura} height={altura} fill={cor} opacity={escuridao * (translucida ? 0.6 : 1)} mask={`url(#${id}-mask)`} />
      {lista.map(f => (
        <g key={f.id} clipPath={recortes?.[f.id] ? `url(#${id}-c-${f.id})` : undefined}>
          <g className={f.tremula && !reduzido ? 'luz-tremula' : undefined}>
            <circle cx={f.x} cy={f.y} r={f.raioPx} fill={`url(#${id}-g-${f.id})`} opacity="0.18" style={{ mixBlendMode: 'screen' }} />
          </g>
        </g>
      ))}
    </g>
  )
})

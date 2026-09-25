import { useEffect, useState } from 'react'

/**
 * Fase 45 — topo da ficha no papel: nome, link e um QR code que abre a versão
 * online. Só aparece na impressão. A biblioteca do QR vem sob demanda (~20 KB),
 * então quem nunca imprime quase não paga por ela.
 */
export default function CabecalhoImpressao({ titulo, url }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let vivo = true
    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M')
      qr.addData(url)
      qr.make()
      if (vivo) setSvg(qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }))
    }).catch(() => { /* sem QR: o link escrito continua no papel */ })
    return () => { vivo = false }
  }, [url])

  return (
    <div className="hidden print:flex items-start justify-between gap-6 pb-3 mb-2 border-b border-border">
      <div className="min-w-0">
        <p className="text-xs">Dado &amp; Pena — ficha de personagem</p>
        <p className="text-2xl font-bold break-words">{titulo}</p>
        <p className="text-xs mt-2 break-all">Versão online (sempre atualizada): {url}</p>
      </div>
      {/* o svg é gerado aqui a partir do link, não vem de fora */}
      {svg && <div className="w-24 h-24 shrink-0" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />}
    </div>
  )
}

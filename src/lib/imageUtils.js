const MAX_ANIMADA = 3 * 1024 * 1024

const ascii = (b, i, txt) => [...txt].every((c, k) => b[i + k] === c.charCodeAt(0))
const acha = (b, txt, ate = b.length) => { for (let i = 0; i + txt.length <= ate; i++) if (ascii(b, i, txt)) return i; return -1 }

/** F60 — GIF = sempre; WebP = bloco ANIM no cabeçalho; PNG = bloco acTL antes do IDAT. `bytes` = início do arquivo. */
export function ehAnimada(bytes, mime) {
  if (mime === 'image/gif') return true
  if (mime === 'image/webp') return acha(bytes, 'ANIM', 64) >= 0
  if (mime === 'image/png') {
    const ac = acha(bytes, 'acTL')
    if (ac < 0) return false
    const idat = acha(bytes, 'IDAT')
    return idat < 0 || ac < idat
  }
  return false
}

/** F60 — extensão do arquivo a enviar: gif | webp | png | jpg. */
export const extensaoDe = file => ({ 'image/gif': 'gif', 'image/webp': 'webp', 'image/png': 'png' })[file?.type] || 'jpg'

// sempreComprimir: re-encoda em JPEG mesmo quando já cabe (F26 — mapas: um PNG
// pequeno em pixels pode pesar dezenas de MB). Imagem animada nunca é recomprimida (congelaria no 1º quadro).
export async function redimensionarImagem(file, maxSize = 1200, sempreComprimir = false) {
  if (['image/gif', 'image/webp', 'image/png'].includes(file.type)) {
    const inicio = new Uint8Array(await file.slice(0, 65536).arrayBuffer())
    if (ehAnimada(inicio, file.type)) {
      if (file.size > MAX_ANIMADA) throw new Error('Imagem animada grande demais (máximo 3 MB).')
      return file
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img

      if (width <= maxSize && height <= maxSize) {
        if (!sempreComprimir) {
          resolve(file)
          return
        }
      } else if (width >= height) {
        height = Math.round((height / width) * maxSize)
        width = maxSize
      } else {
        width = Math.round((width / height) * maxSize)
        height = maxSize
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Falha ao processar imagem.')); return }
          const nome = file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], nome, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar a imagem.'))
    }

    img.src = objectUrl
  })
}

/** Caminho dentro do bucket a partir da URL pública (null se for de outro lugar). */
export function caminhoNoBucket(url, bucket = 'fichas-imagens') {
  try {
    const m = new URL(url).pathname.match(new RegExp(`/${bucket}/(.+)$`))
    return m ? decodeURIComponent(m[1]) : null
  } catch {
    return null
  }
}

/** Largura/altura em pixels de um arquivo de imagem (F26 — coordenadas do mapa). */
export async function lerDimensoes(file) {
  const bitmap = await createImageBitmap(file)
  const dims = { largura: bitmap.width, altura: bitmap.height }
  bitmap.close()
  return dims
}

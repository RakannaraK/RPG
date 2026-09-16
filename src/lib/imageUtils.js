// sempreComprimir: re-encoda em JPEG mesmo quando já cabe (F26 — mapas: um PNG
// pequeno em pixels pode pesar dezenas de MB).
export async function redimensionarImagem(file, maxSize = 1200, sempreComprimir = false) {
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

/** Largura/altura em pixels de um arquivo de imagem (F26 — coordenadas do mapa). */
export async function lerDimensoes(file) {
  const bitmap = await createImageBitmap(file)
  const dims = { largura: bitmap.width, altura: bitmap.height }
  bitmap.close()
  return dims
}

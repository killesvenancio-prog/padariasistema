// Comprime/redimensiona a imagem no navegador ANTES do upload.
// Foto de celular (3-8 MB) vira ~100-200 KB -> upload muito mais rápido
// e site mais leve pro cliente. Em qualquer erro, devolve o arquivo original.
'use client'

export async function comprimirImagem(file: File, maxLado = 1000, qualidade = 0.82): Promise<Blob> {
  try {
    if (!file.type.startsWith('image/')) return file

    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = () => reject(new Error('read'))
      fr.readAsDataURL(file)
    })

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode'))
      i.src = dataUrl
    })

    let w = img.naturalWidth || img.width
    let h = img.naturalHeight || img.height
    if (!w || !h) return file

    if (w > maxLado || h > maxLado) {
      if (w >= h) {
        h = Math.round((h * maxLado) / w)
        w = maxLado
      } else {
        w = Math.round((w * maxLado) / h)
        h = maxLado
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))
    // Se por algum motivo ficou maior que o original, usa o original.
    if (!blob) return file
    return blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

// Recorta um pedaço da imagem (box em frações 0..1: [x, y, largura, altura]).
// Devolve um data URL (jpeg) do recorte, ou null se o box for inválido/pequeno.
export async function recortarImagem(dataUrl: string, box: number[], maxLado = 600): Promise<string | null> {
  try {
    if (!Array.isArray(box) || box.length < 4) return null
    let [x, y, w, h] = box.map(Number)
    if (![x, y, w, h].every((n) => Number.isFinite(n)) || w <= 0 || h <= 0) return null

    const img: HTMLImageElement = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('decode'))
      i.src = dataUrl
    })
    const W = img.naturalWidth || img.width
    const H = img.naturalHeight || img.height
    if (!W || !H) return null

    // mantém dentro de 0..1
    x = Math.max(0, Math.min(1, x))
    y = Math.max(0, Math.min(1, y))
    w = Math.max(0, Math.min(1 - x, w))
    h = Math.max(0, Math.min(1 - y, h))

    const sx = Math.round(x * W)
    const sy = Math.round(y * H)
    const sw = Math.round(w * W)
    const sh = Math.round(h * H)
    if (sw < 8 || sh < 8) return null

    let dw = sw
    let dh = sh
    if (Math.max(dw, dh) > maxLado) {
      if (dw >= dh) {
        dh = Math.round((dh * maxLado) / dw)
        dw = maxLado
      } else {
        dw = Math.round((dw * maxLado) / dh)
        dh = maxLado
      }
    }
    const canvas = document.createElement('canvas')
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)
    return canvas.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}

// Extensão/contentType a partir do Blob resultante.
export function tipoDaImagem(blob: Blob, nomeOriginal = ''): { ext: string; contentType: string } {
  const t = blob.type || 'image/jpeg'
  if (t === 'image/jpeg') return { ext: 'jpg', contentType: t }
  if (t === 'image/png') return { ext: 'png', contentType: t }
  if (t === 'image/webp') return { ext: 'webp', contentType: t }
  const ext = (nomeOriginal.split('.').pop() || 'jpg').toLowerCase()
  return { ext, contentType: t }
}

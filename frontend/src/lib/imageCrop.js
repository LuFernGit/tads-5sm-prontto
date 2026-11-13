/**
 * Enquadramento de foto feito no próprio navegador.
 *
 * A gestora ajusta a posição (horizontal/vertical) e o zoom; ao salvar, a
 * imagem é recortada num <canvas> no tamanho do cartão (4:3) e enviada pronta
 * ao backend (SERVICO.foto_servico). Assim o backend não precisa guardar
 * posição/zoom: a foto já chega enquadrada.
 *
 * framing = { x: 0–100, y: 0–100, zoom: 1–2.5 }  (x/y 50 = centro)
 */
export const DEFAULT_FRAMING = { x: 50, y: 50, zoom: 1 }

export const isDefaultFraming = (f) =>
  f.x === DEFAULT_FRAMING.x && f.y === DEFAULT_FRAMING.y && f.zoom === DEFAULT_FRAMING.zoom

/** Estilo da pré-visualização (mesma conta do recorte final). */
export const framingStyle = (f) => ({
  objectFit: "cover",
  objectPosition: `${f.x}% ${f.y}%`,
  transform: `scale(${f.zoom})`,
  transformOrigin: `${f.x}% ${f.y}%`,
})

/**
 * Recorta a imagem com o enquadramento escolhido e devolve um data URL JPEG.
 * Rejeita se a imagem não puder ser lida (ex.: foto de outro site sem permissão).
 */
export function cropImage(src, framing, width = 1200, height = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        // "cover": a imagem preenche o quadro inteiro; o zoom aumenta a partir daí.
        const scale = Math.max(width / img.width, height / img.height) * framing.zoom
        const drawW = img.width * scale
        const drawH = img.height * scale
        const dx = (width - drawW) * (framing.x / 100)
        const dy = (height - drawH) * (framing.y / 100)
        ctx.drawImage(img, dx, dy, drawW, drawH)
        resolve(canvas.toDataURL("image/jpeg", 0.86))
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    img.src = src
  })
}

/**
 * Reduz a imagem para no máximo `maxSide` px no lado maior, SEM recortar
 * (mantém a proporção), e devolve um data URL JPEG. Usada na capa das
 * categorias, que aparece em cartões de formatos diferentes na vitrine.
 */
export function resizeImage(src, maxSide = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.86))
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    img.src = src
  })
}

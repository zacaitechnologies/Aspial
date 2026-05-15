/**
 * Load the ASPIAL® SINCE 2003 wordmark (dark green on white) as a base64 data URL.
 *
 * - Server: reads `public/images/logoPng.png` synchronously.
 * - Browser: fetches the asset, then resizes via canvas to keep PDF file size small
 *   (the source PNG is ~3849px wide; we don't need more than ~400px for a 44mm placement).
 */

const LOGO_PATH = "public/images/logoPng.png"
const LOGO_PDF_PATH = "public/images/logoPng-pdf.png"
const LOGO_PDF_MAX_WIDTH = 400

export async function getLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") {
    try {
      const path = await import("path")
      const fs = await import("fs")
      const cwd = process.cwd()
      const pdfPath = path.join(cwd, LOGO_PDF_PATH)
      const mainPath = path.join(cwd, LOGO_PATH)
      const pathToRead = fs.existsSync(pdfPath) ? pdfPath : mainPath
      const buf = fs.readFileSync(pathToRead)
      return `data:image/png;base64,${buf.toString("base64")}`
    } catch {
      return null
    }
  }
  try {
    const res = await fetch("/images/logoPng.png")
    const blob = await res.blob()
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
    if (!dataUrl) return null
    return await resizeImageDataUrlForPdf(dataUrl, LOGO_PDF_MAX_WIDTH)
  } catch {
    return null
  }
}

function resizeImageDataUrlForPdf(dataUrl: string, maxWidth: number): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      if (w <= maxWidth) {
        resolve(dataUrl)
        return
      }
      const canvas = document.createElement("canvas")
      const scale = maxWidth / w
      canvas.width = maxWidth
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      try {
        resolve(canvas.toDataURL("image/png"))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

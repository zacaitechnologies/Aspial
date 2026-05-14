/**
 * Pure utility helpers for service storage — no server-only APIs.
 * Safe to import in both client and server modules.
 */

/**
 * `imageUrl` in DB may be a legacy public URL or the storage object key
 * (e.g. `service-12-1769….webp`).
 */
export function extractServiceStorageObjectKey(
  stored: string | null | undefined
): string | null {
  if (!stored?.trim()) return null
  const s = stored.trim()
  if (s.startsWith("data:") || s.startsWith("blob:")) return null

  try {
    const url = new URL(s)
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/
    )
    if (match?.[1]) {
      return decodeURIComponent(match[1])
    }
  } catch {
    // not an absolute URL — treat as key or path fragment below
  }

  if (!s.includes("/") && s.includes(".")) {
    return s
  }

  const last = s.split("/").pop()?.split("?")[0]
  if (last?.startsWith("service-")) return last
  return last ?? null
}

export function serviceAttachmentIsPdf(stored: string | null | undefined): boolean {
  if (!stored) return false
  return stored.toLowerCase().includes(".pdf")
}

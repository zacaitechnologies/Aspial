/**
 * Detect PDF from a stored leave attachment URL (public URL or similar).
 */
export function leaveAttachmentUrlIsPdf(url: string | null | undefined): boolean {
  if (!url?.trim()) return false
  return /\.pdf(\?|$)/i.test(url.trim())
}

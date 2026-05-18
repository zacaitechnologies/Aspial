/**
 * Page chrome shared by all four PDF document types.
 *
 * Layout per page:
 *   1. Top decoration: centered logo + olive accent bar (drawn by `addTopDecoration`)
 *   2. Info box: title + bill-to (left), doc number / date / advisor / page (right) (drawn by `addInfoBox`)
 *   3. Body content (per-document; not in this file)
 *   4. Footer: corporate names + 4-column payment/email/phone/address + two-tone strip
 *      (drawn by `addFooter`)
 *
 * `addPageChrome` is the single entry point per-doc files call from `didDrawPage` and from
 * the post-generation page loop. It clears its target areas before drawing so it can be
 * called multiple times per page without producing double-stamping.
 */
import type jsPDF from "jspdf"
import {
  BLACK,
  COMPANY_FOOTER,
  FOOTER_HEIGHT,
  INFO_BOX_HEIGHT,
  INFO_BOX_START_Y,
  LOGO_HEIGHT,
  LOGO_WIDTH,
  LOGO_Y,
  MARGIN,
  OLIVE_ACCENT,
  PRIMARY_DARK_GREEN,
  SAGE_ACCENT,
  TOP_DECORATION_HEIGHT,
  WHITE,
} from "./constants"

/**
 * Decorative divider used below the logo and inside the footer between the
 * corporate names line and the 4-column block. Renders a thin full-width
 * olive line with a shorter, thicker bar in the primary dark green centered
 * on top of it.
 */
function drawAccentDivider(doc: jsPDF, pageWidth: number, centerY: number): void {
  // Thin full-width olive line (bottom layer)
  doc.setDrawColor(OLIVE_ACCENT[0], OLIVE_ACCENT[1], OLIVE_ACCENT[2])
  doc.setLineWidth(0.4)
  doc.line(0, centerY, pageWidth, centerY)

  // Shorter thicker bar centered over the line, in the primary dark green
  const barWidth = pageWidth * 0.6
  const barX = (pageWidth - barWidth) / 2
  const barHeight = 2.2
  doc.setFillColor(PRIMARY_DARK_GREEN[0], PRIMARY_DARK_GREEN[1], PRIMARY_DARK_GREEN[2])
  doc.rect(barX, centerY - barHeight / 2, barWidth, barHeight, "F")
}

// jspdf-autotable attaches `lastAutoTable` on the jsPDF instance. Centralize the
// module augmentation here so any importer of `@/lib/pdf` picks it up automatically.
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

export type ClientInfoPdf = {
  name: string
  company: string
  phone: string
  email: string
  companyRegistrationNumber?: string
  ic?: string
}

export type InfoBoxExtra = { label: string; value: string }

export type InfoBoxOpts = {
  title: string
  docNumberLabel: string
  docNumber: string
  date: string
  advisorName: string
  pageNumber: number
  totalPages: number
  clientInfo: ClientInfoPdf
  extras?: InfoBoxExtra[]
}

// --- Top decoration --------------------------------------------------------
export function addTopDecoration(doc: jsPDF, logoBase64: string | null): void {
  const pageWidth = doc.internal.pageSize.getWidth()

  // Clear the entire top area so repeated calls (didDrawPage + final pass) don't accumulate.
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.rect(0, 0, pageWidth, TOP_DECORATION_HEIGHT, "F")

  // Centered logo
  if (logoBase64) {
    const logoX = (pageWidth - LOGO_WIDTH) / 2
    try {
      doc.addImage(logoBase64, "PNG", logoX, LOGO_Y, LOGO_WIDTH, LOGO_HEIGHT, "logo")
    } catch {
      // ignore — addImage throws on a re-used alias when the alias content changed; we accept
      // a missing logo on those rare paths rather than aborting PDF generation.
    }
  }

  // Decorative divider: thin full-width line with a shorter thicker bar on top.
  drawAccentDivider(doc, pageWidth, TOP_DECORATION_HEIGHT - 4)
}

// --- Info box --------------------------------------------------------------
export function addInfoBox(doc: jsPDF, opts: InfoBoxOpts): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const rightCol = pageWidth - MARGIN

  // Clear the area first so repeated calls don't double-stamp.
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.rect(MARGIN, INFO_BOX_START_Y, pageWidth - 2 * MARGIN, INFO_BOX_HEIGHT, "F")

  let leftY = INFO_BOX_START_Y + 6

  // Title (left, big bold)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
  doc.text(opts.title, MARGIN + 1, leftY + 2)
  leftY += 8

  // Bill-to block
  doc.setFontSize(9)
  const ci = opts.clientInfo

  if (ci.company) {
    doc.setFont("helvetica", "bold")
    doc.text(`Bill To: ${ci.company}`, MARGIN + 1, leftY)
  } else {
    doc.setFont("helvetica", "bold")
    doc.text("Bill To:", MARGIN + 1, leftY)
  }
  doc.setFont("helvetica", "normal")
  leftY += 4

  if (ci.name) {
    doc.text(`ATTN TO: ${ci.name}`, MARGIN + 1, leftY)
  }
  leftY += 4

  if (ci.phone) {
    doc.text(`TEL NO: ${ci.phone}`, MARGIN + 1, leftY)
  }
  leftY += 4

  if (ci.email) {
    doc.text(`EMAIL: ${ci.email}`, MARGIN + 1, leftY)
  }
  leftY += 4

  doc.text(`COMPANY REG. NO: ${ci.companyRegistrationNumber || "N/A"}`, MARGIN + 1, leftY)
  leftY += 4

  doc.text(`IC: ${ci.ic || "-"}`, MARGIN + 1, leftY)

  // Right block (doc number / date / advisor / extras / page no)
  let rightY = INFO_BOX_START_Y + 12
  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.text(`${opts.docNumberLabel} : ${opts.docNumber}`, rightCol - 1, rightY, { align: "right" })
  rightY += 5
  doc.text(`DATE : ${opts.date}`, rightCol - 1, rightY, { align: "right" })
  rightY += 5
  doc.text(`ADVISOR : ${opts.advisorName}`, rightCol - 1, rightY, { align: "right" })
  rightY += 5
  if (opts.extras) {
    for (const extra of opts.extras) {
      doc.text(`${extra.label} : ${extra.value}`, rightCol - 1, rightY, { align: "right" })
      rightY += 5
    }
  }
  doc.text(`PAGE NO : ${opts.pageNumber} of ${opts.totalPages}`, rightCol - 1, rightY, { align: "right" })

  // Black divider line at the bottom of the info-box
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2])
  doc.setLineWidth(0.5)
  doc.line(
    MARGIN,
    INFO_BOX_START_Y + INFO_BOX_HEIGHT,
    pageWidth - MARGIN,
    INFO_BOX_START_Y + INFO_BOX_HEIGHT,
  )
}

// --- Footer ---------------------------------------------------------------
export function addFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const footerTop = pageHeight - FOOTER_HEIGHT

  // Clear the footer area so repeated calls don't accumulate.
  doc.setFillColor(WHITE[0], WHITE[1], WHITE[2])
  doc.rect(0, footerTop, pageWidth, FOOTER_HEIGHT, "F")

  // 1. Corporate names line at the top of the footer (no rule above)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
  const [companyA, companyB] = COMPANY_FOOTER.corporateNames
  const corporateY = footerTop + 5
  const corpAW = doc.getTextWidth(companyA)
  const corpBW = doc.getTextWidth(companyB)
  const gap = 14
  const totalCorpW = corpAW + gap + corpBW
  const corpStartX = (pageWidth - totalCorpW) / 2
  doc.text(companyA, corpStartX, corporateY)
  doc.text(companyB, corpStartX + corpAW + gap, corporateY)

  // 2. Decorative divider below the corporate names
  drawAccentDivider(doc, pageWidth, corporateY + 3)

  // 3. 4-column payment / email / phone / address block (tight padding)
  const blockTop = footerTop + 11
  // Sized to the tallest column (PAYMENT INFORMATION wraps to ~4 lines on A4) plus a small buffer.
  const blockHeight = 26
  const usableWidth = pageWidth - 2 * MARGIN
  const colWidth = usableWidth / 4
  const colPad = 3

  // Light vertical separators between columns
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  for (let i = 1; i < 4; i++) {
    const x = MARGIN + colWidth * i
    doc.line(x, blockTop + 2, x, blockTop + blockHeight - 2)
  }

  type FooterCol = { header: string; value: string[] }
  const cols: FooterCol[] = [
    {
      header: "PAYMENT INFORMATION:",
      value: [
        `Bank: ${COMPANY_FOOTER.payment.bank}`,
        `Account No: ${COMPANY_FOOTER.payment.accountNo}`,
        `Account Name: ${COMPANY_FOOTER.payment.accountName}`,
      ],
    },
    { header: "EMAIL:", value: [COMPANY_FOOTER.email] },
    { header: "PHONE:", value: [COMPANY_FOOTER.phone] },
    { header: "ADDRESS:", value: [...COMPANY_FOOTER.addressLines] },
  ]

  cols.forEach((col, i) => {
    const cx = MARGIN + colWidth * i
    const innerWidth = colWidth - colPad * 2
    // Header bold + centered
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.text(col.header, cx + colWidth / 2, blockTop + 4, { align: "center" })
    // Olive underline below the header text
    doc.setDrawColor(OLIVE_ACCENT[0], OLIVE_ACCENT[1], OLIVE_ACCENT[2])
    doc.setLineWidth(0.4)
    const underlineY = blockTop + 5.5
    doc.line(cx + colPad + 6, underlineY, cx + colWidth - colPad - 6, underlineY)

    // Value — wrap as needed and stack lines
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    let lineY = blockTop + 9
    for (const raw of col.value) {
      const wrapped = doc.splitTextToSize(raw, innerWidth)
      for (const line of wrapped) {
        doc.text(line, cx + colWidth / 2, lineY, { align: "center" })
        lineY += 3.2
      }
    }
  })

  // 4. Slim olive line spanning the full page width, just before the bottom two-tone strip
  const stripHeight = 4
  const slimLineY = pageHeight - stripHeight - 1.5
  doc.setDrawColor(OLIVE_ACCENT[0], OLIVE_ACCENT[1], OLIVE_ACCENT[2])
  doc.setLineWidth(0.4)
  doc.line(0, slimLineY, pageWidth, slimLineY)

  // 5. Two-tone bottom strip — split horizontally:
  //    left half = primary dark green, right half = sage accent
  const halfWidth = pageWidth / 2
  doc.setFillColor(PRIMARY_DARK_GREEN[0], PRIMARY_DARK_GREEN[1], PRIMARY_DARK_GREEN[2])
  doc.rect(0, pageHeight - stripHeight, halfWidth, stripHeight, "F")
  doc.setFillColor(SAGE_ACCENT[0], SAGE_ACCENT[1], SAGE_ACCENT[2])
  doc.rect(halfWidth, pageHeight - stripHeight, pageWidth - halfWidth, stripHeight, "F")

  // Restore default colors so subsequent draws aren't affected
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2])
  doc.setDrawColor(BLACK[0], BLACK[1], BLACK[2])
}

/**
 * Draw the full page chrome (top decoration + info box + footer) for the current page.
 * Idempotent — safe to call from `didDrawPage` and from the post-generation final loop.
 */
export function addPageChrome(
  doc: jsPDF,
  logoBase64: string | null,
  infoOpts: InfoBoxOpts,
): void {
  addTopDecoration(doc, logoBase64)
  addInfoBox(doc, infoOpts)
  addFooter(doc)
}

/** Convenience: usable content boundary on each page (above the footer). */
export function getContentMaxY(doc: jsPDF): number {
  return doc.internal.pageSize.getHeight() - FOOTER_HEIGHT - 4
}

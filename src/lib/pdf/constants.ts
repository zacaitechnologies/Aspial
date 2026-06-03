/**
 * Shared PDF design constants (colors, layout, terms, footer).
 * Used by quotation / invoice / receipt / delivery-order PDF generators.
 */

// --- Colors ----------------------------------------------------------------
/** Mirrors the global CSS `--primary: #202F21`. */
export const PRIMARY_DARK_GREEN: [number, number, number] = [32, 47, 33]
/** Mirrors the global CSS `--accent: #BDC4A5` — the sage-olive used in dividers and the right half of the bottom strip. */
export const SAGE_ACCENT: [number, number, number] = [189, 196, 165]
/** Slightly darker sage used on the decorative dividers (below the logo and inside the footer). */
export const OLIVE_ACCENT: [number, number, number] = [157, 173, 138]
export const OLIVE_LIGHT: [number, number, number] = [212, 220, 200]
export const OLIVE_DARK: [number, number, number] = [120, 140, 105]
export const WHITE: [number, number, number] = [255, 255, 255]
export const BLACK: [number, number, number] = [0, 0, 0]

// Kept for backwards-compatible references inside per-doc files.
export const PRIMARY_COLOR = PRIMARY_DARK_GREEN

// --- Layout ----------------------------------------------------------------
export const MARGIN = 20
export const TEXT_SAFETY = 12

/** Vertical space reserved at the top of every page for the centered logo + olive accent bar. */
export const TOP_DECORATION_HEIGHT = 30
/** Padding between the last info-box line and the bottom divider. */
export const INFO_BOX_BOTTOM_PADDING = 3
/** Y position where the info-box starts (right below the top decoration). */
export const INFO_BOX_START_Y = TOP_DECORATION_HEIGHT
/**
 * Typical info-box height; kept only as a layout reference / fallback. The real height now
 * grows with content — use `getInfoBoxContentStartY(doc, opts)` to position body content.
 */
export const INFO_BOX_HEIGHT = 46
export const CONTENT_AFTER_INFO_BOX_Y = INFO_BOX_START_Y + INFO_BOX_HEIGHT + 6

/** Total reserved space at the bottom of every page for the footer block. */
export const FOOTER_HEIGHT = 44
/** Safe Y boundary; below this content gets clipped by the footer. */
export const FOOTER_TOP_PADDING = 4

// --- Logo placement on each page (centered top) ----------------------------
export const LOGO_WIDTH = 44
export const LOGO_HEIGHT = 14
export const LOGO_Y = 8

// --- Description rendering -------------------------------------------------
export const DESC_LINE_HEIGHT = 4
export const DESC_BLANK_LINE_GAP = 3

// --- Terms & Conditions (shared across all four doc types) -----------------
export const TERMS_AND_CONDITIONS: ReadonlyArray<string> = [
  "1. Ownership, Usage Rights, and Creator's Rights. All photographs captured by ASPIAL PRODUCTION SDN BHD remain the sole property of the company. Clients are strictly prohibited from selling or utilizing the photographs in contests without prior written consent from ASPIAL PRODUCTION SDN BHD. ASPIAL PRODUCTION SDN BHD reserves the right to employ the photographs/video for advertising, display, website and internet promotion, photographic contests, and any other marketing endeavours deemed appropriate by the company. ASPIAL PRODUCTION SDN BHD retains the rights to the intellectual property created during the provision of services, subject to the terms agreed upon in this agreement.",
  "2. Liability, Payment, and Confidentiality. ASPIAL PRODUCTION SDN BHD shall not be held liable for any form of loss, damage, or expenses incurred during the photography process or the entirety of the project, including but not limited to indirect or consequential loss, hardware malfunctions, manpower, equipment, scheduling, etc. The initial payment is required to secure the reservation of services and must be remitted upon booking. Confirmed packages are non-refundable, non-exchangeable, and non-transferable. Both parties commit to maintaining the confidentiality of proprietary or sensitive information exchanged during the project. Confidentiality obligations extend beyond the project duration and remain in effect indefinitely, except as required by law or with the express written consent of both parties.",
  "3. Cancellation, Refunds, and Acceptance. Clients acknowledge that once the project plan/solution is confirmed, significant resources, including manpower, equipment, and scheduling, are allocated accordingly, rendering cancellation impossible. Payments made are non-refundable. By initiating the first payment, the Client confirms understanding and agreement to comply with these terms and conditions.",
]

// --- Company / footer content (shown in 4-column block + corporate row) ----
export const COMPANY_FOOTER = {
  corporateName: "ASPIAL PRODUCTION SDN BHD (202001019933 (1376253-A))",
  payment: {
    bank: "Public Bank Berhad",
    accountNo: "321-9794-528",
    accountName: "ASPIAL PRODUCTION SDN BHD",
  },
  email: "aspialproduction@gmail.com",
  phone: "+6016-732 5323",
  addressLines: [
    "2A Lorong Dato Abu Bakar, Section 16,",
    "46350 Petaling Jaya, Selanggor.",
  ],
} as const

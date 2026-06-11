import { prisma } from "@/lib/prisma"

/**
 * Recomputes a quotation's paymentStatus from the sum of active receipts
 * on non-cancelled invoices.
 *
 * Rules:
 *   received == 0            → unpaid
 *   0 < received < totalPrice → partially_paid
 *   received >= totalPrice    → fully_paid
 *
 * This is a plain async helper (not a Server Action) so it can be called
 * from inside or after transactions without "use server" restrictions.
 */
export async function recalcQuotationPaymentStatus(quotationId: number): Promise<void> {
  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    select: { totalPrice: true },
  })
  if (!quotation) return

  const agg = await prisma.receipt.aggregate({
    _sum: { amount: true },
    where: {
      status: "active",
      invoice: {
        is: {
          quotationId,
          status: { not: "cancelled" },
        },
      },
    },
  })

  const received = agg._sum.amount ?? 0

  let status: "unpaid" | "partially_paid" | "fully_paid"
  if (received <= 0) {
    status = "unpaid"
  } else if (received >= quotation.totalPrice) {
    status = "fully_paid"
  } else {
    status = "partially_paid"
  }

  await prisma.quotation.update({
    where: { id: quotationId },
    data: { paymentStatus: status },
  })
}

/**
 * Recomputes an invoice's paymentStatus from the sum of its active receipts.
 *
 * Rules:
 *   received == 0          → unpaid
 *   0 < received < amount  → partially_paid
 *   received >= amount     → fully_paid
 *
 * Like recalcQuotationPaymentStatus, this is a plain async helper so it can
 * be called from inside or after transactions without "use server" restrictions.
 */
export async function recalcInvoicePaymentStatus(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { amount: true },
  })
  if (!invoice) return

  const agg = await prisma.receipt.aggregate({
    _sum: { amount: true },
    where: {
      status: "active",
      invoiceId,
    },
  })

  const received = agg._sum.amount ?? 0

  let status: "unpaid" | "partially_paid" | "fully_paid"
  if (received <= 0) {
    status = "unpaid"
  } else if (received >= invoice.amount) {
    status = "fully_paid"
  } else {
    status = "partially_paid"
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { paymentStatus: status },
  })
}

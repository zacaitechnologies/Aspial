/**
 * One-time backfill script: recomputes paymentStatus for every non-cancelled
 * quotation and aligns the column with receipt-based auto-derive logic.
 *
 * Legacy rows still marked "deposit_paid" are skipped and left unchanged.
 *
 * Run with:
 *   npx tsx prisma/backfillPaymentStatus.ts
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const [quotations, skippedDepositPaid] = await Promise.all([
    prisma.quotation.findMany({
      where: {
        workflowStatus: { not: "cancelled" },
        paymentStatus: { not: "deposit_paid" },
      },
      select: { id: true, totalPrice: true },
    }),
    prisma.quotation.count({
      where: {
        workflowStatus: { not: "cancelled" },
        paymentStatus: "deposit_paid",
      },
    }),
  ])

  let updated = 0

  for (const q of quotations) {
    const agg = await prisma.receipt.aggregate({
      _sum: { amount: true },
      where: {
        status: "active",
        invoice: {
          is: {
            quotationId: q.id,
            status: { not: "cancelled" },
          },
        },
      },
    })

    const received = agg._sum.amount ?? 0

    let status: "unpaid" | "partially_paid" | "fully_paid"
    if (received <= 0) {
      status = "unpaid"
    } else if (received >= q.totalPrice) {
      status = "fully_paid"
    } else {
      status = "partially_paid"
    }

    await prisma.quotation.update({
      where: { id: q.id },
      data: { paymentStatus: status },
    })

    updated++
    if (updated % 50 === 0) {
      console.log(`Updated ${updated}/${quotations.length} quotations...`)
    }
  }

  console.log(
    `Done. Updated ${updated} quotations. Skipped ${skippedDepositPaid} with deposit_paid.`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

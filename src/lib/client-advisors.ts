import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Ensure the given users are linked to the client as advisors.
 *
 * Any userIds that are not already in ClientAdvisor for this client will be inserted.
 * Existing rows are left untouched (skipDuplicates). This guarantees that anyone
 * assigned to the client's quotations/invoices/receipts can view the client and
 * track outstanding balances from their own account.
 *
 * Pass a Prisma transaction client (`tx`) to run inside an existing transaction.
 */
export async function ensureClientAdvisors(
  clientId: string,
  userIds: readonly string[],
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (!clientId) return

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))
  if (uniqueUserIds.length === 0) return

  const db = tx ?? prisma
  await db.clientAdvisor.createMany({
    data: uniqueUserIds.map((userId) => ({ clientId, userId })),
    skipDuplicates: true,
  })
}

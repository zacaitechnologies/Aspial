import { Suspense } from "react"
import { BookingDashboard } from "./equipment-dashboard"
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function getStudios() {
  return await prisma.studio.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })
}

async function getEquipment() {
  return await prisma.equipment.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })
}

export default async function AdminPage() {
  const [studios, equipment] = await Promise.all([getStudios(), getEquipment()])

  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <BookingDashboard studios={studios} equipment={equipment} />
      </Suspense>
    </div>
  )
}

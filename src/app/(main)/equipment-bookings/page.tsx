import { Suspense } from "react"
import { BookingDashboard } from "./equipment-dashboard"
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

async function getStudios() {
  return await prisma.studio.findMany({
    include: {
      bookings: {
        where: {
          status: "active"
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

async function getEquipment() {
  return await prisma.equipment.findMany({
    include: {
      bookings: {
        where: {
          status: "active"
        }
      }
    },
    orderBy: {
      createdAt: "desc",
    },
  })
}

async function getUserWithRole() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return redirect("/login")
    }
    
    const dbUser = await prisma.user.findUnique({
      where: { supabase_id: user.id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    })
    
    if (!dbUser) {
      return redirect("/login")
    }
    
    const isAdmin = dbUser.userRoles.some(userRole => userRole.role.slug === "admin")
    
    return {
      user: dbUser,
      isAdmin
    }
  } catch (error: any) {
    console.error("Error in getUserWithRole:", error)
    throw new Error("Failed to get user with role")
  }
}

export default async function AdminPage() {
  const [studios, equipment, userData] = await Promise.all([
    getStudios(), 
    getEquipment(), 
    getUserWithRole()
  ])

  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={<div>Loading...</div>}>
        <BookingDashboard 
          studios={studios} 
          equipment={equipment} 
          isAdmin={userData.isAdmin}
        />
      </Suspense>
    </div>
  )
}

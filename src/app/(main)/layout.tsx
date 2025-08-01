import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SessionProvider from "./contexts/SessionProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { AppHeader } from "./components/AppHeader";
import { PrismaClient } from "@prisma/client";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const prisma = new PrismaClient();

  // Get the actual user session
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If user is not logged in, redirect to login page
  if (!user || error) {
    redirect("/login");
  }

  // Fetch user profile from public table using Prisma
  const profile = await prisma.user.findUnique({
    where: {
      supabase_id: user.id
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      supabase_id: true,
      created_at: true,
      updated_at: true
    }
  });

  // Combine auth user with profile data
  const enhancedUser = {
    ...user,
    profile: profile || undefined
  };

  // make sure all child component have access to the session cookie.
  return (
    <SessionProvider value={{ enhancedUser }}>
        <SidebarProvider defaultOpen={true}>
            <AppSidebar/>
            <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
        </SidebarProvider>
    </SessionProvider>
  );
}

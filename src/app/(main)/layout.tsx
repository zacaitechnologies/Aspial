import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SessionProvider from "./contexts/SessionProvider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import AppHeaderClient from "./components/AppHeaderClient";
import { prisma } from "@/lib/prisma";
import { Toaster } from "@/components/ui/toaster";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Get the actual user session
  let user = null;
  let error = null;
  
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    error = result.error;
  } catch (authError) {
    console.error('Authentication error in layout:', authError);
    // For development, create a mock user to bypass auth issues
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using mock user');
      user = {
        id: 'mock-user-id',
        email: 'dev@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        role: 'authenticated'
      } as any;
    } else {
      redirect("/login");
    }
  }

  // If user is not logged in, redirect to login page
  if (!user || error) {
    redirect("/login");
  }

  // Fetch user profile from public table using Prisma
  let profile = null;
  
  try {
    profile = await prisma.user.findUnique({
      where: {
        supabase_id: user.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        supabase_id: true,
        profilePicture: true,
        created_at: true,
        updated_at: true
      }
    });
  } catch (profileError) {
    console.error('Error fetching user profile:', profileError);
    // For development mock user, create a mock profile
    if (process.env.NODE_ENV === 'development' && user.id === 'mock-user-id') {
      profile = {
        id: 'mock-profile-id',
        firstName: 'Dev',
        lastName: 'User',
        email: 'dev@example.com',
        supabase_id: 'mock-user-id',
        profilePicture: null,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  }

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
          <AppHeaderClient />
          <main className="flex-1 p-0">{children}</main>
        </div>
        </SidebarProvider>
        <Toaster />
    </SessionProvider>
  );
}

import { Suspense } from "react";
import { getCachedUser } from "@/lib/auth-cache";
import { clearAdminCache } from "@/lib/admin-cache";
import { getProjectsPaginated } from "./action";
import ProjectsClient from "./components/ProjectsClient";

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic';

// Server Component - fetches data on server for fast initial load
export default async function ProjectsPage() {
  // Get user on server - this is cached
  const user = await getCachedUser();
  
  if (!user) {
    return null;
  }

  // Ensure fresh admin check on this page so role changes / new users are recognized
  await clearAdminCache(user.id);

  // Fetch initial data on server - cached for 30 seconds
  const initialData = await getProjectsPaginated(user.id, 1, 10);

  return (
    <Suspense fallback={
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20 text-primary">
          <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading projects…</p>
        </div>
      </div>
    }>
      <ProjectsClient initialData={initialData} userId={user.id} />
    </Suspense>
  );
}

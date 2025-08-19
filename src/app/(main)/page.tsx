"use client";

import { useSession } from "./contexts/SessionProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { enhancedUser } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to projects if user is authenticated
    if (enhancedUser) {
      router.replace("/projects");
    }
  }, [enhancedUser, router]);

  // Show loading state while redirecting
  return (
    <main className="!p-0 flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Projects...</p>
      </div>
    </main>
  );
}

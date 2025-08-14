"use client";

import { useSession } from "./contexts/SessionProvider";

export default function Home() {
  const { enhancedUser } = useSession();

  return (
    <main className="!p-0">
      <h1 className="text-2xl font-bold mb-4">Current User Session Information</h1>
      <pre className="bg-gray-100 p-0 rounded-lg overflow-auto text-sm">
        {JSON.stringify(enhancedUser, null, 2)}
      </pre>
    </main>
  );
}

import { getCachedUser } from "@/lib/auth-cache";
import { getQuotationsPaginated } from "./action";
import QuotationsClient from "./components/QuotationsClient";

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic';

// Server Component - fetches data on server for fast initial load
export default async function QuotationsPage() {
  // Get user on server - this is cached
  const user = await getCachedUser();
  
  if (!user) {
    return null;
  }

  // Fetch initial data on server with caching enabled for better performance
  const initialData = await getQuotationsPaginated(1, 10, {}, true);

  return <QuotationsClient initialData={initialData} userId={user.id} />;
}

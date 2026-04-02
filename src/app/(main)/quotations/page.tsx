import { getCachedUser } from "@/lib/auth-cache";
import { getQuotationsPaginated, getQuotationAdvisors } from "./action";
import QuotationsClient from "./components/QuotationsClient";
import { checkIsOperationUser } from "../actions/admin-actions";
import AccessDenied from "../components/AccessDenied";

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic';

// Server Component - fetches data on server for fast initial load
export default async function QuotationsPage() {
  // Get user on server - this is cached
  const user = await getCachedUser();
  
  if (!user) {
    return null;
  }

  // Check if user is operation-user (restricted access)
  const isOperationUser = await checkIsOperationUser(user.id);
  if (isOperationUser) {
    return <AccessDenied />;
  }

  const [initialData, advisors] = await Promise.all([
    getQuotationsPaginated(1, 10, {}, true),
    getQuotationAdvisors(),
  ]);

  return <QuotationsClient initialData={initialData} initialAdvisors={advisors} />;
}

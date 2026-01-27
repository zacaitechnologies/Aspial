import { getCachedUser } from "@/lib/auth-cache";
import { getInvoicesPaginated } from "./action";
import InvoicesClient from "./components/InvoicesClient";
import { checkIsOperationUser, checkHasFullAccess } from "../actions/admin-actions";
import AccessDenied from "../components/AccessDenied";

// Force dynamic rendering since we use cookies for auth
export const dynamic = 'force-dynamic';

// Server Component - fetches data on server for fast initial load
export default async function InvoicesPage() {
	// Get user on server - this is cached
	const user = await getCachedUser();
	
	if (!user) {
		return null;
	}

	// Check if user is operation-user (restricted access) and admin status in parallel
	const [isOperationUser, isAdmin] = await Promise.all([
		checkIsOperationUser(user.id),
		checkHasFullAccess(user.id)
	]);

	if (isOperationUser) {
		return <AccessDenied />;
	}

	// Fetch initial data on server with caching enabled for better performance
	const initialData = await getInvoicesPaginated(1, 10, {}, true);

	return <InvoicesClient initialData={initialData as any} userId={user.id} isAdmin={isAdmin} />;
}


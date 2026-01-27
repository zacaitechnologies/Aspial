import { getCachedUser } from "@/lib/auth-cache"
import { getProjectById } from "../action"
import ProjectDetailClient from "./ProjectDetailClient"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function ProjectDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }> | { id: string }
	searchParams: Promise<{ tab?: string }> | { tab?: string }
}) {
	const user = await getCachedUser()
	if (!user?.id) {
		return null
	}

	// Await params and searchParams if they're Promises (Next.js 15+)
	const resolvedParams = await Promise.resolve(params)
	const resolvedSearchParams = await Promise.resolve(searchParams)
	
	// Validate params.id exists
	if (!resolvedParams?.id || typeof resolvedParams.id !== 'string') {
		notFound()
	}

	// Fetch project data on server
	const projectData = await getProjectById(user.id, resolvedParams.id).catch(() => null)

	if (!projectData) {
		notFound()
	}

	// Get initial tab from searchParams or default to "overview"
	const initialTab = (resolvedSearchParams.tab && ["overview", "tasks", "complaints", "contracts"].includes(resolvedSearchParams.tab))
		? resolvedSearchParams.tab as "overview" | "tasks" | "complaints" | "contracts"
		: "overview"

	return (
		<ProjectDetailClient
			initialProjectData={projectData}
			initialTab={initialTab}
		/>
	)
}

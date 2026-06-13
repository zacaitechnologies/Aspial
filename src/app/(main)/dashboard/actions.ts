"use server"

import { z } from "zod"
import { getCachedUser } from "@/lib/auth-cache"
import { getCachedIsUserAdmin } from "@/lib/admin-cache"
import { prisma } from "@/lib/prisma"
import type { TaskStatus, TaskWithAssignee } from "@/app/(main)/projects/types"
import type { DashboardTaskAssigneeOption } from "./types"

const taskStatusSchema = z.enum(["todo", "in_progress", "done"])

const dashboardTasksInputSchema = z.object({
	scope: z.enum(["my", "all"]),
	statuses: z.array(taskStatusSchema).min(1),
	assigneeId: z.string().min(1).optional(),
})

const dashboardTaskInclude = {
	creator: {
		select: { id: true, firstName: true, lastName: true, email: true, supabase_id: true },
	},
	assignee: {
		select: { id: true, firstName: true, lastName: true, email: true, supabase_id: true },
	},
	project: {
		select: { id: true, name: true },
	},
	milestone: {
		select: { id: true, title: true, status: true, color: true },
	},
} as const

async function getAdminVisibleProjectIds(): Promise<number[]> {
	const allProjects = await prisma.project.findMany({
		select: { id: true },
	})
	return allProjects.map((p) => p.id)
}

function formatUserLabel(user: {
	firstName: string | null
	lastName: string | null
	email: string
}): string {
	const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
	return name || user.email
}

export async function getDashboardTasks(input: {
	scope: "my" | "all"
	statuses: TaskStatus[]
	assigneeId?: string
}): Promise<TaskWithAssignee[]> {
	const user = await getCachedUser()
	if (!user) {
		return []
	}

	const parsed = dashboardTasksInputSchema.safeParse(input)
	if (!parsed.success) {
		return []
	}

	const { scope, statuses, assigneeId } = parsed.data

	if (scope === "my") {
		return (await prisma.task.findMany({
			where: {
				assigneeId: user.id,
				status: { in: statuses },
			},
			include: dashboardTaskInclude,
			orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
		})) as TaskWithAssignee[]
	}

	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) {
		return []
	}

	const projectIds = await getAdminVisibleProjectIds()
	if (projectIds.length === 0) {
		return []
	}

	return (await prisma.task.findMany({
		where: {
			projectId: { in: projectIds },
			status: { in: statuses },
			...(assigneeId ? { assigneeId } : {}),
		},
		include: dashboardTaskInclude,
		orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
	})) as TaskWithAssignee[]
}

export async function getDashboardTaskAssigneeOptions(): Promise<DashboardTaskAssigneeOption[]> {
	const user = await getCachedUser()
	if (!user) {
		return []
	}

	const isAdmin = await getCachedIsUserAdmin(user.id)
	if (!isAdmin) {
		return []
	}

	const users = await prisma.user.findMany({
		where: {
			tasksAssigned: { some: {} },
		},
		select: {
			supabase_id: true,
			firstName: true,
			lastName: true,
			email: true,
		},
		orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
	})

	return users.map((u) => ({
		id: u.supabase_id,
		label: formatUserLabel(u),
	}))
}

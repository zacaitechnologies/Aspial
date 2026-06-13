"use client"

import { useEffect, useState } from "react"
import { formatLocalDateTimeForDisplay } from "@/lib/date-utils"
import { useSession } from "../../contexts/SessionProvider"

interface DashboardHeaderProps {
	initialUserRole?: string | null
	lastUpdatedAt: string | null
}

export function DashboardHeader({
	initialUserRole = null,
	lastUpdatedAt,
}: DashboardHeaderProps) {
	const { enhancedUser } = useSession()
	const [isMounted, setIsMounted] = useState(false)

	useEffect(() => {
		setIsMounted(true)
	}, [])

	const getRoleText = () => {
		if (enhancedUser?.profile?.staffRole?.roleName) {
			return `, our ${enhancedUser.profile.staffRole.roleName}`
		}
		const systemRole = initialUserRole ?? enhancedUser?.profile?.userRoles?.[0]?.role?.slug ?? null
		if (systemRole) {
			const roleDisplay =
				systemRole === "brand-advisor"
					? "Brand Advisor"
					: systemRole === "operation-user"
						? "Operation User"
						: systemRole === "admin"
							? "Admin"
							: systemRole === "staff"
								? "Staff"
								: systemRole
			return `, our ${roleDisplay}`
		}
		return ""
	}

	const lastUpdatedLabel = !isMounted
		? "--"
		: lastUpdatedAt
			? formatLocalDateTimeForDisplay(new Date(lastUpdatedAt))
			: "No recent updates"

	return (
		<div>
			<p className="text-primary text-xl font-semibold">
				Hi, {enhancedUser?.profile?.firstName}
				{getRoleText()}! Welcome Back!
			</p>
			<p className="text-sm font-light text-primary">Last Updated: {lastUpdatedLabel}</p>
		</div>
	)
}

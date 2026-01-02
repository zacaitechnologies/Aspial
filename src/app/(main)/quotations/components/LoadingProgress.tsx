"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingProgressProps {
	message?: string
	size?: "sm" | "md" | "lg"
	className?: string
}

export default function LoadingProgress({
	message = "Loading...",
	size = "md",
	className,
}: LoadingProgressProps) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-5 h-5",
		lg: "w-6 h-6",
	}

	const textSizeClasses = {
		sm: "text-sm",
		md: "text-base",
		lg: "text-lg",
	}

	return (
		<div className={cn("flex items-center justify-center gap-2 p-4", className)}>
			<Loader2 className={cn(sizeClasses[size], "animate-spin text-blue-600")} />
			<span className={cn(textSizeClasses[size], "text-gray-700")}>{message}</span>
		</div>
	)
}


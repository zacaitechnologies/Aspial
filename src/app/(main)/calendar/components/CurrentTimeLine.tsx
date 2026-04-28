"use client"

import { useEffect, useState, useCallback } from "react"
import { getLocalTime } from "../utils/calendar-utils"

interface CurrentTimeLineProps {
	/** Height of each hour row in px. The line is positioned within a container whose top = hour 0. */
	hourHeightPx: number
	/** Optional: starting hour offset of the grid (default 0). */
	startHour?: number
	/** Show a small label with the time (Teams-style). */
	showLabel?: boolean
}

export function CurrentTimeLine({
	hourHeightPx,
	startHour = 0,
	showLabel = true,
}: CurrentTimeLineProps) {
	const getPosition = useCallback(() => {
		const { hours, minutes } = getLocalTime()
		const fractionalHour = hours + minutes / 60
		return {
			topPx: (fractionalHour - startHour) * hourHeightPx,
			label: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
			visible: fractionalHour >= startHour && fractionalHour < startHour + 24,
		}
	}, [hourHeightPx, startHour])

	const [pos, setPos] = useState(getPosition)

	useEffect(() => {
		setPos(getPosition())
		const interval = setInterval(() => setPos(getPosition()), 60_000)
		return () => clearInterval(interval)
	}, [getPosition])

	if (!pos.visible) return null

	return (
		<div
			className="pointer-events-none absolute left-0 right-0 z-20"
			style={{ top: pos.topPx }}
		>
			{showLabel && (
				<span className="absolute -top-2.5 left-0 text-[10px] font-semibold text-destructive bg-destructive/10 rounded px-1 leading-tight">
					{pos.label}
				</span>
			)}
			<div className="absolute left-0 -top-[4px] h-2 w-2 rounded-full bg-destructive" />
			<div className="h-[2px] bg-destructive w-full" />
		</div>
	)
}

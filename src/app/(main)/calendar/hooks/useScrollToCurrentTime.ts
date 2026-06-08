import { useLayoutEffect, type RefObject } from "react"
import { CALENDAR_GRID_START_HOUR } from "../constants"
import { getLocalTime } from "../utils/calendar-utils"

/** Scroll a time-grid container so the current time or grid start (7am) sits near the top. */
export function useScrollToCurrentTime(
	scrollRef: RefObject<HTMLDivElement | null>,
	hourHeightPx: number,
	scrollToCurrentTime: boolean,
	scrollKey: string,
	/** Sticky header height inside the scroll container — keeps the target hour below headers. */
	headerOffsetPx = 0,
	gridStartHour = CALENDAR_GRID_START_HOUR,
) {
	useLayoutEffect(() => {
		const scrollToTarget = () => {
			const el = scrollRef.current
			if (!el) return

			const fractionalHour = scrollToCurrentTime
				? (() => {
						const { hours, minutes } = getLocalTime()
						return hours + minutes / 60
					})()
				: gridStartHour

			el.scrollTop = Math.max(
				0,
				(fractionalHour - gridStartHour) * hourHeightPx - headerOffsetPx
			)
		}

		scrollToTarget()
		const raf = requestAnimationFrame(scrollToTarget)
		const timeoutId = window.setTimeout(scrollToTarget, 50)

		return () => {
			cancelAnimationFrame(raf)
			window.clearTimeout(timeoutId)
		}
	}, [scrollToCurrentTime, hourHeightPx, scrollKey, headerOffsetPx, gridStartHour])
}

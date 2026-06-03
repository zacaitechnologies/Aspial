import { useLayoutEffect, type RefObject } from "react"
import { getLocalTime } from "../utils/calendar-utils"

const DEFAULT_SCROLL_HOUR = 8

/** Scroll a time-grid container so the current time or 8am sits at the top of the viewport. */
export function useScrollToCurrentTime(
	scrollRef: RefObject<HTMLDivElement | null>,
	hourHeightPx: number,
	scrollToCurrentTime: boolean,
	scrollKey: string,
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
				: DEFAULT_SCROLL_HOUR

			el.scrollTop = Math.max(0, fractionalHour * hourHeightPx)
		}

		scrollToTarget()
		const raf = requestAnimationFrame(scrollToTarget)
		const timeoutId = window.setTimeout(scrollToTarget, 50)

		return () => {
			cancelAnimationFrame(raf)
			window.clearTimeout(timeoutId)
		}
	}, [scrollToCurrentTime, hourHeightPx, scrollKey])
}

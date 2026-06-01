import { useLayoutEffect, type RefObject } from "react"
import { getLocalTime } from "../utils/calendar-utils"

/** Scroll a time-grid container so the current time is in view (upper third of viewport). */
export function useScrollToCurrentTime(
	scrollRef: RefObject<HTMLDivElement | null>,
	hourHeightPx: number,
	enabled: boolean,
) {
	useLayoutEffect(() => {
		if (!enabled) return

		const scrollToNow = () => {
			const el = scrollRef.current
			if (!el) return
			const { hours, minutes } = getLocalTime()
			const fractionalHour = hours + minutes / 60
			const lineTop = fractionalHour * hourHeightPx
			const target = lineTop - el.clientHeight / 3
			el.scrollTop = Math.max(0, target)
		}

		scrollToNow()
		const raf = requestAnimationFrame(scrollToNow)
		const timeoutId = window.setTimeout(scrollToNow, 50)

		return () => {
			cancelAnimationFrame(raf)
			window.clearTimeout(timeoutId)
		}
	}, [enabled, hourHeightPx])
}

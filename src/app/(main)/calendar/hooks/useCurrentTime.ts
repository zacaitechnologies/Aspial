import { useEffect, useState } from "react"

/** Client clock for time-sensitive UI (e.g. past-event fading). Updates every minute. */
export function useCurrentTime(updateIntervalMs = 60_000): Date {
	const [now, setNow] = useState(() => new Date())

	useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), updateIntervalMs)
		return () => window.clearInterval(id)
	}, [updateIntervalMs])

	return now
}

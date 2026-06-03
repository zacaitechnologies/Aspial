"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import type { CalendarBooking } from "../actions"
import { EventTooltipContent } from "./EventTooltipContent"

const tooltipContentClass =
	"cal-event-tooltip bg-card text-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit max-w-[16rem] origin-(--radix-tooltip-content-transform-origin) rounded-md border border-border px-3 py-2.5 text-xs text-balance shadow-md"

const tooltipArrowClass =
	"cal-event-tooltip-arrow fill-card z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"

interface CalendarTooltipProps {
	content: React.ReactNode
	children: React.ReactElement
	side?: "top" | "right" | "bottom" | "left"
	align?: "start" | "center" | "end"
	sideOffset?: number
}

export function CalendarTooltip({
	content,
	children,
	side = "top",
	align = "start",
	sideOffset = 8,
}: CalendarTooltipProps) {
	return (
		<TooltipPrimitive.Root>
			<TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
			<TooltipPrimitive.Portal>
				<TooltipPrimitive.Content
					side={side}
					align={align}
					sideOffset={sideOffset}
					className={tooltipContentClass}
				>
					{content}
					<TooltipPrimitive.Arrow className={tooltipArrowClass} />
				</TooltipPrimitive.Content>
			</TooltipPrimitive.Portal>
		</TooltipPrimitive.Root>
	)
}

interface CalendarEventTooltipProps {
	booking: CalendarBooking
	children: React.ReactElement
	side?: "top" | "right" | "bottom" | "left"
	align?: "start" | "center" | "end"
	sideOffset?: number
}

export function CalendarEventTooltip({
	booking,
	children,
	side = "top",
	align = "start",
	sideOffset = 8,
}: CalendarEventTooltipProps) {
	return (
		<CalendarTooltip
			content={<EventTooltipContent booking={booking} />}
			side={side}
			align={align}
			sideOffset={sideOffset}
		>
			{children}
		</CalendarTooltip>
	)
}

export function CalendarEventTooltipProvider({
	children,
	delayDuration = 300,
}: {
	children: React.ReactNode
	delayDuration?: number
}) {
	return (
		<TooltipPrimitive.Provider delayDuration={delayDuration}>
			{children}
		</TooltipPrimitive.Provider>
	)
}

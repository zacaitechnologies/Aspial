import { getBusinessTodayDateString, toBusinessTZParts } from "@/lib/date-utils";

/**
 * Lateness state for a task or milestone, derived from its due date and
 * (optional) completion timestamp. Comparisons are done on the Malaysia-TZ
 * CALENDAR DATE (YYYY-MM-DD), not the exact instant — so a due date of
 * 2026-06-20 with a completion of 2026-06-20T23:59:59 counts as on time.
 */
export type DeadlineStatus =
  | "overdue"
  | "completed_late"
  | "completed_on_time"
  | "on_track";

/**
 * Determine the deadline status. A task is "completed" when status === 'done';
 * a milestone when status === 'completed' — the caller passes `isCompleted`.
 */
export function getDeadlineStatus(args: {
  dueDate: Date | string;
  completedAt: Date | string | null | undefined;
  isCompleted: boolean;
}): DeadlineStatus {
  const dueStr = toBusinessTZParts(new Date(args.dueDate)).dateStr;

  if (args.isCompleted && args.completedAt) {
    const doneStr = toBusinessTZParts(new Date(args.completedAt)).dateStr;
    // Lexicographic compare is correct for zero-padded YYYY-MM-DD strings.
    return doneStr > dueStr ? "completed_late" : "completed_on_time";
  }

  if (args.isCompleted) {
    // Completed but no timestamp recorded (e.g. legacy data) — treat as on time.
    return "completed_on_time";
  }

  return getBusinessTodayDateString() > dueStr ? "overdue" : "on_track";
}

export type DeadlineBadge = {
  label: string;
  /** Tailwind classes for the badge (background/text/border). */
  className: string;
};

/**
 * Map a DeadlineStatus to a small badge. Returns null for "on_track" (nothing
 * worth flagging yet).
 */
export function getDeadlineBadge(status: DeadlineStatus): DeadlineBadge | null {
  switch (status) {
    case "overdue":
      return {
        label: "Overdue",
        className: "bg-red-100 text-red-800 border-red-200",
      };
    case "completed_late":
      return {
        label: "Completed late",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      };
    case "completed_on_time":
      return {
        label: "On time",
        className: "bg-green-100 text-green-800 border-green-200",
      };
    case "on_track":
    default:
      return null;
  }
}

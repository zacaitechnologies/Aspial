const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ReminderWithEmails = {
	offsetMinutes: number
	recipientEmails: string[]
}

export function getValidEmails(emails: string[]): string[] {
	const seen = new Set<string>()
	const valid: string[] = []
	for (const email of emails) {
		const trimmed = email.trim()
		if (!trimmed || !EMAIL_REGEX.test(trimmed) || seen.has(trimmed)) continue
		seen.add(trimmed)
		valid.push(trimmed)
	}
	return valid
}

export function remindersHaveConfiguredEmails(reminders: ReminderWithEmails[]): boolean {
	return reminders.some((reminder) => getValidEmails(reminder.recipientEmails).length > 0)
}

function mergeEmailsAppend(existing: string[], source: string[]): string[] {
	const seen = new Set<string>()
	const merged: string[] = []

	for (const email of existing) {
		const trimmed = email.trim()
		if (!trimmed || seen.has(trimmed)) continue
		seen.add(trimmed)
		merged.push(trimmed)
	}

	for (const email of source) {
		if (seen.has(email)) continue
		seen.add(email)
		merged.push(email)
	}

	return merged.length > 0 ? merged : [""]
}

export function applyEmailsToAllReminders(
	reminders: ReminderWithEmails[],
	sourceEmails: string[],
	mode: "overwrite" | "append"
): ReminderWithEmails[] {
	const validSource = getValidEmails(sourceEmails)
	if (validSource.length === 0) return reminders

	return reminders.map((reminder) => {
		if (mode === "overwrite") {
			return { ...reminder, recipientEmails: [...validSource] }
		}
		return {
			...reminder,
			recipientEmails: mergeEmailsAppend(reminder.recipientEmails, validSource),
		}
	})
}

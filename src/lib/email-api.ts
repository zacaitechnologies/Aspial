type ResendErrorPayload = {
	message?: string
	name?: string
}

type EmailSendApiBody = {
	success?: boolean
	error?: string | ResendErrorPayload
	data?: {
		id?: string
		error?: ResendErrorPayload | null
	} | null
}

function formatResendError(error: ResendErrorPayload): string {
	const message = error.message?.trim() || "Failed to send email"

	switch (error.name) {
		case "rate_limit_exceeded":
			return "Too many email requests. Please wait a moment and try again."
		case "monthly_quota_exceeded":
			return "Monthly email quota reached. Please contact support or upgrade your plan."
		case "daily_quota_exceeded":
			return "Daily email quota reached. Please try again tomorrow or upgrade your plan."
		default:
			return message
	}
}

function extractErrorMessage(error: unknown): string | undefined {
	if (typeof error === "string" && error.trim()) {
		return error.trim()
	}

	if (error && typeof error === "object" && "message" in error) {
		const message = (error as ResendErrorPayload).message
		if (typeof message === "string" && message.trim()) {
			return formatResendError(error as ResendErrorPayload)
		}
	}

	return undefined
}

function extractEmailSendResult(body: unknown, responseOk: boolean): { success: boolean; error?: string } {
	if (body && typeof body === "object") {
		const payload = body as EmailSendApiBody

		if (payload.success === false) {
			return {
				success: false,
				error: extractErrorMessage(payload.error) ?? "Failed to send email. Please try again.",
			}
		}

		const topLevelError = extractErrorMessage(payload.error)
		if (topLevelError) {
			return { success: false, error: topLevelError }
		}

		// Resend SDK shape nested under `data`: { data: { id }, error }
		if (payload.data && typeof payload.data === "object") {
			const nested = payload.data as {
				id?: string
				error?: ResendErrorPayload | null
				data?: { id?: string } | null
			}

			const nestedResendError = nested.error
			if (nestedResendError) {
				return {
					success: false,
					error: formatResendError(nestedResendError),
				}
			}

			const resendMessageId =
				typeof nested.id === "string" ? nested.id : nested.data?.id
			if (payload.success === true && payload.data !== undefined && !resendMessageId) {
				return {
					success: false,
					error: "Failed to send email — no confirmation received from email provider.",
				}
			}
		}
	}

	if (!responseOk) {
		return { success: false, error: "Failed to send email. Please try again." }
	}

	return { success: true }
}

export async function parseEmailSendResponse(
	response: Response
): Promise<{ success: boolean; error?: string }> {
	let body: unknown = null

	try {
		body = await response.json()
	} catch {
		if (!response.ok) {
			return { success: false, error: "Failed to send email. Please try again." }
		}
		return { success: true }
	}

	return extractEmailSendResult(body, response.ok)
}

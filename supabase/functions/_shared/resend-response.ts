type ResendError = {
	message?: string
	name?: string
}

type ResendSendResult = {
	data?: { id?: string } | null
	error?: ResendError | null
}

export function formatResendError(error: ResendError): string {
	const message = error.message?.trim() || "Failed to send email"

	switch (error.name) {
		case "rate_limit_exceeded":
			return "Too many email requests. Please wait a moment and try again."
		case "monthly_quota_exceeded":
			return "Monthly email quota reached. Please contact support or upgrade your plan."
		case "daily_quota_exceeded":
			return "Daily email quota reached. Please try again tomorrow or upgrade your plan."
		case "validation_error":
			return message
		default:
			return message
	}
}

function getResendErrorStatus(name?: string): number {
	switch (name) {
		case "rate_limit_exceeded":
		case "monthly_quota_exceeded":
		case "daily_quota_exceeded":
			return 429
		case "validation_error":
		case "invalid_from_address":
		case "missing_required_field":
		case "invalid_attachment":
			return 422
		default:
			return 500
	}
}

export function handleResendSendResult(result: ResendSendResult): Response {
	if (result.error) {
		const errorMessage = formatResendError(result.error)

		return new Response(
			JSON.stringify({ success: false, error: errorMessage }),
			{
				status: getResendErrorStatus(result.error.name),
				headers: { "Content-Type": "application/json" },
			}
		)
	}

	if (!result.data?.id) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Failed to send email — no confirmation received from email provider.",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		)
	}

	return new Response(JSON.stringify({ success: true, data: result.data }), {
		headers: { "Content-Type": "application/json" },
	})
}

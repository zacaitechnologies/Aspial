// Shared Amazon SES (v2 API) email sender + response helpers.
//
// This replaces the previous Resend integration. It keeps the exact same
// HTTP response contract ({ success, data, error }) so the Next.js callers
// (src/lib/email-api.ts and the *_action.ts files) need no changes.
//
// Required Supabase Edge Function secrets:
//   AWS_REGION              e.g. ap-southeast-1
//   AWS_ACCESS_KEY_ID       IAM access key with the ses:SendEmail permission
//   AWS_SECRET_ACCESS_KEY   matching IAM secret access key

import {
	SESv2Client,
	SendEmailCommand,
	type SendEmailCommandInput,
} from "npm:@aws-sdk/client-sesv2@^3.700.0"

export type EmailAttachment = {
	filename: string
	/** Base64-encoded file content (no `data:` URI prefix). */
	content: string
	/** MIME type, e.g. "application/pdf". Defaults to octet-stream. */
	contentType?: string
}

export type SendEmailParams = {
	/** Sender, may use "Display Name <address@domain>" form. */
	from: string
	to: string[]
	subject: string
	html: string
	attachments?: EmailAttachment[]
}

/** Normalised result shape (mirrors the old Resend result for drop-in use). */
export type EmailSendResult = {
	data?: { id?: string } | null
	error?: { message?: string; name?: string } | null
}

let cachedClient: SESv2Client | null = null

function getClient(): SESv2Client {
	if (cachedClient) return cachedClient

	const region = Deno.env.get("AWS_REGION") ?? "ap-southeast-1"
	const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID")
	const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY")

	if (!accessKeyId || !secretAccessKey) {
		throw new Error(
			"AWS SES credentials are not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)."
		)
	}

	cachedClient = new SESv2Client({
		region,
		credentials: { accessKeyId, secretAccessKey },
	})
	return cachedClient
}

/** Decode a base64 string to raw bytes for SES attachment RawContent. */
function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}

/**
 * Send an email through Amazon SES. Never throws — failures are returned in
 * the `error` field so callers can use the same handling as before.
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
	try {
		const client = getClient()

		const input: SendEmailCommandInput = {
			FromEmailAddress: params.from,
			Destination: { ToAddresses: params.to },
			Content: {
				Simple: {
					Subject: { Data: params.subject, Charset: "UTF-8" },
					Body: { Html: { Data: params.html, Charset: "UTF-8" } },
					...(params.attachments && params.attachments.length > 0
						? {
								Attachments: params.attachments.map((a) => ({
									FileName: a.filename,
									ContentType: a.contentType ?? "application/octet-stream",
									ContentDisposition: "ATTACHMENT" as const,
									RawContent: base64ToBytes(a.content),
								})),
							}
						: {}),
				},
			},
		}

		const response = await client.send(new SendEmailCommand(input))
		return { data: { id: response.MessageId } }
	} catch (error) {
		const err = error as { name?: string; message?: string }
		return { error: { name: err.name, message: err.message } }
	}
}

// ---------------------------------------------------------------------------
// Response helpers — map SES errors to friendly messages / HTTP statuses.
// ---------------------------------------------------------------------------

export function formatSesError(error: { message?: string; name?: string }): string {
	const message = error.message?.trim() || "Failed to send email"

	switch (error.name) {
		case "ThrottlingException":
		case "Throttling":
		case "TooManyRequestsException":
			return "Too many email requests. Please wait a moment and try again."
		case "LimitExceededException":
			return "Email sending limit reached. Please try again later or contact support."
		case "AccountSuspendedException":
			return "Email sending is paused for this account. Please contact support."
		case "SendingPausedException":
			return "Email sending is temporarily paused. Please try again later."
		case "MailFromDomainNotVerifiedException":
		case "MessageRejected":
		case "BadRequestException":
			return message
		default:
			return message
	}
}

function getSesErrorStatus(name?: string): number {
	switch (name) {
		case "ThrottlingException":
		case "Throttling":
		case "TooManyRequestsException":
		case "LimitExceededException":
			return 429
		case "MessageRejected":
		case "MailFromDomainNotVerifiedException":
		case "BadRequestException":
			return 422
		default:
			return 500
	}
}

export function handleSesSendResult(result: EmailSendResult): Response {
	if (result.error) {
		return new Response(
			JSON.stringify({ success: false, error: formatSesError(result.error) }),
			{
				status: getSesErrorStatus(result.error.name),
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

/** Returns true only when SES confirmed delivery (has message id, no error). */
export function isSesSendSuccessful(result: EmailSendResult): boolean {
	return !result.error && Boolean(result.data?.id)
}

/** Human-readable failure reason from an SES send result, if any. */
export function getSesSendFailureMessage(result: EmailSendResult): string {
	if (result.error) {
		return formatSesError(result.error)
	}
	return "Failed to send email — no confirmation received from email provider."
}

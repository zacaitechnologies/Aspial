import { Resend } from 'npm:resend'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
	try {
		// Verify service role key authentication
		const authHeader = req.headers.get('Authorization')
		const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
		
		if (!authHeader || !serviceRoleKey) {
			return new Response(
				JSON.stringify({ error: 'Missing authorization' }),
				{
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		const token = authHeader.replace('Bearer ', '')
		if (token !== serviceRoleKey) {
			return new Response(
				JSON.stringify({ error: 'Unauthorized' }),
				{
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		// Create Supabase client with service role
		const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
		const supabase = createClient(supabaseUrl, serviceRoleKey)

		// Fetch due reminders (PENDING status, remindAt <= now)
		// Also fetch FAILED reminders that should be retried (with exponential backoff)
		const now = new Date()
		const nowISO = now.toISOString()
		const MAX_RETRY_ATTEMPTS = 5
		const RETRY_DELAY_HOURS = [1, 2, 4, 8, 24] // Exponential backoff: 1h, 2h, 4h, 8h, 24h
		
		// Fetch PENDING reminders that are due
		const { data: pendingReminders, error: pendingError } = await supabase
			.from('appointment_booking_reminders')
			.select(`
				id,
				appointmentBookingId,
				offsetMinutes,
				recipientEmail,
				remindAt,
				status,
				attemptCount,
				lastAttemptAt,
				appointment_bookings!inner(
					id,
					startDate,
					endDate,
					purpose,
					bookedBy,
					appointments(
						id,
						name,
						location
					),
					projects!inner(
						id,
						name,
						clientName,
						clients(
							id,
							name,
							email,
							company
						)
					)
				)
			`)
			.eq('status', 'PENDING')
			.lte('remindAt', nowISO)
			.limit(50) // Process in batches

		// Fetch FAILED reminders that should be retried
		// Only retry if:
		// 1. attemptCount < MAX_RETRY_ATTEMPTS
		// 2. Enough time has passed since last attempt (exponential backoff)
		// 3. Appointment hasn't passed yet (optional - we can still send late reminders)
		const { data: failedReminders, error: failedError } = await supabase
			.from('appointment_booking_reminders')
			.select(`
				id,
				appointmentBookingId,
				offsetMinutes,
				recipientEmail,
				remindAt,
				status,
				attemptCount,
				lastAttemptAt,
				appointment_bookings!inner(
					id,
					startDate,
					endDate,
					purpose,
					bookedBy,
					appointments(
						id,
						name,
						location
					),
					projects!inner(
						id,
						name,
						clientName,
						clients(
							id,
							name,
							email,
							company
						)
					)
				)
			`)
			.eq('status', 'FAILED')
			.lt('attemptCount', MAX_RETRY_ATTEMPTS)
			.limit(50)

		// Filter failed reminders by retry delay
		const retryableFailedReminders = (failedReminders || []).filter((reminder: any) => {
			if (!reminder.lastAttemptAt) return true // No previous attempt, retry immediately
			
			const attemptCount = reminder.attemptCount || 0
			if (attemptCount >= MAX_RETRY_ATTEMPTS) return false // Max retries reached
			
			// Calculate delay based on attempt count
			// attemptCount = 1 means first retry (use delay[0] = 1 hour)
			// attemptCount = 2 means second retry (use delay[1] = 2 hours)
			// etc.
			const delayIndex = Math.min(attemptCount - 1, RETRY_DELAY_HOURS.length - 1)
			const delayHours = RETRY_DELAY_HOURS[delayIndex] || RETRY_DELAY_HOURS[0]
			const lastAttempt = new Date(reminder.lastAttemptAt)
			const retryAfter = new Date(lastAttempt.getTime() + delayHours * 60 * 60 * 1000)
			
			return now >= retryAfter // Enough time has passed
		})

		// Combine pending and retryable failed reminders
		const reminders = [
			...(pendingReminders || []),
			...retryableFailedReminders
		]

		const fetchError = pendingError || failedError

		if (fetchError) {
			console.error('Error fetching reminders:', fetchError)
			return new Response(
				JSON.stringify({ error: 'Failed to fetch reminders', details: fetchError.message }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		if (!reminders || reminders.length === 0) {
			return new Response(
				JSON.stringify({ success: true, processed: 0, message: 'No due reminders' }),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		let successCount = 0
		let failureCount = 0

		// Process each reminder
		for (const reminder of reminders) {
			const booking = reminder.appointment_bookings
			
			// Use email from reminder table, fallback to project client email
			const client = booking?.projects?.clients
			const clientEmail = reminder.recipientEmail || client?.email

			if (!clientEmail) {
				// Mark as failed if no email (permanent failure - no retry)
				await supabase
					.from('appointment_booking_reminders')
					.update({
						status: 'FAILED',
						lastError: 'No email address specified for reminder',
						lastAttemptAt: nowISO,
						attemptCount: (reminder.attemptCount || 0) + 1
					})
					.eq('id', reminder.id)
				failureCount++
				continue
			}

			if (!booking) {
				// Mark as failed if no booking (permanent failure - no retry)
				await supabase
					.from('appointment_booking_reminders')
					.update({
						status: 'FAILED',
						lastError: 'Booking not found',
						lastAttemptAt: nowISO,
						attemptCount: (reminder.attemptCount || 0) + 1
					})
					.eq('id', reminder.id)
				failureCount++
				continue
			}

			// Mark as SENDING (reset from FAILED to SENDING for retries)
			// Note: attemptCount will be incremented in the catch block if it fails
			await supabase
				.from('appointment_booking_reminders')
				.update({
					status: 'SENDING',
					lastAttemptAt: nowISO
				})
				.eq('id', reminder.id)

			try {
				// Format dates
				const startDate = new Date(booking.startDate)
				const endDate = new Date(booking.endDate)
				
				const formattedStartDate = startDate.toLocaleDateString('en-GB', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
				const formattedStartTime = startDate.toLocaleTimeString('en-GB', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: true
				})
				const formattedEndTime = endDate.toLocaleTimeString('en-GB', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: true
				})

				// Email template (same as confirmation, but with "Reminder" subject)
				const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F0E8D8; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F0E8D8; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(32, 47, 33, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #202F21; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">ASPIAL PRODUCTION</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #202F21; font-size: 24px; font-weight: 600;">Appointment Reminder</h2>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Dear ${client?.name || booking.projects?.clientName || 'Valued Client'},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                This is a friendly reminder about your upcoming appointment with Aspial Production.
              </p>
              
              <div style="background-color: #F0E8D8; border-left: 4px solid #BDC4A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Details</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>What:</strong> ${booking.appointments?.name || 'General Appointment'}</p>
                ${booking.appointments?.location ? `<p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Where:</strong> ${booking.appointments.location}</p>` : ''}
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>When:</strong> ${formattedStartDate} at ${formattedStartTime} - ${formattedEndTime}</p>
                ${booking.purpose ? `<p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Purpose:</strong> ${booking.purpose}</p>` : ''}
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Booked By:</strong> ${booking.bookedBy}</p>
              </div>
              
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                We look forward to seeing you. If you need to reschedule or have any questions, please contact us as soon as possible.
              </p>
              
              <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #BDC4A5;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 16px; font-weight: 600;">Best regards,</p>
                <p style="margin: 0; color: #202F21; font-size: 16px;">Aspial Production Team</p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #898D74; padding: 25px 40px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: 600;">Contact Information</p>
              <p style="margin: 5px 0; color: #ffffff; font-size: 13px;">2A, Lorong Dato Abu Bakar, Section 16, 46350 Petaling Jaya, Selangor</p>
              <p style="margin: 5px 0; color: #ffffff; font-size: 13px;">Phone: 016-753 5323 | Email: contact@aspialwork.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
				`

				// Send email
				const emailResult = await resend.emails.send({
					from: 'Aspial Production <appointments@aspialwork.com>',
					to: [clientEmail],
					subject: `Appointment Reminder - ${booking.appointments?.name || 'Aspial Production'}`,
					html: emailHtml,
				})

				// Mark as SENT and log email
				await supabase
					.from('appointment_booking_reminders')
					.update({
						status: 'SENT',
						sentAt: nowISO,
						lastError: null // Clear any previous errors
					})
					.eq('id', reminder.id)

				// Log email in appointment_booking_emails (sentById = null for system, isAutomated = true)
				await supabase
					.from('appointment_booking_emails')
					.insert({
						appointmentBookingId: booking.id,
						recipientEmail: clientEmail,
						sentById: null, // System-sent
						sentAt: nowISO,
						isAutomated: true // Mark as automated reminder
					})

				successCount++
			} catch (error: any) {
				console.error(`Error sending reminder ${reminder.id}:`, error)
				
				const attemptCount = (reminder.attemptCount || 0) + 1
				const shouldRetry = attemptCount < MAX_RETRY_ATTEMPTS
				
				// Mark as FAILED (will be retried if attemptCount < MAX_RETRY_ATTEMPTS)
				// If max retries reached, it stays FAILED permanently
				await supabase
					.from('appointment_booking_reminders')
					.update({
						status: 'FAILED', // Keep as FAILED, but will retry if under limit
						lastError: error.message || 'Failed to send email',
						lastAttemptAt: nowISO,
						attemptCount: attemptCount
					})
					.eq('id', reminder.id)
				
				if (shouldRetry) {
					console.log(`Reminder ${reminder.id} will be retried (attempt ${attemptCount}/${MAX_RETRY_ATTEMPTS})`)
				} else {
					console.log(`Reminder ${reminder.id} has reached max retry attempts (${MAX_RETRY_ATTEMPTS})`)
				}
				
				failureCount++
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				processed: reminders.length,
				successCount,
				failureCount,
				pendingCount: pendingReminders?.length || 0,
				retryCount: retryableFailedReminders.length
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	} catch (error: any) {
		console.error('Error in send-reminder function:', error)
		return new Response(
			JSON.stringify({ error: error.message || 'Internal server error' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
})


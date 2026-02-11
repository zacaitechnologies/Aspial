import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
	try {
		// Get the appointment details from the request
		const {
			appointmentName,
			appointmentLocation,
			clientName,
			clientEmail,
			startDate,
			endDate,
			purpose,
			bookedBy,
		} = await req.json()

		if (!clientEmail) {
			return new Response(
				JSON.stringify({ error: 'Missing required field: clientEmail is required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		// Format the dates
		const formattedStartDate = new Date(startDate).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
		const formattedStartTime = new Date(startDate).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		})
		const formattedEndTime = new Date(endDate).toLocaleTimeString('en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		})

		// Aspial office address and Waze navigation link
		const ASPIAL_OFFICE_ADDRESS = "2A, JALAN DATO' ABU BAKAR, JALAN 16/1, SECTION 16, 46350 PETALING JAYA, SELANGOR"
		const WAZE_NAVIGATE_URL = "https://ul.waze.com/ul?place=ChIJMdub_wlJzDERwbGv54ey2kI&ll=3.11970320%2C101.64305870&navigate=yes&utm_campaign=default&utm_source=waze_website&utm_medium=lm_share_location"

		// Professional email template matching Aspial theme
		// Colors: #202F21 (dark green), #BDC4A5 (sage), #F0E8D8 (cream), #898D74 (muted green-gray)
		const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation</title>
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
              <h2 style="margin: 0 0 20px 0; color: #202F21; font-size: 24px; font-weight: 600;">Appointment Confirmation</h2>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Dear ${clientName || 'Valued Client'},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                This email confirms your appointment booking with Aspial Production.
              </p>
              
              <div style="background-color: #F0E8D8; border-left: 4px solid #BDC4A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Appointment Details</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Appointment:</strong> ${appointmentName}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Location:</strong> ${ASPIAL_OFFICE_ADDRESS}</p>
                <p style="margin: 5px 0 15px 0; color: #202F21; font-size: 16px;"><a href="${WAZE_NAVIGATE_URL}" style="color: #202F21; font-weight: 600; text-decoration: underline;">Navigate with Waze</a></p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Date:</strong> ${formattedStartDate}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
                ${purpose ? `<p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Purpose:</strong> ${purpose}</p>` : ''}
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Booked By:</strong> ${bookedBy}</p>
              </div>
              
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                Please arrive on time for your appointment. Rescheduling must be notified at least 3 days in advance. If you need to reschedule or cancel, please contact us as soon as possible.
              </p>
              
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                We look forward to meeting with you.
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
              <p style="margin: 5px 0; color: #ffffff; font-size: 13px;">${ASPIAL_OFFICE_ADDRESS}</p>
              <p style="margin: 10px 0 5px 0;"><a href="${WAZE_NAVIGATE_URL}" style="color: #ffffff; font-size: 13px; text-decoration: underline;">Navigate with Waze</a></p>
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

		// Send the email via Resend
		const data = await resend.emails.send({
			from: 'Aspial Production <quotes@aspialwork.com>',
			to: [clientEmail],
			cc: ['admin@aspialwork.com'],
			subject: `Appointment Confirmation - ${appointmentName} - ${formattedStartDate}`,
			html: emailHtml,
		})

		return new Response(JSON.stringify({ success: true, data }), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		console.error('Error sending appointment confirmation email:', error)
		const errorMessage = error instanceof Error ? error.message : 'Failed to send email'
		return new Response(
			JSON.stringify({ error: errorMessage }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
})


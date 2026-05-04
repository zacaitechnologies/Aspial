import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
	try {
		const {
			deliveryOrderId,
			deliveryOrderNumber,
			customerName,
			customerEmail,
			clientCompany,
			amount,
			pdfBase64,
			deliveryOrderDate,
		} = await req.json()

		if (!customerEmail || !pdfBase64) {
			return new Response(
				JSON.stringify({ error: 'Missing required fields: customerEmail and pdfBase64 are required' }),
				{ status: 400, headers: { 'Content-Type': 'application/json' } }
			)
		}

		const formattedDate = new Date(deliveryOrderDate).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		})

		const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64

		const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delivery Order ${deliveryOrderNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F0E8D8; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F0E8D8; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(32, 47, 33, 0.1);">
          <tr>
            <td style="background-color: #202F21; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: 1px;">ASPIAL PRODUCTION</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #202F21; font-size: 24px; font-weight: 600;">Delivery Order ${deliveryOrderNumber}</h2>
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Dear ${customerName}${clientCompany ? ` (${clientCompany})` : ''},
              </p>
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Please find attached your delivery order for the services rendered. Kindly review and confirm the contents.
              </p>
              <div style="background-color: #F0E8D8; border-left: 4px solid #BDC4A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Delivery Order Details</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>DO Number:</strong> ${deliveryOrderNumber}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Date:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Total:</strong> RM ${parseFloat(amount).toFixed(2)}</p>
              </div>
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                The complete delivery order is attached as a PDF. Please don't hesitate to reach out if you have any questions.
              </p>
              <div style="margin: 30px 0; padding-top: 20px; border-top: 1px solid #BDC4A5;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 16px; font-weight: 600;">Best regards,</p>
                <p style="margin: 0; color: #202F21; font-size: 16px;">Aspial Production Team</p>
              </div>
            </td>
          </tr>
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

		const data = await resend.emails.send({
			from: 'Aspial Production <quotes@aspialwork.com>',
			to: [customerEmail],
			cc: ['admin@aspialwork.com'],
			subject: `Delivery Order ${deliveryOrderNumber} - Aspial Production`,
			html: emailHtml,
			attachments: [
				{
					filename: `DeliveryOrder-${deliveryOrderNumber}.pdf`,
					content: cleanBase64,
					type: 'application/pdf',
					disposition: 'attachment',
				},
			],
		})

		return new Response(JSON.stringify({ success: true, deliveryOrderId, data }), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		console.error('Error sending delivery order email:', error)
		return new Response(
			JSON.stringify({ error: (error as Error).message || 'Failed to send email' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		)
	}
})

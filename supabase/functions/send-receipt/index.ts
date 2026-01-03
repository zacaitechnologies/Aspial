import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
	try {
		// Get the receipt details from the request
		const {
			receiptId,
			receiptNumber,
			invoiceNumber,
			customerName,
			customerEmail,
			clientCompany,
			amount,
			pdfBase64,
			receiptDate,
		} = await req.json()

		if (!customerEmail || !pdfBase64) {
			return new Response(
				JSON.stringify({ error: 'Missing required fields: customerEmail and pdfBase64 are required' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			)
		}

		// Format the date
		const formattedDate = new Date(receiptDate).toLocaleDateString('en-GB', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})

		// Convert base64 string to Buffer for Resend attachment
		// Remove data URI prefix if present (data:application/pdf;base64,)
		const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64

		// Professional email template matching Aspial theme
		// Colors: #202F21 (dark green), #BDC4A5 (sage), #F0E8D8 (cream), #898D74 (muted green-gray)
		const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${receiptNumber}</title>
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
              <h2 style="margin: 0 0 20px 0; color: #202F21; font-size: 24px; font-weight: 600;">Receipt ${receiptNumber}</h2>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Dear ${customerName}${clientCompany ? ` (${clientCompany})` : ''},
              </p>
              
              <p style="margin: 0 0 20px 0; color: #202F21; font-size: 16px;">
                Please find attached the receipt for your payment reference.
              </p>
              
              <div style="background-color: #F0E8D8; border-left: 4px solid #BDC4A5; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #202F21; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Receipt Details</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Receipt Number:</strong> ${receiptNumber}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Invoice Reference:</strong> ${invoiceNumber || 'N/A'}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Receipt Date:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0; color: #202F21; font-size: 16px;"><strong>Amount Received:</strong> RM ${parseFloat(amount).toFixed(2)}</p>
              </div>
              
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                Please find the detailed receipt attached as a PDF document. The receipt includes all services, pricing, and payment information.
              </p>
              
              <p style="margin: 20px 0; color: #202F21; font-size: 16px;">
                If you have any questions regarding this receipt, please do not hesitate to contact us. We appreciate your business.
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

		// Send the email via Resend
		const data = await resend.emails.send({
			from: 'Aspial Production <quotes@aspialwork.com>',
			to: [customerEmail],
			cc: ['admin@aspialwork.com'],
			subject: `Receipt ${receiptNumber} - Aspial Production`,
			html: emailHtml,
			attachments: [
				{
					filename: `Receipt-${receiptNumber}.pdf`,
					content: cleanBase64,
					type: 'application/pdf',
					disposition: 'attachment',
				},
			],
		})

		return new Response(JSON.stringify({ success: true, data }), {
			headers: { 'Content-Type': 'application/json' }
		})
	} catch (error) {
		console.error('Error sending receipt email:', error)
		return new Response(
			JSON.stringify({ error: error.message || 'Failed to send email' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		)
	}
})


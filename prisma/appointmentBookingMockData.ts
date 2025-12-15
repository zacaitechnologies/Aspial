const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function appointmentBookingMain() {
	console.log('Starting to seed appointment bookings...')

	// Get the first user from the database to use as bookedBy
	const firstUser = await prisma.user.findFirst({
		select: {
			supabase_id: true,
			firstName: true,
			lastName: true,
		},
	})

	if (!firstUser) {
		console.warn('⚠️  No users found in database. Please seed users first using: npm run seed:users')
		console.log('Skipping appointment bookings seed.')
		return
	}

	console.log(`Using user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser.supabase_id})`)

	// Get all appointments to create bookings for
	const appointments = await prisma.appointment.findMany({
		take: 10, // Get first 10 appointments
	})

	if (appointments.length === 0) {
		console.error('No appointments found in database. Please seed appointments first.')
		process.exit(1)
	}

	// Get first project if exists
	const firstProject = await prisma.project.findFirst({
		select: {
			id: true,
			name: true,
		},
	})

	// Define the appointment bookings to be created
	const now = new Date()
	const bookings = [
		// Past bookings
		{
			appointmentId: appointments[0]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
			endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
			purpose: 'Product photography session for new collection',
			appointmentType: 'PHOTO_SHOOT',
			status: 'completed',
			projectId: firstProject?.id || null,
			attendees: 5,
		},
		{
			appointmentId: appointments[1]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
			endDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
			purpose: 'Corporate video shoot for company profile',
			appointmentType: 'VIDEO_SHOOT',
			status: 'completed',
			projectId: firstProject?.id || null,
			attendees: 8,
		},
		{
			appointmentId: appointments[2]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
			endDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000), // 1 hour duration
			purpose: 'Initial consultation for wedding photography package',
			appointmentType: 'CONSULTATION',
			status: 'completed',
			projectId: null,
			attendees: 2,
		},

		// Today's bookings
		{
			appointmentId: appointments[3]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
			endDate: new Date(now.getTime() + 4 * 60 * 60 * 1000), // 2 hours duration
			purpose: 'Photo selection session for client review',
			appointmentType: 'PHOTO_SELECTION',
			status: 'active',
			projectId: firstProject?.id || null,
			attendees: 3,
		},
		{
			appointmentId: appointments[4]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 5 * 60 * 60 * 1000), // 5 hours from now
			endDate: new Date(now.getTime() + 7 * 60 * 60 * 1000), // 2 hours duration
			purpose: 'Fashion photography session',
			appointmentType: 'PHOTO_SHOOT',
			status: 'active',
			projectId: firstProject?.id || null,
			attendees: 6,
		},

		// Future bookings
		{
			appointmentId: appointments[5]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
			endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours duration
			purpose: 'Commercial video production',
			appointmentType: 'VIDEO_SHOOT',
			status: 'active',
			projectId: firstProject?.id || null,
			attendees: 10,
		},
		{
			appointmentId: appointments[6]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
			endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000), // 1.5 hours duration
			purpose: 'Portfolio review consultation',
			appointmentType: 'CONSULTATION',
			status: 'active',
			projectId: null,
			attendees: 2,
		},
		{
			appointmentId: appointments[7]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
			endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // 3 hours duration
			purpose: 'Family portrait session',
			appointmentType: 'PHOTO_SHOOT',
			status: 'active',
			projectId: null,
			attendees: 4,
		},
		{
			appointmentId: appointments[8]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
			endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
			purpose: 'Final photo selection and album design',
			appointmentType: 'PHOTO_SELECTION',
			status: 'active',
			projectId: firstProject?.id || null,
			attendees: 2,
		},
		{
			appointmentId: appointments[9]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
			endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000), // 5 hours duration
			purpose: 'Event coverage and live streaming',
			appointmentType: 'VIDEO_SHOOT',
			status: 'active',
			projectId: null,
			attendees: 15,
		},

		// Cancelled booking
		{
			appointmentId: appointments[0]?.id,
			bookedBy: firstUser.supabase_id,
			startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
			endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours duration
			purpose: 'Cancelled due to weather conditions',
			appointmentType: 'PHOTO_SHOOT',
			status: 'cancelled',
			projectId: null,
			attendees: 3,
		},
	]

	// Optional: Clear existing appointment bookings
	await prisma.appointmentBooking.deleteMany({})
	console.log('Cleared existing appointment bookings')

	for (const booking of bookings) {
		if (!booking.appointmentId) continue // Skip if appointment doesn't exist

		try {
			await prisma.appointmentBooking.create({
				data: {
					appointmentId: booking.appointmentId,
					bookedBy: booking.bookedBy,
					startDate: booking.startDate,
					endDate: booking.endDate,
					purpose: booking.purpose,
					appointmentType: booking.appointmentType,
					status: booking.status,
					projectId: booking.projectId,
					attendees: booking.attendees,
				},
			})
			console.log(`Created booking: "${booking.purpose}" (${booking.appointmentType}) - ${booking.status}`)
		} catch (error: any) {
			console.error(`Error creating booking "${booking.purpose}": ${error.message}`)
		}
	}

	const count = await prisma.appointmentBooking.count()
	console.log(`✅ Seeded ${count} appointment bookings successfully`)
}

appointmentBookingMain()
	.catch((e) => {
		console.error('Error seeding appointment bookings:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})


const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function appointmentMain() {
	console.log('Starting to seed appointments...')

	// Define the appointments to be created
	const appointments = [
		// Photo Shoot Locations
		{
			name: 'Main Photography Studio',
			location: 'Building A, Floor 2',
			brand: null,
			description: 'Professional photography studio with natural lighting and backdrops',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Outdoor Garden Set',
			location: 'Building C, Rooftop',
			brand: null,
			description: 'Beautiful outdoor garden setting perfect for natural photo shoots',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Modern Studio Set',
			location: 'Building B, Floor 1',
			brand: null,
			description: 'Contemporary studio space with minimalist design',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},

		// Video Shoot Locations
		{
			name: 'Video Production Studio',
			location: 'Building A, Floor 3',
			brand: null,
			description: 'Full-service video production studio with green screen',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Interview Room',
			location: 'Building B, Floor 2',
			brand: null,
			description: 'Intimate space for interviews and talking head videos',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},

		// Consultation Rooms
		{
			name: 'Client Consultation Room A',
			location: 'Building A, Floor 1',
			brand: null,
			description: 'Private consultation space for client meetings',
			appointmentType: 'CONSULTATION',
			isAvailable: true
		},
		{
			name: 'Client Consultation Room B',
			location: 'Building A, Floor 1',
			brand: null,
			description: 'Spacious consultation room with presentation equipment',
			appointmentType: 'CONSULTATION',
			isAvailable: true
		},
		{
			name: 'Executive Meeting Room',
			location: 'Building C, Floor 3',
			brand: null,
			description: 'Premium consultation space for executive clients',
			appointmentType: 'CONSULTATION',
			isAvailable: true
		},

		// Photo Selection Rooms
		{
			name: 'Photo Selection Suite A',
			location: 'Building B, Floor 3',
			brand: null,
			description: 'Comfortable space for clients to review and select photos',
			appointmentType: 'PHOTO_SELECTION',
			isAvailable: true
		},
		{
			name: 'Photo Selection Suite B',
			location: 'Building B, Floor 3',
			brand: null,
			description: 'Private viewing room with large displays',
			appointmentType: 'PHOTO_SELECTION',
			isAvailable: true
		},

		// Equipment
		{
			name: 'Canon EOS R5',
			location: 'Equipment Storage',
			brand: 'Canon',
			description: 'Professional mirrorless camera - 45MP full-frame sensor',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Sony A7 IV',
			location: 'Equipment Storage',
			brand: 'Sony',
			description: 'Versatile full-frame camera for photo and video',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Nikon Z9',
			location: 'Equipment Storage',
			brand: 'Nikon',
			description: 'Flagship mirrorless camera with 8K video',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'DJI Ronin RS3 Pro',
			location: 'Equipment Storage',
			brand: 'DJI',
			description: 'Professional gimbal stabilizer for smooth video',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Godox AD600Pro',
			location: 'Equipment Storage',
			brand: 'Godox',
			description: 'Portable studio flash - 600Ws power',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Profoto B10 Plus',
			location: 'Equipment Storage',
			brand: 'Profoto',
			description: 'Premium portable flash with TTL',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Aputure 600d Pro',
			location: 'Equipment Storage',
			brand: 'Aputure',
			description: 'Powerful LED light for video production',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Canon RF 24-70mm f/2.8L',
			location: 'Equipment Storage',
			brand: 'Canon',
			description: 'Professional zoom lens',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Sony FE 70-200mm f/2.8 GM',
			location: 'Equipment Storage',
			brand: 'Sony',
			description: 'Professional telephoto zoom lens',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'DJI Mavic 3 Pro',
			location: 'Equipment Storage',
			brand: 'DJI',
			description: 'Professional drone for aerial photography and video',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Manfrotto 546B Tripod',
			location: 'Equipment Storage',
			brand: 'Manfrotto',
			description: 'Heavy-duty professional tripod',
			appointmentType: 'OTHERS',
			isAvailable: true
		},
		{
			name: 'Sachtler Video Tripod',
			location: 'Equipment Storage',
			brand: 'Sachtler',
			description: 'Professional video tripod with fluid head',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Backdrop Stand Kit',
			location: 'Equipment Storage',
			brand: 'Neewer',
			description: 'Adjustable backdrop support system',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Reflector 5-in-1 Kit',
			location: 'Equipment Storage',
			brand: 'Neewer',
			description: 'Multi-surface reflector for lighting control',
			appointmentType: 'PHOTO_SHOOT',
			isAvailable: true
		},
		{
			name: 'Wireless Microphone System',
			location: 'Equipment Storage',
			brand: 'Rode',
			description: 'Wireless GO II dual-channel microphone system',
			appointmentType: 'VIDEO_SHOOT',
			isAvailable: true
		}
	]

	// Optional: Clear existing appointments
	await prisma.appointment.deleteMany({})
	console.log('Cleared existing appointments')

	for (const appointment of appointments) {
		try {
			await prisma.appointment.create({
				data: {
					name: appointment.name,
					location: appointment.location,
					brand: appointment.brand,
					description: appointment.description,
					appointmentType: appointment.appointmentType,
					isAvailable: appointment.isAvailable,
				},
			})
			console.log(`Created appointment: "${appointment.name}" (${appointment.appointmentType}) - ${appointment.location}`)
		} catch (error: any) {
			console.error(`Error creating appointment "${appointment.name}": ${error.message}`)
		}
	}

	const count = await prisma.appointment.count()
	console.log(`✅ Seeded ${count} appointments successfully`)
}

appointmentMain()
	.catch((e) => {
		console.error('Error seeding appointments:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})


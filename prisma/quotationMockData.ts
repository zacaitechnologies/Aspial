const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function quotationMain() {
	console.log('Starting to seed quotations...')

	// Get the first user from the database to use as createdBy
	const firstUser = await prisma.user.findFirst({
		select: {
			supabase_id: true,
			firstName: true,
			lastName: true,
		},
	})

	if (!firstUser) {
		console.warn('⚠️  No users found in database. Please seed users first using: npm run seed:users')
		console.log('Skipping quotations seed.')
		return
	}

	console.log(`Using user: ${firstUser.firstName} ${firstUser.lastName} (${firstUser.supabase_id})`)

	// Get all clients from the database
	const clients = await prisma.client.findMany({
		take: 10, // Get first 10 clients
		select: {
			id: true,
			name: true,
		},
	})

	if (clients.length === 0) {
		console.warn('⚠️  No clients found in database. Please seed clients first using: npm run seed:clients')
		console.log('Skipping quotations seed.')
		return
	}

	console.log(`Found ${clients.length} clients to use for quotations`)

	// Define the quotations to be created
	const now = new Date()
	const quotations = [
		{
			name: 'Wedding Photography Package',
			description: 'Complete wedding photography package including ceremony, reception, and pre-wedding shoot. Includes 8 hours of coverage, 500+ edited photos, and online gallery.',
			totalPrice: 3500.00,
			duration: 90, // days
			startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
			endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000), // 120 days from now
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Corporate Video Production',
			description: 'Professional corporate video production including script writing, filming, editing, and post-production. Suitable for company profiles, product launches, and marketing materials.',
			totalPrice: 8500.00,
			duration: 45,
			startDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
			discountType: 'percentage',
			discountValue: 10.0,
		},
		{
			name: 'Portrait Photography Session',
			description: 'Professional portrait photography session for individuals or families. Includes 2-hour session, 50+ edited photos, and print-ready files.',
			totalPrice: 450.00,
			duration: 14,
			startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Product Photography Package',
			description: 'E-commerce product photography package. Includes studio setup, white background shots, lifestyle images, and edited files optimized for online use.',
			totalPrice: 1200.00,
			duration: 30,
			startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 40 * 24 * 60 * 60 * 1000),
			discountType: 'fixed',
			discountValue: 150.00,
		},
		{
			name: 'Event Photography Coverage',
			description: 'Full event photography coverage for corporate events, conferences, or celebrations. Includes 6 hours of coverage, 300+ edited photos, and same-day highlights.',
			totalPrice: 1800.00,
			duration: 7,
			startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Real Estate Photography',
			description: 'Professional real estate photography package including interior and exterior shots, virtual tour, and aerial photography. Perfect for property listings.',
			totalPrice: 650.00,
			duration: 21,
			startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 24 * 24 * 60 * 60 * 1000),
			discountType: 'percentage',
			discountValue: 15.0,
		},
		{
			name: 'Fashion Photography Shoot',
			description: 'High-end fashion photography shoot with professional models, stylist, and makeup artist. Includes full-day shoot, 200+ edited photos, and creative direction.',
			totalPrice: 5500.00,
			duration: 60,
			startDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 80 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Social Media Content Package',
			description: 'Monthly social media content creation package. Includes photography, video content, editing, and content calendar planning. Perfect for brands and influencers.',
			totalPrice: 2200.00,
			duration: 30,
			startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000),
			discountType: 'fixed',
			discountValue: 200.00,
		},
		{
			name: 'Food Photography Service',
			description: 'Professional food photography for restaurants, cafes, and food brands. Includes styling, multiple angles, and edited images optimized for menus and marketing.',
			totalPrice: 850.00,
			duration: 14,
			startDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Documentary Video Production',
			description: 'Documentary-style video production with interviews, b-roll footage, and narrative storytelling. Includes research, filming, and post-production.',
			totalPrice: 12000.00,
			duration: 90,
			startDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 135 * 24 * 60 * 60 * 1000),
			discountType: 'percentage',
			discountValue: 12.5,
		},
		{
			name: 'Headshot Photography Session',
			description: 'Professional headshot photography for corporate profiles, LinkedIn, and professional portfolios. Includes 1-hour session and 10 edited headshots.',
			totalPrice: 350.00,
			duration: 7,
			startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Music Video Production',
			description: 'Full music video production including concept development, filming, editing, color grading, and post-production. Suitable for artists and record labels.',
			totalPrice: 7500.00,
			duration: 45,
			startDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000),
			discountType: 'fixed',
			discountValue: 500.00,
		},
		{
			name: 'Maternity Photography Session',
			description: 'Beautiful maternity photography session capturing this special time. Includes 2-hour session, outdoor and studio shots, and 40+ edited photos.',
			totalPrice: 550.00,
			duration: 14,
			startDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
		{
			name: 'Brand Photography Package',
			description: 'Comprehensive brand photography package including product shots, lifestyle images, behind-the-scenes content, and team photos. Perfect for brand identity.',
			totalPrice: 2800.00,
			duration: 30,
			startDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000),
			discountType: 'percentage',
			discountValue: 8.0,
		},
		{
			name: 'Commercial Photography Service',
			description: 'Professional commercial photography for advertising campaigns, catalogs, and marketing materials. Includes concept development, styling, and high-end retouching.',
			totalPrice: 4500.00,
			duration: 60,
			startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
			endDate: new Date(now.getTime() + 95 * 24 * 60 * 60 * 1000),
			discountType: null,
			discountValue: null,
		},
	]

	// Optional: Clear existing quotations (only draft ones if you want to preserve others)
	await prisma.quotation.deleteMany({
		where: {
			workflowStatus: 'draft',
		},
	})
	console.log('Cleared existing draft quotations')

	// Create quotations, cycling through available clients
	for (let i = 0; i < quotations.length; i++) {
		const quotation = quotations[i]
		const client = clients[i % clients.length] // Cycle through clients

		try {
			await prisma.quotation.create({
				data: {
					name: quotation.name,
					description: quotation.description,
					totalPrice: quotation.totalPrice,
					workflowStatus: 'draft',
					createdById: firstUser.supabase_id,
					discountType: quotation.discountType,
					discountValue: quotation.discountValue,
					duration: quotation.duration,
					startDate: quotation.startDate,
					endDate: quotation.endDate,
					clientId: client.id,
					projectId: null, // Not linked to any project as requested
					paymentStatus: 'unpaid',
				},
			})
			console.log(`Created quotation: "${quotation.name}" for client "${client.name}" - $${quotation.totalPrice.toFixed(2)}`)
		} catch (error: any) {
			console.error(`Error creating quotation "${quotation.name}": ${error.message}`)
		}
	}

	const count = await prisma.quotation.count({
		where: {
			workflowStatus: 'draft',
		},
	})
	console.log(`✅ Seeded ${count} draft quotations successfully`)
}

quotationMain()
	.catch((e) => {
		console.error('Error seeding quotations:', e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function studioMain() {
  console.log('Starting to seed studios...');

  // Define the studios to be created
  const studios = [
    {
      name: 'Main Recording Studio',
      location: 'Building A, Floor 2',
      capacity: 8,
      description: 'Professional recording studio with state-of-the-art equipment',
      isActive: true
    },
    {
      name: 'Mixing Studio',
      location: 'Building A, Floor 1',
      capacity: 4,
      description: 'Dedicated mixing and mastering studio',
      isActive: true
    },
    {
      name: 'Live Room',
      location: 'Building B, Ground Floor',
      capacity: 12,
      description: 'Large live recording space for bands and orchestras',
      isActive: true
    },
    {
      name: 'Podcast Studio',
      location: 'Building C, Floor 1',
      capacity: 3,
      description: 'Intimate space perfect for podcast recordings',
      isActive: true
    },
    {
      name: 'Vocal Booth',
      location: 'Building A, Floor 2',
      capacity: 2,
      description: 'Isolated vocal recording booth',
      isActive: true
    },
    {
      name: 'Mastering Suite',
      location: 'Building A, Floor 3',
      capacity: 2,
      description: 'Specialized mastering room with premium acoustics',
      isActive: true
    },
    {
      name: 'Rehearsal Room',
      location: 'Building B, Floor 1',
      capacity: 6,
      description: 'Practice space for musicians and bands',
      isActive: true
    },
    {
      name: 'Video Production Studio',
      location: 'Building C, Floor 2',
      capacity: 10,
      description: 'Multi-purpose studio for video and audio production',
      isActive: true
    }
  ];

  // Optional: Clear existing studios
  await prisma.studio.deleteMany({});
  console.log('Cleared existing studios');

  for (const studio of studios) {
    try {
      await prisma.studio.create({
        data: {
          name: studio.name,
          location: studio.location,
          capacity: studio.capacity,
          description: studio.description,
          isActive: studio.isActive,
        },
      });
      console.log(`Created studio: "${studio.name}" (${studio.location}) - Capacity: ${studio.capacity}`);
    } catch (error: any) {
      console.error(`Error creating studio "${studio.name}": ${error.message}`);
    }
  }

  const count = await prisma.studio.count();
  console.log(`✅ Seeded ${count} studios successfully`);
}

studioMain()
  .catch((e) => {
    console.error('Error seeding studios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

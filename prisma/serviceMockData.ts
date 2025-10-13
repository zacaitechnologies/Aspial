const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed services...');

  const servicesFilePath = path.join(process.cwd(), 'src/app/(main)/services/components/services.json');
  const servicesData = JSON.parse(fs.readFileSync(servicesFilePath, 'utf8')) as {
    services: {
      name: string;
      description: string;
      basePrice: number;
    }[];
  };

  // Optional: Clear existing services
  await prisma.services.deleteMany({});
  console.log('Cleared existing services');

  for (const service of servicesData.services) {
    try {
      await prisma.services.create({
        data: {
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
        },
      });
      console.log(`Created service: "${service.name}"`);
    } catch (error: any) {
      console.error(`Error creating service "${service.name}": ${error.message}`);
    }
  }

  const count = await prisma.services.count();
  console.log(`✅ Seeded ${count} services successfully`);
}

//test
main()
  .catch((e) => {
    console.error('Error seeding services:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

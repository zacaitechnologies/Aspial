const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function roleMain() {
  console.log('Starting to seed roles...');

  // Define the roles to be created
  const roles = [
    { slug: 'admin' },
    { slug: 'staff' }
  ];

  // Optional: Clear existing roles
  await prisma.role.deleteMany({});
  console.log('Cleared existing roles');

  for (const role of roles) {
    try {
      await prisma.role.create({
        data: {
          slug: role.slug,
        },
      });
      console.log(`Created role: "${role.slug}"`);
    } catch (error: any) {
      console.error(`Error creating role "${role.slug}": ${error.message}`);
    }
  }

  const count = await prisma.role.count();
  console.log(`✅ Seeded ${count} roles successfully`);
}

roleMain()
  .catch((e) => {
    console.error('Error seeding roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

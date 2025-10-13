const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function staffRoleMain() {
  console.log('Starting to seed staff roles...');

  // Define the staff roles to be created
  const staffRoles = [
    {
      roleName: 'Photographer'
    },
    {
      roleName: 'Videographer'
    },
    {
      roleName: 'Editor'
    },
    {
      roleName: 'Make Up Artist'
    }
  ];

  // Optional: Clear existing staff roles
  await prisma.staffRole.deleteMany({});
  console.log('Cleared existing staff roles');

  for (const role of staffRoles) {
    try {
      await prisma.staffRole.create({
        data: {
          roleName: role.roleName,
        },
      });
      console.log(`Created staff role: "${role.roleName}"`);
    } catch (error: any) {
      console.error(`Error creating staff role "${role.roleName}": ${error.message}`);
    }
  }

  const count = await prisma.staffRole.count();
  console.log(`✅ Seeded ${count} staff roles successfully`);
}

staffRoleMain()
  .catch((e) => {
    console.error('Error seeding staff roles:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

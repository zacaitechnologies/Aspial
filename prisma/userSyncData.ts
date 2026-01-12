const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function userMain() {
  console.log('Starting to seed users and roles...');

  // First, ensure roles exist
  console.log('Ensuring roles exist...');
  const adminRole = await prisma.role.upsert({
    where: { slug: 'admin' },
    update: {},
    create: { slug: 'admin' }
  });

  const staffRole = await prisma.role.upsert({
    where: { slug: 'staff' },
    update: {},
    create: { slug: 'staff' }
  });

  console.log('Roles ensured');

  // Define the users to be created with their roles
  const users = [
    {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'zac.aiconsultancy@gmail.com',
      supabase_id: '867f4d1e-e180-4718-bc8b-fbabef7c12c1',
      roles: ['admin']
    },
    // {
    //   firstName: 'bxb371',
    //   lastName: '',
    //   email: 'bxb371@student.bham.ac.uk',
    //   supabase_id: 'f9f28baf-b5cc-45e9-8e11-713bb6de8554',
    //   roles: ['staff']
    // },
    {
      firstName: 'Super',
      lastName: 'User',
      email: 'twetingyau333@gmail.com',
      supabase_id: '78510265-c571-4ef8-a258-50eeb8375f62',
      roles: ['brand-advisor']
    },
    // {
    //   firstName: 'lulala',
    //   lastName: 'lulala',
    //   email: 'lulala@lulala.com',
    //   supabase_id: '9e370514-1190-408a-8660-7b53b5331d4f',
    //   roles: ['staff']
    // }
  ];

  // Optional: Clear existing data in the correct order (respecting foreign key constraints)
  console.log('Clearing existing data...');
  
  // Delete data that depends on other tables first
  await prisma.timeEntry.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.projectInvitation.deleteMany({});
  await prisma.projectPermission.deleteMany({});
  await prisma.customService.deleteMany({});
  await prisma.quotationService.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.client.deleteMany({});
  // await prisma.complaint.deleteMany({}); // Commented out due to permission issues
  await prisma.appointmentBooking.deleteMany({});
  await prisma.appointment.deleteMany({});
  
  // Now delete users and user roles
  await prisma.userRole.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('Cleared existing users and related data');

  for (const user of users) {
    try {
      // Create the user
      const createdUser = await prisma.user.create({
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          supabase_id: user.supabase_id,
        },
      });

      // Assign roles to the user
      for (const roleSlug of user.roles) {
        const role = roleSlug === 'admin' ? adminRole : staffRole;
        await prisma.userRole.create({
          data: {
            userId: createdUser.id,
            roleId: role.id,
          },
        });
      }

      console.log(`Created user: "${user.firstName} ${user.lastName}" (${user.email}) with roles: ${user.roles.join(', ')}`);
    } catch (error: any) {
      console.error(`Error creating user "${user.firstName} ${user.lastName}": ${error.message}`);
    }
  }

  const userCount = await prisma.user.count();
  const userRoleCount = await prisma.userRole.count();
  console.log(`✅ Seeded ${userCount} users and ${userRoleCount} user roles successfully`);
}

userMain()
  .catch((e) => {
    console.error('Error seeding users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

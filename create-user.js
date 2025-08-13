const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createOrReplaceUsers() {
  // 1️⃣ Ensure roles exist
  const [adminRole, memberRole] = await Promise.all([
    prisma.role.upsert({
      where: { slug: 'admin' },
      update: {},
      create: { slug: 'admin' },
    }),
    prisma.role.upsert({
      where: { slug: 'member' },
      update: {},
      create: { slug: 'member' },
    }),
  ]);

  // 2️⃣ Define your users
  const users = [
    {
      supabase_id: '867f4d1e-e180-4718-bc8b-fbabef7c12c1',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'zac.aiconsultancy@gmail.com',
      role: 'admin',
    },
    {
      supabase_id: 'f9f28baf-b5cc-45e9-8e11-713bb6de8554',
      firstName: 'bxb371',
      lastName: '',
      email: 'bxb371@student.bham.ac.uk',
      role: 'member',
    },
    {
      supabase_id: '362c318d-6007-488b-ae53-78acc94670f1',
      firstName: 'Brian',
      lastName: 'Bong',
      email: 'bong7054@gmail.com',
      role: 'member',
    },
    {
      supabase_id: '78510265-c571-4ef8-a258-50eeb8375f62',
      firstName: 'Super',
      lastName: 'User',
      email: 'twetingyau333@gmail.com',
      role: 'member',
    },
  ];

  // 3️⃣ Create or replace each user, then assign role
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { supabase_id: userData.supabase_id },
      update: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
      },
      create: {
        supabase_id: userData.supabase_id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
      },
    });

    const roleId = userData.role === 'admin' ? adminRole.id : memberRole.id;

    // First, remove all existing roles for this user
    await prisma.userRole.deleteMany({
      where: {
        userId: user.id,
      },
    });

    // Then assign the new role
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId,
      },
    });

    console.log(`✅ ${user.firstName} assigned role: ${userData.role}`);
  }
}

createOrReplaceUsers()
  .catch((error) => {
    console.error('❌ Error:', error);
  })
  .finally(() => prisma.$disconnect());

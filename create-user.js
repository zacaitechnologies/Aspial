// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// async function createUser() {
//   try {
//     const user = await prisma.user.upsert({
//       where: { supabase_id: 'f9f28baf-b5cc-45e9-8e11-713bb6de8554' },
//       update: {},
//       create: {
//         supabase_id: 'f9f28baf-b5cc-45e9-8e11-713bb6de8554',
//         firstName: 'bxb371',
//         lastName: '',
//         email: 'bxb371@student.bham.ac.uk',
//       },
//     });
//     console.log('User created/updated:', user);
//   } catch (error) {
//     console.error('Error creating user:', error);
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// createUser(); 

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createUser() {
  const supabaseId = '362c318d-6007-488b-ae53-78acc94670f1';

  try {
    const user = await prisma.user.upsert({
      where: { supabase_id: supabaseId },
      update: {},
      create: {
        supabase_id: supabaseId,
        firstName: 'Brian',
        lastName: 'Bong',
        email: 'bong7054@gmail.com',
      },
    });

    console.log('✅ User created with supabase_id:', supabaseId);
    console.log(user);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

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
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createUser() {
  const newSupabaseId = uuidv4(); // ✅ Generates a new UUID

  try {
    const user = await prisma.user.upsert({
      where: { supabase_id: newSupabaseId },
      update: {},
      create: {
        supabase_id: newSupabaseId,
        firstName: 'Brian',
        lastName: 'Bong',
        email: 'bong7054@gmail.com',
      },
    });

    console.log('✅ User created with supabase_id:', newSupabaseId);
    console.log(user);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();

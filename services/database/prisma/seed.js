const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed operation...');
  
  // Add seed data here if needed
  // Example:
  /*
  await prisma.user.upsert({
    where: { email: 'admin@gainz.com' },
    update: {},
    create: {
      email: 'admin@gainz.com',
      password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
      isEmailVerified: true,
    },
  });
  */

  console.log('Seed operation completed.');
}

main()
  .catch((e) => {
    console.error('Error in seed operation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

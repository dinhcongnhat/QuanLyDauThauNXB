const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany();
  console.log('Users found:', JSON.stringify(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })), null, 2));
  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

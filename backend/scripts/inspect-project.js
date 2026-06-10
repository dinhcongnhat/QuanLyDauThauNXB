const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const projects = await prisma.datSachProject.findMany({
    take: 5,
    orderBy: { id: 'desc' }, // Or just fetch all if small
    include: {
      gdnDocuments: true,
      pcdiDocuments: true
    }
  });
  console.log('Recent Projects:', JSON.stringify(projects, null, 2));
  process.exit(0);
}
run();

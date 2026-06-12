const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to Database...");
  const start = Date.now();
  await prisma.$connect();
  console.log("Connected in", Date.now() - start, "ms");
  
  const startQuery = Date.now();
  const projects = await prisma.project.findMany();
  console.log("Queried projects in", Date.now() - startQuery, "ms, projects count:", projects.length);
  
  await prisma.$disconnect();
}

main().catch(console.error);

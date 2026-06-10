const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    let updatedDocsCount = 0;
    const docs = await prisma.document.findMany({
      where: { projectId: null, parentId: { not: null } },
    });
    for (const doc of docs) {
      let current = doc;
      while (current && !current.projectId && current.parentId) {
        current = await prisma.document.findUnique({ where: { id: current.parentId } });
      }
      if (current && current.projectId) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { projectId: current.projectId },
        });
        updatedDocsCount++;
      }
    }
    console.log('Healed Documents:', updatedDocsCount);

    let updatedSelectionsCount = 0;
    const selections = await prisma.contractorSelection.findMany({
      where: { projectId: null },
    });
    for (const sel of selections) {
      const doc = await prisma.document.findUnique({ where: { id: sel.qdKhlcntId } });
      if (doc && doc.projectId) {
        await prisma.contractorSelection.update({
          where: { id: sel.id },
          data: { projectId: doc.projectId },
        });
        updatedSelectionsCount++;
      }
    }
    console.log('Healed ContractorSelections:', updatedSelectionsCount);

    let updatedPaymentsCount = 0;
    const payments = await prisma.payment.findMany({
      where: { projectId: null },
    });
    for (const pay of payments) {
      const sel = await prisma.contractorSelection.findUnique({
        where: { id: pay.contractorSelectionId },
      });
      if (sel && sel.projectId) {
        await prisma.payment.update({
          where: { id: pay.id },
          data: { projectId: sel.projectId },
        });
        updatedPaymentsCount++;
      }
    }
    console.log('Healed Payments:', updatedPaymentsCount);
  } catch (err) {
    console.error('Error during database healing:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();

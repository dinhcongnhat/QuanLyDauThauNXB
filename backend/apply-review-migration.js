const { PrismaClient } = require('./node_modules/@prisma/client');
const p = new PrismaClient();

async function migrate() {
  // Step 1: Add columns as nullable VARCHAR first (skip type change for status)
  const cols = [
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "reviewer_id" VARCHAR(36)`, 'gdn_in_sach reviewer_id'],
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_status" VARCHAR(20)`, 'gdn_in_sach review_status'],
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_comment" TEXT`, 'gdn_in_sach review_comment'],
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP`, 'gdn_in_sach reviewed_at'],
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_history" JSONB DEFAULT '[]'`, 'gdn_in_sach review_history'],
    [`ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "docx_path" VARCHAR(500)`, 'gdn_in_sach docx_path'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "reviewer_id" VARCHAR(36)`, 'pcdi reviewer_id'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_status" VARCHAR(20)`, 'pcdi review_status'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_comment" TEXT`, 'pcdi review_comment'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP`, 'pcdi reviewed_at'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_history" JSONB DEFAULT '[]'`, 'pcdi review_history'],
    [`ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "docx_path" VARCHAR(500)`, 'pcdi docx_path'],
  ];

  for (const [sql, name] of cols) {
    try { await p.$executeRawUnsafe(sql); console.log('OK:', name); }
    catch(e) { console.log('WARN:', name, '-', e.message.substring(0, 80)); }
  }

  // Step 2: Add FK constraints
  const fks = [
    [`ALTER TABLE "gdn_in_sach" ADD CONSTRAINT "gdn_in_sach_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL`, 'gdn_in_sach FK'],
    [`ALTER TABLE "pcdi_co_so_in" ADD CONSTRAINT "pcdi_co_so_in_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL`, 'pcdi FK'],
  ];
  for (const [sql, name] of fks) {
    try { await p.$executeRawUnsafe(sql); console.log('OK:', name); }
    catch(e) { console.log('WARN:', name, '-', e.message.substring(0, 80)); }
  }

  // Step 3: Migrate status values from VARCHAR to enum-safe values
  // status values in DB: 'DRAFT', 'ASSIGNED', 'APPROVED' (possibly others)
  const statusMap = [
    // gdn_in_sach
    [`UPDATE "gdn_in_sach" SET "review_status" = 'PENDING' WHERE "status" = 'DRAFT'`, 'gdn PENDING'],
    [`UPDATE "gdn_in_sach" SET "review_status" = 'APPROVED' WHERE "status" IN ('ASSIGNED','APPROVED')`, 'gdn APPROVED'],
    // pcdi_co_so_in
    [`UPDATE "pcdi_co_so_in" SET "review_status" = 'PENDING' WHERE "status" = 'DRAFT'`, 'pcdi PENDING'],
    [`UPDATE "pcdi_co_so_in" SET "review_status" = 'APPROVED' WHERE "status" IN ('ASSIGNED','APPROVED')`, 'pcdi APPROVED'],
  ];
  for (const [sql, name] of statusMap) {
    try { await p.$executeRawUnsafe(sql); console.log('OK:', name); }
    catch(e) { console.log('WARN:', name, '-', e.message.substring(0, 80)); }
  }

  console.log('Migration complete!');
  await p.$disconnect();
}

migrate().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

-- Add review workflow fields for Thầu Sách module
DO $$
BEGIN
  -- Step 1: Add enums
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gdnstatus') THEN
    CREATE TYPE "GDNStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REWORK');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewstatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REWORK');
  END IF;

  -- Step 2: gdn_in_sach
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "reviewer_id" VARCHAR(36);
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus";
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP;
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "review_history" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE "gdn_in_sach" ADD COLUMN IF NOT EXISTS "docx_path" VARCHAR(500);

  -- Convert existing string status to enum (ASSIGNED -> APPROVED for now)
  UPDATE "gdn_in_sach" SET "status" = 'APPROVED' WHERE "status" = 'APPROVED';
  UPDATE "gdn_in_sach" SET "status" = 'DRAFT' WHERE "status" = 'DRAFT';
  UPDATE "gdn_in_sach" SET "status" = 'PENDING_REVIEW' WHERE "status" = 'PENDING_REVIEW';
  UPDATE "gdn_in_sach" SET "status" = 'APPROVED' WHERE "status" = 'ASSIGNED';

  -- Change status type
  ALTER TABLE "gdn_in_sach" ALTER COLUMN "status" TYPE "GDNStatus" USING "status"::"GDNStatus";
  ALTER TABLE "gdn_in_sach" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"GDNStatus";

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'gdn_in_sach_reviewer_id_fkey') THEN
    ALTER TABLE "gdn_in_sach" ADD CONSTRAINT "gdn_in_sach_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

  -- Step 3: pcdi_co_so_in
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "reviewer_id" VARCHAR(36);
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus";
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP;
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "review_history" JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE "pcdi_co_so_in" ADD COLUMN IF NOT EXISTS "docx_path" VARCHAR(500);

  -- Convert existing status
  UPDATE "pcdi_co_so_in" SET "status" = 'APPROVED' WHERE "status" = 'APPROVED';
  UPDATE "pcdi_co_so_in" SET "status" = 'DRAFT' WHERE "status" = 'DRAFT';
  UPDATE "pcdi_co_so_in" SET "status" = 'APPROVED' WHERE "status" = 'ASSIGNED';

  ALTER TABLE "pcdi_co_so_in" ALTER COLUMN "status" TYPE "GDNStatus" USING "status"::"GDNStatus";
  ALTER TABLE "pcdi_co_so_in" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"GDNStatus";

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pcdi_co_so_in_reviewer_id_fkey') THEN
    ALTER TABLE "pcdi_co_so_in" ADD CONSTRAINT "pcdi_co_so_in_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

  -- Step 4: dat_sach_projects
  ALTER TABLE "dat_sach_projects" ADD COLUMN IF NOT EXISTS "reviewer_id" VARCHAR(36);
  ALTER TABLE "dat_sach_projects" ADD COLUMN IF NOT EXISTS "review_status" "ReviewStatus";
  ALTER TABLE "dat_sach_projects" ADD COLUMN IF NOT EXISTS "review_comment" TEXT;
  ALTER TABLE "dat_sach_projects" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP;
  ALTER TABLE "dat_sach_projects" ADD COLUMN IF NOT EXISTS "review_history" JSONB DEFAULT '[]'::jsonb;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'dat_sach_projects_reviewer_id_fkey') THEN
    ALTER TABLE "dat_sach_projects" ADD CONSTRAINT "dat_sach_projects_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;

END $$;

-- Migration to fix enum conversion and add new fields
DO $$
BEGIN
  -- Ensure GDNStatus enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gdnstatus') THEN
    CREATE TYPE "GDNStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REWORK');
  END IF;

  -- Ensure ReviewStatus enum exists  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reviewstatus') THEN
    CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REWORK');
  END IF;

  -- Fix gdn_in_sach status conversion (values might be in different format)
  -- First set any non-standard values to DRAFT
  UPDATE "gdn_in_sach" SET "status" = 'DRAFT' 
    WHERE "status" IS NULL OR "status" NOT IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REWORK');
  
  -- Convert string values to enum
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gdn_in_sach' AND column_name = 'status' AND data_type = 'character varying') THEN
    ALTER TABLE "gdn_in_sach" ALTER COLUMN "status" TYPE "GDNStatus" USING "status"::"GDNStatus";
    ALTER TABLE "gdn_in_sach" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"GDNStatus";
  END IF;

  -- Fix pcdi_co_so_in status conversion  
  UPDATE "pcdi_co_so_in" SET "status" = 'DRAFT'
    WHERE "status" IS NULL OR "status" NOT IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REWORK');
    
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pcdi_co_so_in' AND column_name = 'status' AND data_type = 'character varying') THEN
    ALTER TABLE "pcdi_co_so_in" ALTER COLUMN "status" TYPE "GDNStatus" USING "status"::"GDNStatus";
    ALTER TABLE "pcdi_co_so_in" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"GDNStatus";
  END IF;

END $$;

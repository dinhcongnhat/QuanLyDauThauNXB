-- Fix missing procurement_type column in documents table
-- This column exists in the schema but was never migrated to DB
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'procurement_type'
  ) THEN
    ALTER TABLE "documents" ADD COLUMN "procurement_type" VARCHAR(50);
    RAISE NOTICE 'Added procurement_type to documents';
  ELSE
    RAISE NOTICE 'procurement_type already exists in documents';
  END IF;
END $$;

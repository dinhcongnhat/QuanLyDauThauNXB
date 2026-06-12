-- Fix Role enum: Drop old values, add USER

DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    -- Change column to text first (to bypass enum validation)
    ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT;
  END IF;
END $$;

-- Drop old enum and create new one
DROP TYPE IF EXISTS "Role" CASCADE;
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- Alter column to use new enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL;

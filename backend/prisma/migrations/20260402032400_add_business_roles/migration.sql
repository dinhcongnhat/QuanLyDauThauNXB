-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_contractor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_investor" BOOLEAN NOT NULL DEFAULT false;

-- Set existing non-ADMIN users to have both business roles by default
UPDATE "users" SET "is_investor" = true, "is_contractor" = true WHERE "role" != 'ADMIN';

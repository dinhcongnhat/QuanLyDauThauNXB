-- Fix roles_permissions table - change role column to Role enum type
ALTER TABLE "roles_permissions" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "assigned_to" TEXT;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StepApprovalStatus" AS ENUM ('NO_APPROVAL_REQUIRED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "procurement_steps" ADD COLUMN     "approval_comment" TEXT,
ADD COLUMN     "approval_status" "StepApprovalStatus" NOT NULL DEFAULT 'NO_APPROVAL_REQUIRED',
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "approver_role" TEXT,
ADD COLUMN     "requires_approval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "step_approval_requests" (
    "id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_approval_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "step_approval_requests" ADD CONSTRAINT "step_approval_requests_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "procurement_steps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_approval_requests" ADD CONSTRAINT "step_approval_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

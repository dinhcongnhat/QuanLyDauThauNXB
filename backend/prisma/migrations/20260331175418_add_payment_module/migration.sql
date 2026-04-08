-- CreateEnum
CREATE TYPE "ContractPackageType" AS ENUM ('GOI_THAU_TU_VAN', 'GOI_THAU_PHI_TU_VAN', 'GOI_THAU_TRIEN_KHAI');

-- AlterTable
ALTER TABLE "contractor_selections" ADD COLUMN     "contract_package_type" "ContractPackageType";

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "contractor_selection_id" TEXT NOT NULL,
    "contract_package_type" "ContractPackageType" NOT NULL,
    "ma_so_hd" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_steps" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "data" JSONB NOT NULL DEFAULT '{}',
    "attachment_path" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_steps_payment_id_step_key_key" ON "payment_steps"("payment_id", "step_key");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contractor_selection_id_fkey" FOREIGN KEY ("contractor_selection_id") REFERENCES "contractor_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_steps" ADD CONSTRAINT "payment_steps_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

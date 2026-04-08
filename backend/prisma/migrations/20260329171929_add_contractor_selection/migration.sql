-- CreateEnum
CREATE TYPE "ProcurementMethod" AS ENUM ('CHI_DINH_THAU', 'CHAO_HANG_CANH_TRANH', 'DAU_THAU_RONG_RAI');

-- AlterEnum
ALTER TYPE "DocType" ADD VALUE 'LCNT_STEP';

-- CreateTable
CREATE TABLE "contractor_selections" (
    "id" TEXT NOT NULL,
    "qd_khlcnt_id" TEXT NOT NULL,
    "goi_thau_index" INTEGER NOT NULL,
    "ten_goi_thau" TEXT NOT NULL,
    "procurement_method" "ProcurementMethod" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_steps" (
    "id" TEXT NOT NULL,
    "contractor_selection_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "data" JSONB NOT NULL DEFAULT '{}',
    "attachment_path" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contractor_selections_qd_khlcnt_id_goi_thau_index_key" ON "contractor_selections"("qd_khlcnt_id", "goi_thau_index");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_steps_contractor_selection_id_step_key_key" ON "procurement_steps"("contractor_selection_id", "step_key");

-- AddForeignKey
ALTER TABLE "contractor_selections" ADD CONSTRAINT "contractor_selections_qd_khlcnt_id_fkey" FOREIGN KEY ("qd_khlcnt_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contractor_selections" ADD CONSTRAINT "contractor_selections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_steps" ADD CONSTRAINT "procurement_steps_contractor_selection_id_fkey" FOREIGN KEY ("contractor_selection_id") REFERENCES "contractor_selections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

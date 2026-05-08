-- CreateEnum
CREATE TYPE "ProcurementType" AS ENUM ('THAU_THIET_BI', 'THAU_SACH');

-- CreateTable
CREATE TABLE "dat_sach_projects" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "procurement_type" "ProcurementType" NOT NULL DEFAULT 'THAU_SACH',
    "ten_du_an" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dat_sach_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdn_in_sach" (
    "id" TEXT NOT NULL,
    "dat_sach_project_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gdn_in_sach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdn_assignments" (
    "id" TEXT NOT NULL,
    "gdn_in_sach_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "so_luong" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "gdn_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pcdi_co_so_in" (
    "id" TEXT NOT NULL,
    "dat_sach_project_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pcdi_co_so_in_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gdn_assignments_gdn_in_sach_id_user_id_key" ON "gdn_assignments"("gdn_in_sach_id", "user_id");

-- AddForeignKey
ALTER TABLE "dat_sach_projects" ADD CONSTRAINT "dat_sach_projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdn_in_sach" ADD CONSTRAINT "gdn_in_sach_dat_sach_project_id_fkey" FOREIGN KEY ("dat_sach_project_id") REFERENCES "dat_sach_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdn_in_sach" ADD CONSTRAINT "gdn_in_sach_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdn_assignments" ADD CONSTRAINT "gdn_assignments_gdn_in_sach_id_fkey" FOREIGN KEY ("gdn_in_sach_id") REFERENCES "gdn_in_sach"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdn_assignments" ADD CONSTRAINT "gdn_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdn_assignments" ADD CONSTRAINT "gdn_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pcdi_co_so_in" ADD CONSTRAINT "pcdi_co_so_in_dat_sach_project_id_fkey" FOREIGN KEY ("dat_sach_project_id") REFERENCES "dat_sach_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pcdi_co_so_in" ADD CONSTRAINT "pcdi_co_so_in_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

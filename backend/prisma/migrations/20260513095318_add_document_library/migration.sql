-- CreateEnum
CREATE TYPE "LibraryType" AS ENUM ('THONG_TIN_TO_CHUC', 'THONG_TIN_NHA_THAU', 'DIA_CHI', 'KY_TUONG', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'DATE', 'MONEY', 'NUMBER', 'EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "moTa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "libraries" (
    "id" TEXT NOT NULL,
    "ten" TEXT NOT NULL,
    "loai" "LibraryType" NOT NULL,
    "organization_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "libraries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_fields" (
    "id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "ten_truong" TEXT NOT NULL,
    "khoa" TEXT NOT NULL,
    "kieu_du_lieu" "FieldType" NOT NULL,
    "gia_tri_mac_dinh" TEXT,
    "bat_buoc" BOOLEAN NOT NULL DEFAULT false,
    "thu_tu" INTEGER NOT NULL DEFAULT 0,
    "nhom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "library_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_values" (
    "id" TEXT NOT NULL,
    "library_id" TEXT NOT NULL,
    "ten_gia_tri" TEXT NOT NULL,
    "du_lieu" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "library_fields_khoa_key" ON "library_fields"("khoa");

-- AddForeignKey
ALTER TABLE "libraries" ADD CONSTRAINT "libraries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_fields" ADD CONSTRAINT "library_fields_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_values" ADD CONSTRAINT "saved_values_library_id_fkey" FOREIGN KEY ("library_id") REFERENCES "libraries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

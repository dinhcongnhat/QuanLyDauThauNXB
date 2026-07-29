-- WARNING: DESTRUCTIVE AND IRREVERSIBLE WITHOUT A DATABASE SNAPSHOT.
-- This migration permanently removes the legacy dynamic document-library
-- data and schema. Back up the database before applying it.
-- Drop child tables before parents to respect foreign-key dependencies.
DROP TABLE IF EXISTS "saved_values";
DROP TABLE IF EXISTS "library_fields";
DROP TABLE IF EXISTS "libraries";
DROP TABLE IF EXISTS "organizations";
DROP TYPE IF EXISTS "FieldType";
DROP TYPE IF EXISTS "LibraryType";

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "so_hieu" TEXT NOT NULL,
    "co_quan_ban_hanh" TEXT NOT NULL,
    "hinh_thuc_van_ban" TEXT NOT NULL,
    "linh_vuc" TEXT NOT NULL,
    "trich_yeu_noi_dung" TEXT NOT NULL,
    "ngay_ban_hanh" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_documents_so_hieu_idx" ON "legal_documents"("so_hieu");

-- CreateIndex
CREATE INDEX "legal_documents_co_quan_ban_hanh_idx" ON "legal_documents"("co_quan_ban_hanh");

-- CreateIndex
CREATE INDEX "legal_documents_hinh_thuc_van_ban_idx" ON "legal_documents"("hinh_thuc_van_ban");

-- CreateIndex
CREATE INDEX "legal_documents_linh_vuc_idx" ON "legal_documents"("linh_vuc");

-- CreateIndex
CREATE INDEX "legal_documents_ngay_ban_hanh_idx" ON "legal_documents"("ngay_ban_hanh");

-- Baseline record used by the legal-basis search acceptance test and by the
-- workflow example supplied with the templates.
INSERT INTO "legal_documents" (
    "id",
    "so_hieu",
    "co_quan_ban_hanh",
    "hinh_thuc_van_ban",
    "linh_vuc",
    "trich_yeu_noi_dung",
    "ngay_ban_hanh",
    "created_at",
    "updated_at"
) VALUES (
    'legal-document-22-2023-qh15',
    '22/2023/QH15',
    'Quốc hội khóa XV, Kỳ họp thứ 5',
    'Luật',
    'Đấu thầu',
    'Đấu thầu',
    DATE '2023-06-23',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Link decisions to the exact approved proposal used as their immutable source.
ALTER TABLE "documents"
  ADD COLUMN "source_document_id" TEXT;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_source_document_id_fkey"
  FOREIGN KEY ("source_document_id") REFERENCES "documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "documents_source_document_id_idx"
  ON "documents"("source_document_id");

-- Give each package a stable identity and promote the contract number to a
-- searchable scalar instead of hiding it exclusively inside JSON step data.
ALTER TABLE "contractor_selections"
  ADD COLUMN "package_id" TEXT,
  ADD COLUMN "so_hop_dong" TEXT,
  ADD COLUMN "ngay_ky_hop_dong" TIMESTAMP(3);

CREATE INDEX "contractor_selections_package_id_idx"
  ON "contractor_selections"("package_id");

CREATE INDEX "contractor_selections_so_hop_dong_idx"
  ON "contractor_selections"("so_hop_dong");

-- Best-effort backfill from the existing Hợp đồng step. New writes are kept in
-- sync by ContractorSelectionService.
UPDATE "contractor_selections" AS cs
SET "so_hop_dong" = COALESCE(
  NULLIF(ps."data"->>'SoHopDong', ''),
  NULLIF(ps."data"->>'MaSoHD', ''),
  NULLIF(ps."data"->>'MaSoHopDong', '')
)
FROM "procurement_steps" AS ps
WHERE ps."contractor_selection_id" = cs."id"
  AND ps."step_key" = 'hop_dong'
  AND cs."so_hop_dong" IS NULL;

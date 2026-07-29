ALTER TABLE "legal_documents"
ADD COLUMN "ten_can_cu" TEXT;

CREATE INDEX "legal_documents_ten_can_cu_idx"
ON "legal_documents"("ten_can_cu");

UPDATE "legal_documents"
SET "ten_can_cu" = CONCAT(
  "hinh_thuc_van_ban",
  ' số ',
  "so_hieu",
  ' - ',
  "trich_yeu_noi_dung"
)
WHERE "ten_can_cu" IS NULL;

-- Dữ liệu mẫu để kiểm thử tìm kiếm/chọn nhiều căn cứ trong luồng thiết bị.
INSERT INTO "legal_documents" (
  "id",
  "ten_can_cu",
  "so_hieu",
  "co_quan_ban_hanh",
  "hinh_thuc_van_ban",
  "linh_vuc",
  "trich_yeu_noi_dung",
  "ngay_ban_hanh",
  "created_at",
  "updated_at"
) VALUES
(
  'legal-document-57-2024-qh15',
  'Luật số 57/2024/QH15 sửa đổi các luật liên quan đến đấu thầu',
  '57/2024/QH15',
  'Quốc hội',
  'Luật',
  'Đấu thầu',
  'sửa đổi, bổ sung một số điều của Luật Quy hoạch, Luật Đầu tư, Luật Đầu tư theo phương thức đối tác công tư và Luật Đấu thầu',
  DATE '2024-11-29',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'legal-document-90-2025-qh15',
  'Luật số 90/2025/QH15 sửa đổi Luật Đấu thầu và các luật liên quan',
  '90/2025/QH15',
  'Quốc hội',
  'Luật',
  'Đấu thầu',
  'sửa đổi, bổ sung một số điều của Luật Đấu thầu, Luật Đầu tư theo phương thức đối tác công tư, Luật Hải quan, Luật thuế giá trị gia tăng, Luật thuế xuất khẩu, thuế nhập khẩu, Luật Đầu tư, Luật Đầu tư công, Luật Quản lý, sử dụng tài sản công',
  DATE '2025-06-25',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'legal-document-214-2025-nd-cp',
  'Nghị định số 214/2025/NĐ-CP về lựa chọn nhà thầu',
  '214/2025/NĐ-CP',
  'Chính phủ',
  'Nghị định',
  'Đấu thầu',
  'quy định chi tiết một số điều và biện pháp thi hành Luật Đấu thầu về lựa chọn nhà thầu',
  DATE '2025-08-04',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

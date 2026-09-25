CREATE TYPE "DossierWorkflowType" AS ENUM (
  'DU_TOAN',
  'KHLCNT',
  'DAT_SACH',
  'LCNT_QD_HSMT',
  'LCNT_QD_KQLCNT',
  'LCNT_QD_LCNT'
);

CREATE TYPE "DossierStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'REWORK',
  'APPROVED',
  'CANCELLED'
);

CREATE TYPE "DossierItemKind" AS ENUM (
  'COVER',
  'PROPOSAL',
  'REPORT',
  'DECISION',
  'SUPPORTING_DOCUMENT',
  'ATTACHMENT',
  'REFERENCE'
);

CREATE TYPE "DossierItemSource" AS ENUM (
  'FORM',
  'FILE',
  'ENTITY_REFERENCE'
);

CREATE TABLE "user_permissions" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_permissions_user_id_permission_id_key"
  ON "user_permissions"("user_id", "permission_id");
CREATE INDEX "user_permissions_permission_id_idx"
  ON "user_permissions"("permission_id");

CREATE TABLE "approval_dossiers" (
  "id" TEXT NOT NULL,
  "workflow_type" "DossierWorkflowType" NOT NULL,
  "status" "DossierStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "project_id" TEXT,
  "target_type" "ApprovalTargetType",
  "target_id" TEXT,
  "context" JSONB NOT NULL DEFAULT '{}',
  "created_by" TEXT NOT NULL,
  "current_handler_id" TEXT,
  "title" TEXT NOT NULL,
  "approved_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "approval_dossiers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_dossiers_project_id_workflow_type_status_idx"
  ON "approval_dossiers"("project_id", "workflow_type", "status");
CREATE INDEX "approval_dossiers_created_by_status_updated_at_idx"
  ON "approval_dossiers"("created_by", "status", "updated_at");
CREATE INDEX "approval_dossiers_current_handler_id_status_updated_at_idx"
  ON "approval_dossiers"("current_handler_id", "status", "updated_at");
CREATE INDEX "approval_dossiers_target_type_target_id_idx"
  ON "approval_dossiers"("target_type", "target_id");

CREATE TABLE "approval_dossier_items" (
  "id" TEXT NOT NULL,
  "dossier_id" TEXT NOT NULL,
  "item_key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "kind" "DossierItemKind" NOT NULL,
  "source" "DossierItemSource" NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "data" JSONB NOT NULL DEFAULT '{}',
  "object_path" TEXT,
  "rendered_override_path" TEXT,
  "original_name" TEXT,
  "mime_type" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "required" BOOLEAN NOT NULL DEFAULT TRUE,
  "editable" BOOLEAN NOT NULL DEFAULT TRUE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "approval_dossier_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_dossier_items_dossier_id_item_key_key"
  ON "approval_dossier_items"("dossier_id", "item_key");
CREATE INDEX "approval_dossier_items_entity_type_entity_id_idx"
  ON "approval_dossier_items"("entity_type", "entity_id");

CREATE TABLE "approval_dossier_revisions" (
  "id" TEXT NOT NULL,
  "dossier_id" TEXT NOT NULL,
  "item_id" TEXT,
  "actor_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "from_version" INTEGER NOT NULL,
  "to_version" INTEGER NOT NULL,
  "comment" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_dossier_revisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_dossier_revisions_dossier_id_created_at_idx"
  ON "approval_dossier_revisions"("dossier_id", "created_at");
CREATE INDEX "approval_dossier_revisions_item_id_created_at_idx"
  ON "approval_dossier_revisions"("item_id", "created_at");

ALTER TABLE "approval_requests"
  ADD COLUMN "dossier_id" TEXT,
  ADD COLUMN "previous_request_id" TEXT,
  ADD COLUMN "hop_index" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "approval_requests_dossier_id_status_submitted_at_idx"
  ON "approval_requests"("dossier_id", "status", "submitted_at");
CREATE INDEX "approval_requests_previous_request_id_idx"
  ON "approval_requests"("previous_request_id");
CREATE UNIQUE INDEX "approval_requests_one_pending_dossier_key"
  ON "approval_requests"("dossier_id")
  WHERE "status" = 'PENDING' AND "dossier_id" IS NOT NULL;

ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_permissions"
  ADD CONSTRAINT "user_permissions_permission_id_fkey"
  FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_dossiers"
  ADD CONSTRAINT "approval_dossiers_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_dossiers"
  ADD CONSTRAINT "approval_dossiers_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_dossiers"
  ADD CONSTRAINT "approval_dossiers_current_handler_id_fkey"
  FOREIGN KEY ("current_handler_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_dossier_items"
  ADD CONSTRAINT "approval_dossier_items_dossier_id_fkey"
  FOREIGN KEY ("dossier_id") REFERENCES "approval_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_dossier_revisions"
  ADD CONSTRAINT "approval_dossier_revisions_dossier_id_fkey"
  FOREIGN KEY ("dossier_id") REFERENCES "approval_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_dossier_revisions"
  ADD CONSTRAINT "approval_dossier_revisions_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "approval_dossier_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "approval_dossier_revisions"
  ADD CONSTRAINT "approval_dossier_revisions_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_dossier_id_fkey"
  FOREIGN KEY ("dossier_id") REFERENCES "approval_dossiers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_previous_request_id_fkey"
  FOREIGN KEY ("previous_request_id") REFERENCES "approval_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "permissions" (
  "id", "key", "display_name", "description", "category", "is_active", "created_at"
)
VALUES
  (md5('permission:feature:projects'), 'feature:projects', 'Hiển thị Quản lý dự án', 'Mở module Quản lý dự án', 'features', TRUE, CURRENT_TIMESTAMP),
  (md5('permission:feature:book-procurement'), 'feature:book-procurement', 'Hiển thị Thầu sách', 'Mở các nghiệp vụ Thầu sách', 'features', TRUE, CURRENT_TIMESTAMP),
  (md5('permission:feature:equipment-procurement'), 'feature:equipment-procurement', 'Hiển thị Thầu thiết bị', 'Mở các nghiệp vụ Thầu thiết bị', 'features', TRUE, CURRENT_TIMESTAMP),
  (md5('permission:approval:review'), 'approval:review', 'Phê duyệt trung gian', 'Nhận, sửa, trả lại và chuyển tiếp bộ hồ sơ', 'approval', TRUE, CURRENT_TIMESTAMP),
  (md5('permission:approval:final'), 'approval:final', 'Phê duyệt cuối', 'Phê duyệt cuối cùng bộ hồ sơ', 'approval', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "category" = EXCLUDED."category",
  "is_active" = TRUE;

INSERT INTO "user_permissions" ("id", "user_id", "permission_id")
SELECT
  md5('user-permission:' || u."id" || ':' || p."id"),
  u."id",
  p."id"
FROM "users" u
JOIN "permissions" p ON p."key" = 'approval:review'
WHERE u."can_approve" = TRUE
ON CONFLICT ("user_id", "permission_id") DO NOTHING;

INSERT INTO "user_permissions" ("id", "user_id", "permission_id")
SELECT
  md5('user-permission:' || u."id" || ':' || p."id"),
  u."id",
  p."id"
FROM "users" u
JOIN "permissions" p ON p."key" IN (
  'feature:projects',
  'feature:book-procurement',
  'feature:equipment-procurement'
)
WHERE u."is_investor" = TRUE
ON CONFLICT ("user_id", "permission_id") DO NOTHING;

INSERT INTO "user_permissions" ("id", "user_id", "permission_id")
SELECT
  md5('user-permission:' || u."id" || ':' || p."id"),
  u."id",
  p."id"
FROM "users" u
JOIN "permissions" p ON p."key" IN (
  'feature:projects',
  'feature:book-procurement',
  'feature:equipment-procurement',
  'approval:review',
  'approval:final'
)
WHERE u."role" = 'ADMIN'
ON CONFLICT ("user_id", "permission_id") DO NOTHING;

INSERT INTO "dynamic_role_permissions" ("id", "role_id", "permission_id")
SELECT
  md5('role-permission:' || r."id" || ':' || p."id"),
  r."id",
  p."id"
FROM "dynamic_roles" r
JOIN "permissions" p ON
  (r."name" = 'quan_ly_du_an' AND p."key" = 'feature:projects')
  OR (r."name" = 'thau_sach' AND p."key" = 'feature:book-procurement')
  OR (r."name" = 'thau_thiet_bi' AND p."key" = 'feature:equipment-procurement')
  OR (r."name" = 'admin' AND p."key" IN (
    'feature:projects',
    'feature:book-procurement',
    'feature:equipment-procurement',
    'approval:review',
    'approval:final'
  ))
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

WITH ranked AS (
  SELECT
    ar."id",
    ar."target_type",
    ar."status",
    ar."document_id",
    ar."dat_sach_project_id",
    ar."procurement_step_id",
    ar."requester_id",
    ar."approver_id",
    ar."submitted_at",
    ar."updated_at",
    COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id") AS target_id,
    row_number() OVER (
      PARTITION BY ar."target_type", COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
      ORDER BY ar."submitted_at" ASC, ar."id" ASC
    ) AS hop_index,
    lag(ar."id") OVER (
      PARTITION BY ar."target_type", COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
      ORDER BY ar."submitted_at" ASC, ar."id" ASC
    ) AS previous_request_id,
    row_number() OVER (
      PARTITION BY ar."target_type", COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
      ORDER BY ar."submitted_at" DESC, ar."id" DESC
    ) AS latest_rank
  FROM "approval_requests" ar
),
targets AS (
  SELECT
    r."target_type",
    r.target_id,
    min(r."requester_id") FILTER (WHERE r.hop_index = 1) AS created_by,
    max(r."approver_id") FILTER (WHERE r."status" = 'PENDING') AS current_handler_id,
    max(r."requester_id") FILTER (WHERE r.latest_rank = 1 AND r."status" = 'REJECTED') AS rejected_handler_id,
    bool_or(r."status" = 'PENDING') AS has_pending,
    max(r."status"::text) FILTER (WHERE r.latest_rank = 1) AS latest_status,
    min(r."submitted_at") AS created_at,
    max(r."updated_at") AS updated_at
  FROM ranked r
  GROUP BY r."target_type", r.target_id
)
INSERT INTO "approval_dossiers" (
  "id", "workflow_type", "status", "version", "project_id",
  "target_type", "target_id", "created_by", "current_handler_id",
  "title", "approved_at", "created_at", "updated_at"
)
SELECT
  md5('dossier:' || t."target_type"::text || ':' || t.target_id),
  CASE
    WHEN t."target_type" = 'DAT_SACH_DECISION' THEN 'DAT_SACH'::"DossierWorkflowType"
    WHEN t."target_type" = 'DOCUMENT' AND d."type" = 'QD_DUTOAN' THEN 'DU_TOAN'::"DossierWorkflowType"
    WHEN t."target_type" = 'DOCUMENT' THEN 'KHLCNT'::"DossierWorkflowType"
    WHEN s."step_key" = 'quyet_dinh_hsmt' THEN 'LCNT_QD_HSMT'::"DossierWorkflowType"
    WHEN s."step_key" = 'quyet_dinh_kqlcnt' THEN 'LCNT_QD_KQLCNT'::"DossierWorkflowType"
    ELSE 'LCNT_QD_LCNT'::"DossierWorkflowType"
  END,
  CASE
    WHEN t.has_pending THEN 'IN_REVIEW'::"DossierStatus"
    WHEN t.latest_status = 'REJECTED' THEN 'REWORK'::"DossierStatus"
    WHEN t.latest_status = 'APPROVED' THEN 'APPROVED'::"DossierStatus"
    ELSE 'DRAFT'::"DossierStatus"
  END,
  1,
  COALESCE(d."project_id", ds."project_id", cs."project_id"),
  t."target_type",
  t.target_id,
  t.created_by,
  COALESCE(t.current_handler_id, t.rejected_handler_id),
  CASE
    WHEN t."target_type" = 'DAT_SACH_DECISION' THEN COALESCE(ds."ten_du_an", 'Quyết định đặt sách')
    WHEN d."type" = 'QD_DUTOAN' THEN 'Bộ hồ sơ Quyết định dự toán'
    WHEN d."type" = 'QD_KHLCNT' THEN 'Bộ hồ sơ Quyết định KHLCNT'
    ELSE COALESCE(s."title", 'Bộ hồ sơ Quyết định')
  END,
  CASE WHEN t.latest_status = 'APPROVED' THEN t.updated_at ELSE NULL END,
  t.created_at,
  t.updated_at
FROM targets t
LEFT JOIN "documents" d ON t."target_type" = 'DOCUMENT' AND d."id" = t.target_id
LEFT JOIN "dat_sach_projects" ds ON t."target_type" = 'DAT_SACH_DECISION' AND ds."id" = t.target_id
LEFT JOIN "procurement_steps" s ON t."target_type" = 'PROCUREMENT_STEP' AND s."id" = t.target_id
LEFT JOIN "contractor_selections" cs ON cs."id" = s."contractor_selection_id"
ON CONFLICT ("id") DO NOTHING;

WITH ranked AS (
  SELECT
    ar."id",
    md5(
      'dossier:' || ar."target_type"::text || ':' ||
      COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
    ) AS dossier_id,
    lag(ar."id") OVER (
      PARTITION BY ar."target_type", COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
      ORDER BY ar."submitted_at" ASC, ar."id" ASC
    ) AS previous_request_id,
    row_number() OVER (
      PARTITION BY ar."target_type", COALESCE(ar."document_id", ar."dat_sach_project_id", ar."procurement_step_id")
      ORDER BY ar."submitted_at" ASC, ar."id" ASC
    ) AS hop_index
  FROM "approval_requests" ar
)
UPDATE "approval_requests" ar
SET
  "dossier_id" = r.dossier_id,
  "previous_request_id" = r.previous_request_id,
  "hop_index" = r.hop_index
FROM ranked r
WHERE ar."id" = r."id";

INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "sort_order", "required", "editable",
  "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || d."id" || ':decision'),
  d."id",
  'decision',
  CASE
    WHEN d."workflow_type" = 'DU_TOAN' THEN 'Quyết định dự toán'
    WHEN d."workflow_type" = 'KHLCNT' THEN 'Quyết định KHLCNT'
    WHEN d."workflow_type" = 'DAT_SACH' THEN 'Quyết định đặt sách'
    ELSE 'Quyết định lựa chọn nhà thầu'
  END,
  'DECISION'::"DossierItemKind",
  CASE
    WHEN d."target_type" IN ('DOCUMENT', 'DAT_SACH_DECISION')
      THEN 'FORM'::"DossierItemSource"
    ELSE 'ENTITY_REFERENCE'::"DossierItemSource"
  END,
  d."target_type"::text,
  d."target_id",
  '{}'::jsonb,
  100,
  TRUE,
  d."status" <> 'APPROVED',
  1,
  d."created_at",
  d."updated_at"
FROM "approval_dossiers" d
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

-- Expand backfilled document dossiers into the same bundle shape as new
-- dossiers. Previously approved decisions remain references; proposal and
-- cover data stay available for preview and revision history.
INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "sort_order", "required", "editable",
  "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':cover'),
  ad."id",
  CASE WHEN ad."workflow_type" = 'DU_TOAN' THEN 'cover_dutoan' ELSE 'cover_khlcnt' END,
  'Phiếu trình ký',
  'COVER'::"DossierItemKind",
  'FORM'::"DossierItemSource",
  NULL,
  NULL,
  COALESCE(src."data", decision."data", '{}'::jsonb),
  10,
  TRUE,
  ad."status" <> 'APPROVED',
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "documents" decision
  ON ad."target_type" = 'DOCUMENT' AND decision."id" = ad."target_id"
LEFT JOIN "documents" src ON src."id" = decision."source_document_id"
WHERE ad."workflow_type" IN ('DU_TOAN', 'KHLCNT')
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

-- Báo cáo thẩm định chỉ được đưa vào bộ KHLCNT khi luồng cũ thực tế đã
-- tạo báo cáo cho cùng Quyết định dự toán nguồn.
WITH latest_appraisal AS (
  SELECT DISTINCT ON ("parent_id", "project_id") *
  FROM "documents"
  WHERE "type" = 'BC_KHLCNT'
  ORDER BY "parent_id", "project_id", "created_at" DESC
)
INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "sort_order", "required", "editable",
  "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':appraisal'),
  ad."id",
  'bc_khlcnt',
  'Báo cáo thẩm định',
  'REPORT'::"DossierItemKind",
  'FORM'::"DossierItemSource",
  'DOCUMENT',
  report."id",
  report."data",
  30,
  TRUE,
  ad."status" <> 'APPROVED',
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "documents" decision
  ON ad."target_type" = 'DOCUMENT' AND decision."id" = ad."target_id"
JOIN latest_appraisal report
  ON report."parent_id" = decision."parent_id"
  AND report."project_id" IS NOT DISTINCT FROM decision."project_id"
WHERE ad."workflow_type" = 'KHLCNT'
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "sort_order", "required", "editable",
  "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':proposal'),
  ad."id",
  CASE WHEN ad."workflow_type" = 'DU_TOAN' THEN 'tt_dutoan' ELSE 'tt_khlcnt' END,
  CASE WHEN ad."workflow_type" = 'DU_TOAN' THEN 'Tờ trình dự toán' ELSE 'Tờ trình KHLCNT' END,
  'PROPOSAL'::"DossierItemKind",
  'FORM'::"DossierItemSource",
  'DOCUMENT',
  src."id",
  src."data",
  20,
  TRUE,
  ad."status" <> 'APPROVED',
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "documents" decision
  ON ad."target_type" = 'DOCUMENT' AND decision."id" = ad."target_id"
JOIN "documents" src ON src."id" = decision."source_document_id"
WHERE ad."workflow_type" IN ('DU_TOAN', 'KHLCNT')
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "sort_order", "required", "editable",
  "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':parent-reference'),
  ad."id",
  'qd_dutoan_reference',
  'Quyết định dự toán nguồn',
  'REFERENCE'::"DossierItemKind",
  'ENTITY_REFERENCE'::"DossierItemSource",
  'DOCUMENT',
  parent."id",
  parent."data",
  0,
  TRUE,
  FALSE,
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "documents" decision
  ON ad."target_type" = 'DOCUMENT' AND decision."id" = ad."target_id"
JOIN "documents" parent ON parent."id" = decision."parent_id"
WHERE ad."workflow_type" = 'KHLCNT'
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "object_path", "original_name", "mime_type", "sort_order", "required",
  "editable", "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':appendix'),
  ad."id",
  'khai_toan_attachment',
  'Phụ lục khái toán',
  'ATTACHMENT'::"DossierItemKind",
  'FILE'::"DossierItemSource",
  COALESCE(
    decision."data"->'khaiToanAttachment'->>'objectPath',
    src."data"->'khaiToanAttachment'->>'objectPath',
    decision."data"->'_khaiToanAttachment'->>'objectPath',
    src."data"->'_khaiToanAttachment'->>'objectPath'
  ),
  COALESCE(
    decision."data"->'khaiToanAttachment'->>'originalName',
    src."data"->'khaiToanAttachment'->>'originalName',
    'phu-luc-khai-toan.docx'
  ),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  40,
  FALSE,
  ad."status" <> 'APPROVED',
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "documents" decision
  ON ad."target_type" = 'DOCUMENT' AND decision."id" = ad."target_id"
LEFT JOIN "documents" src ON src."id" = decision."source_document_id"
WHERE ad."workflow_type" = 'DU_TOAN'
  AND COALESCE(
    decision."data"->'khaiToanAttachment'->>'objectPath',
    src."data"->'khaiToanAttachment'->>'objectPath',
    decision."data"->'_khaiToanAttachment'->>'objectPath',
    src."data"->'_khaiToanAttachment'->>'objectPath'
  ) IS NOT NULL
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

WITH latest_gdn AS (
  SELECT DISTINCT ON ("dat_sach_project_id") *
  FROM "gdn_in_sach"
  ORDER BY "dat_sach_project_id", "created_at" DESC
)
INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "object_path", "original_name",
  "mime_type", "sort_order", "required", "editable", "version",
  "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':gdn'),
  ad."id", 'gdn_in', 'Giấy đề nghị in', 'PROPOSAL'::"DossierItemKind",
  'FORM'::"DossierItemSource", 'DAT_SACH_ITEM', gdn."id",
  gdn."data", gdn."docx_path", 'giay-de-nghi-in.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  10, TRUE, ad."status" <> 'APPROVED', 1, ad."created_at", ad."updated_at"
FROM "approval_dossiers" ad
JOIN latest_gdn gdn ON gdn."dat_sach_project_id" = ad."target_id"
WHERE ad."workflow_type" = 'DAT_SACH'
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

WITH latest_pcdi AS (
  SELECT DISTINCT ON ("dat_sach_project_id") *
  FROM "pcdi_co_so_in"
  ORDER BY "dat_sach_project_id", "created_at" DESC
)
INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "object_path", "original_name",
  "mime_type", "sort_order", "required", "editable", "version",
  "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':pcdi'),
  ad."id", 'pcdi', 'Phiếu chỉ định cơ sở in',
  'SUPPORTING_DOCUMENT'::"DossierItemKind",
  'FORM'::"DossierItemSource", 'DAT_SACH_ITEM', pcdi."id",
  pcdi."data", pcdi."docx_path", 'phieu-chi-dinh-co-so-in.docx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  20, TRUE, ad."status" <> 'APPROVED', 1, ad."created_at", ad."updated_at"
FROM "approval_dossiers" ad
JOIN latest_pcdi pcdi ON pcdi."dat_sach_project_id" = ad."target_id"
WHERE ad."workflow_type" = 'DAT_SACH'
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

INSERT INTO "approval_dossier_items" (
  "id", "dossier_id", "item_key", "label", "kind", "source",
  "entity_type", "entity_id", "data", "object_path", "sort_order",
  "required", "editable", "version", "created_at", "updated_at"
)
SELECT
  md5('dossier-item:' || ad."id" || ':reference:' || previous."id"),
  ad."id",
  'reference_' || previous."id",
  previous."title",
  'REFERENCE'::"DossierItemKind",
  'ENTITY_REFERENCE'::"DossierItemSource",
  'PROCUREMENT_STEP',
  previous."id",
  previous."data",
  previous."attachment_path",
  previous."step_order",
  TRUE,
  FALSE,
  1,
  ad."created_at",
  ad."updated_at"
FROM "approval_dossiers" ad
JOIN "procurement_steps" current_step
  ON ad."target_type" = 'PROCUREMENT_STEP'
  AND current_step."id" = ad."target_id"
JOIN "procurement_steps" previous
  ON previous."contractor_selection_id" = current_step."contractor_selection_id"
  AND previous."step_order" < current_step."step_order"
  AND previous."status" = 'COMPLETED'
WHERE ad."workflow_type" IN ('LCNT_QD_HSMT', 'LCNT_QD_KQLCNT', 'LCNT_QD_LCNT')
  AND (
    previous."requires_approval" = TRUE
    OR lower(previous."title") LIKE '%quyết định%'
  )
ON CONFLICT ("dossier_id", "item_key") DO NOTHING;

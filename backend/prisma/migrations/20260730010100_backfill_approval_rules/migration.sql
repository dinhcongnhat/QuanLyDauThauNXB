-- This migration intentionally runs after the enum migration has committed.
-- Supporting records no longer require a human approval.
UPDATE "documents"
SET "status" = 'COMPLETED'
WHERE "type" IN ('TT_DUTOAN', 'TT_KHLCNT', 'BC_KHLCNT')
  AND "status" = 'APPROVED';

UPDATE "documents"
SET "status" = 'DRAFT'
WHERE "type" IN ('TT_DUTOAN', 'TT_KHLCNT', 'BC_KHLCNT')
  AND "status" IN ('PENDING_APPROVAL', 'PENDING_HEAD', 'PENDING_DIRECTOR', 'REJECTED');

UPDATE "gdn_in_sach"
SET "status" = 'COMPLETED', "review_status" = NULL, "reviewer_id" = NULL
WHERE "status" = 'APPROVED';

UPDATE "gdn_in_sach"
SET "status" = 'DRAFT', "review_status" = NULL, "reviewer_id" = NULL
WHERE "status" IN ('PENDING_REVIEW', 'REWORK');

UPDATE "pcdi_co_so_in"
SET "status" = 'COMPLETED', "review_status" = NULL, "reviewer_id" = NULL
WHERE "status" = 'APPROVED';

UPDATE "pcdi_co_so_in"
SET "status" = 'DRAFT', "review_status" = NULL, "reviewer_id" = NULL
WHERE "status" IN ('PENDING_REVIEW', 'REWORK');

UPDATE "procurement_steps"
SET "requires_approval" = CASE
    WHEN "step_key" IN ('quyet_dinh_kqlcnt', 'quyet_dinh_hsmt', 'quyet_dinh_lcnt') THEN TRUE
    ELSE FALSE
  END,
  "approval_status" = CASE
    WHEN "step_key" IN ('quyet_dinh_kqlcnt', 'quyet_dinh_hsmt', 'quyet_dinh_lcnt') THEN "approval_status"
    ELSE 'NO_APPROVAL_REQUIRED'::"StepApprovalStatus"
  END,
  "approved_by" = CASE
    WHEN "step_key" IN ('quyet_dinh_kqlcnt', 'quyet_dinh_hsmt', 'quyet_dinh_lcnt') THEN "approved_by"
    ELSE NULL
  END,
  "approved_at" = CASE
    WHEN "step_key" IN ('quyet_dinh_kqlcnt', 'quyet_dinh_hsmt', 'quyet_dinh_lcnt') THEN "approved_at"
    ELSE NULL
  END;

-- Preserve active decisions that already have a valid approver.
INSERT INTO "approval_requests" (
  "id", "target_type", "status", "document_id", "requester_id", "approver_id",
  "submitted_at", "created_at", "updated_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || d."id"),
  'DOCUMENT', 'PENDING', d."id", d."created_by", d."assigned_to",
  d."updated_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "documents" d
JOIN "users" u ON u."id" = d."assigned_to" AND u."can_approve" = TRUE
WHERE d."type" IN ('QD_DUTOAN', 'QD_KHLCNT')
  AND d."status" IN ('PENDING_APPROVAL', 'PENDING_HEAD', 'PENDING_DIRECTOR')
  AND d."assigned_to" IS NOT NULL;

INSERT INTO "approval_requests" (
  "id", "target_type", "status", "dat_sach_project_id", "requester_id", "approver_id",
  "submitted_at", "created_at", "updated_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || p."id"),
  'DAT_SACH_DECISION', 'PENDING', p."id", p."created_by", p."reviewer_id",
  p."updated_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "dat_sach_projects" p
JOIN "users" u ON u."id" = p."reviewer_id" AND u."can_approve" = TRUE
WHERE p."review_status" = 'PENDING' AND p."reviewer_id" IS NOT NULL;

-- Orphan pending decisions must be explicitly submitted again.
UPDATE "documents" d
SET "status" = 'DRAFT'
WHERE d."type" IN ('QD_DUTOAN', 'QD_KHLCNT')
  AND d."status" IN ('PENDING_APPROVAL', 'PENDING_HEAD', 'PENDING_DIRECTOR')
  AND NOT EXISTS (
    SELECT 1 FROM "approval_requests" ar
    WHERE ar."document_id" = d."id" AND ar."status" = 'PENDING'
  );

UPDATE "procurement_steps" s
SET "approval_status" = 'NO_APPROVAL_REQUIRED'
WHERE s."step_key" IN ('quyet_dinh_kqlcnt', 'quyet_dinh_hsmt', 'quyet_dinh_lcnt')
  AND s."approval_status" = 'PENDING_APPROVAL';

-- Normalize legacy chat rows and preserve their one-file attachment.
UPDATE "project_messages"
SET "module" = CASE
  WHEN "module" IS NULL OR btrim("module") = '' THEN 'GENERAL'
  ELSE upper(btrim("module"))
END;

-- Older projects may predate the automatic OWNER membership.
INSERT INTO "project_members" (
  "id", "project_id", "user_id", "role", "added_by", "created_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || p."id"),
  p."id",
  p."created_by",
  'OWNER',
  p."created_by",
  p."created_at"
FROM "projects" p
ON CONFLICT ("project_id", "user_id") DO NOTHING;

INSERT INTO "project_message_attachments" (
  "id", "message_id", "project_id", "uploader_id", "object_path",
  "original_name", "mime_type", "size", "kind", "created_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || m."id"),
  m."id",
  m."project_id",
  m."user_id",
  CASE
    WHEN m."file_url" LIKE '/qldanxb/%'
      THEN regexp_replace(m."file_url", '^/qldanxb/', '')
    WHEN m."file_url" ~ '^https?://'
      THEN regexp_replace(m."file_url", '^https?://[^/]+/qldanxb/', '')
    ELSE m."file_url"
  END,
  COALESCE(m."file_name", 'attachment'),
  COALESCE(m."file_type", 'application/octet-stream'),
  COALESCE(m."file_size", 0),
  CASE
    WHEN COALESCE(m."file_type", '') LIKE 'image/%' THEN 'IMAGE'::"ChatAttachmentKind"
    WHEN COALESCE(m."file_type", '') LIKE 'video/%' THEN 'VIDEO'::"ChatAttachmentKind"
    WHEN lower(COALESCE(m."file_name", '')) ~ '\.(doc|docx|xls|xlsx|ppt|pptx)$'
      THEN 'OFFICE'::"ChatAttachmentKind"
    WHEN lower(COALESCE(m."file_name", '')) ~ '\.pdf$'
      THEN 'PDF'::"ChatAttachmentKind"
    ELSE 'FILE'::"ChatAttachmentKind"
  END,
  m."created_at"
FROM "project_messages" m
WHERE m."file_url" IS NOT NULL
  AND btrim(m."file_url") <> ''
ON CONFLICT ("object_path") DO NOTHING;

-- Existing conversations start as read, preventing a large historical badge.
INSERT INTO "project_message_reads" (
  "id", "project_id", "user_id", "module_key",
  "last_read_at", "created_at", "updated_at"
)
SELECT
  md5(random()::text || clock_timestamp()::text || pm."id" || modules."module_key"),
  pm."project_id",
  pm."user_id",
  modules."module_key",
  modules."last_message_at",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "project_members" pm
JOIN (
  SELECT
    "project_id",
    COALESCE("module", 'GENERAL') AS "module_key",
    max("created_at") AS "last_message_at"
  FROM "project_messages"
  GROUP BY "project_id", COALESCE("module", 'GENERAL')
) modules ON modules."project_id" = pm."project_id"
ON CONFLICT ("project_id", "user_id", "module_key") DO NOTHING;

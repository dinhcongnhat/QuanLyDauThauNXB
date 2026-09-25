ALTER TYPE "DocStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "GDNStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

CREATE TYPE "ApprovalTargetType" AS ENUM (
  'DAT_SACH_DECISION',
  'DOCUMENT',
  'PROCUREMENT_STEP'
);

CREATE TYPE "ApprovalRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "ChatAttachmentKind" AS ENUM (
  'IMAGE',
  'VIDEO',
  'OFFICE',
  'PDF',
  'FILE'
);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'APPROVAL_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CHAT_MENTION';

ALTER TABLE "project_messages"
  ADD COLUMN "client_message_id" TEXT;

CREATE UNIQUE INDEX "project_messages_user_id_client_message_id_key"
  ON "project_messages"("user_id", "client_message_id");

CREATE TABLE "project_message_reads" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "module_key" TEXT NOT NULL DEFAULT 'GENERAL',
  "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_message_reads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_message_reads_project_id_user_id_module_key_key"
  ON "project_message_reads"("project_id", "user_id", "module_key");
CREATE INDEX "project_message_reads_user_id_last_read_at_idx"
  ON "project_message_reads"("user_id", "last_read_at");

CREATE TABLE "project_message_mentions" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "start" INTEGER NOT NULL,
  "length" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "project_message_mentions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_message_mentions_message_id_user_id_start_key"
  ON "project_message_mentions"("message_id", "user_id", "start");
CREATE INDEX "project_message_mentions_user_id_idx"
  ON "project_message_mentions"("user_id");

CREATE TABLE "project_message_attachments" (
  "id" TEXT NOT NULL,
  "message_id" TEXT,
  "project_id" TEXT NOT NULL,
  "uploader_id" TEXT NOT NULL,
  "object_path" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "kind" "ChatAttachmentKind" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_message_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "project_message_attachments_object_path_key"
  ON "project_message_attachments"("object_path");
CREATE INDEX "project_message_attachments_project_id_created_at_idx"
  ON "project_message_attachments"("project_id", "created_at");
CREATE INDEX "project_message_attachments_uploader_id_message_id_idx"
  ON "project_message_attachments"("uploader_id", "message_id");

CREATE TABLE "approval_requests" (
  "id" TEXT NOT NULL,
  "target_type" "ApprovalTargetType" NOT NULL,
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "document_id" TEXT,
  "dat_sach_project_id" TEXT,
  "procurement_step_id" TEXT,
  "requester_id" TEXT NOT NULL,
  "approver_id" TEXT NOT NULL,
  "submit_comment" TEXT,
  "decision_comment" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_requests_exactly_one_target_check" CHECK (
    num_nonnulls("document_id", "dat_sach_project_id", "procurement_step_id") = 1
  )
);

CREATE INDEX "approval_requests_approver_id_status_submitted_at_idx"
  ON "approval_requests"("approver_id", "status", "submitted_at");
CREATE INDEX "approval_requests_requester_id_submitted_at_idx"
  ON "approval_requests"("requester_id", "submitted_at");
CREATE INDEX "approval_requests_target_type_status_idx"
  ON "approval_requests"("target_type", "status");
CREATE INDEX "approval_requests_document_id_idx" ON "approval_requests"("document_id");
CREATE INDEX "approval_requests_dat_sach_project_id_idx" ON "approval_requests"("dat_sach_project_id");
CREATE INDEX "approval_requests_procurement_step_id_idx" ON "approval_requests"("procurement_step_id");
CREATE UNIQUE INDEX "approval_requests_one_pending_document_key"
  ON "approval_requests"("document_id")
  WHERE "status" = 'PENDING' AND "document_id" IS NOT NULL;
CREATE UNIQUE INDEX "approval_requests_one_pending_dat_sach_key"
  ON "approval_requests"("dat_sach_project_id")
  WHERE "status" = 'PENDING' AND "dat_sach_project_id" IS NOT NULL;
CREATE UNIQUE INDEX "approval_requests_one_pending_procurement_step_key"
  ON "approval_requests"("procurement_step_id")
  WHERE "status" = 'PENDING' AND "procurement_step_id" IS NOT NULL;

ALTER TABLE "project_message_reads"
  ADD CONSTRAINT "project_message_reads_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_reads"
  ADD CONSTRAINT "project_message_reads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_mentions"
  ADD CONSTRAINT "project_message_mentions_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "project_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_mentions"
  ADD CONSTRAINT "project_message_mentions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_attachments"
  ADD CONSTRAINT "project_message_attachments_message_id_fkey"
  FOREIGN KEY ("message_id") REFERENCES "project_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_attachments"
  ADD CONSTRAINT "project_message_attachments_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_message_attachments"
  ADD CONSTRAINT "project_message_attachments_uploader_id_fkey"
  FOREIGN KEY ("uploader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_dat_sach_project_id_fkey"
  FOREIGN KEY ("dat_sach_project_id") REFERENCES "dat_sach_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_procurement_step_id_fkey"
  FOREIGN KEY ("procurement_step_id") REFERENCES "procurement_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "approval_requests"
  ADD CONSTRAINT "approval_requests_approver_id_fkey"
  FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

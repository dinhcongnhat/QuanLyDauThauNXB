-- Reconcile the clean migration history with the current Prisma schema.
-- The legacy database previously contained these objects through schema drift.

ALTER TYPE "DocStatus" ADD VALUE 'PENDING_APPROVAL';

ALTER TABLE "dat_sach_projects"
ADD COLUMN "review_comment" TEXT,
ADD COLUMN "review_history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "review_status" "ReviewStatus",
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewer_id" TEXT,
DROP COLUMN "status",
ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'IN_PROGRESS';

ALTER TABLE "documents"
DROP COLUMN "procurement_type",
ADD COLUMN "procurement_type" "ProcurementType";

ALTER TABLE "gdn_in_sach"
ADD COLUMN "docx_path" TEXT,
ADD COLUMN "review_comment" TEXT,
ADD COLUMN "review_history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "review_status" "ReviewStatus",
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewer_id" TEXT,
DROP COLUMN "status",
ADD COLUMN "status" "GDNStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "pcdi_co_so_in"
ADD COLUMN "docx_path" TEXT,
ADD COLUMN "review_comment" TEXT,
ADD COLUMN "review_history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "review_status" "ReviewStatus",
ADD COLUMN "reviewed_at" TIMESTAMP(3),
ADD COLUMN "reviewer_id" TEXT,
DROP COLUMN "status",
ADD COLUMN "status" "GDNStatus" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "added_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_messages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "file_url" TEXT,
    "file_name" TEXT,
    "file_type" TEXT,
    "file_size" INTEGER,
    "module" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_logs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_members_user_id_idx"
ON "project_members"("user_id");

CREATE UNIQUE INDEX "project_members_project_id_user_id_key"
ON "project_members"("project_id", "user_id");

CREATE INDEX "project_messages_project_id_created_at_idx"
ON "project_messages"("project_id", "created_at");

CREATE INDEX "project_messages_project_id_module_idx"
ON "project_messages"("project_id", "module");

CREATE INDEX "project_logs_project_id_step_key_idx"
ON "project_logs"("project_id", "step_key");

CREATE INDEX "project_logs_created_at_idx"
ON "project_logs"("created_at");

ALTER TABLE "project_members"
ADD CONSTRAINT "project_members_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_members"
ADD CONSTRAINT "project_members_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_members"
ADD CONSTRAINT "project_members_added_by_fkey"
FOREIGN KEY ("added_by") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "project_messages"
ADD CONSTRAINT "project_messages_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_messages"
ADD CONSTRAINT "project_messages_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dat_sach_projects"
ADD CONSTRAINT "dat_sach_projects_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "gdn_in_sach"
ADD CONSTRAINT "gdn_in_sach_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pcdi_co_so_in"
ADD CONSTRAINT "pcdi_co_so_in_reviewer_id_fkey"
FOREIGN KEY ("reviewer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_logs"
ADD CONSTRAINT "project_logs_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_logs"
ADD CONSTRAINT "project_logs_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER INDEX "ContractorSelection_projectId_idx"
RENAME TO "contractor_selections_project_id_idx";

ALTER INDEX "ContractorSelection_qdKhlcntId_idx"
RENAME TO "contractor_selections_qd_khlcnt_id_idx";

ALTER INDEX "DatSachProject_createdBy_idx"
RENAME TO "dat_sach_projects_created_by_idx";

ALTER INDEX "DatSachProject_parentId_idx"
RENAME TO "dat_sach_projects_parent_id_idx";

ALTER INDEX "DatSachProject_projectId_idx"
RENAME TO "dat_sach_projects_project_id_idx";

ALTER INDEX "Document_assignedTo_idx"
RENAME TO "documents_assigned_to_idx";

ALTER INDEX "Document_createdBy_idx"
RENAME TO "documents_created_by_idx";

ALTER INDEX "Document_projectId_idx"
RENAME TO "documents_project_id_idx";

ALTER INDEX "Document_type_status_idx"
RENAME TO "documents_type_status_idx";

ALTER INDEX "PaymentStep_paymentId_stepKey_idx"
RENAME TO "payment_steps_payment_id_step_key_idx";

ALTER INDEX "Payment_contractorSelectionId_idx"
RENAME TO "payments_contractor_selection_id_idx";

ALTER INDEX "Payment_projectId_idx"
RENAME TO "payments_project_id_idx";

ALTER INDEX "ProcurementStep_approvalStatus_idx"
RENAME TO "procurement_steps_approval_status_idx";

ALTER INDEX "ProcurementStep_contractorSelectionId_stepKey_idx"
RENAME TO "procurement_steps_contractor_selection_id_step_key_idx";

ALTER INDEX "Review_documentId_idx"
RENAME TO "reviews_document_id_idx";

ALTER INDEX "Review_userId_idx"
RENAME TO "reviews_user_id_idx";

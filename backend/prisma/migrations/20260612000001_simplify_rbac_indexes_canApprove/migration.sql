-- Simplify RBAC: Add canApprove field, add database indexes

-- Step 1: Add canApprove column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "can_approve" BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Set canApprove=true for existing ADMIN users
UPDATE "users" SET "can_approve" = true WHERE "role" = 'ADMIN';

-- Step 3: Add database indexes for performance (conditionally - only if table/column exists)
-- Document indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE INDEX IF NOT EXISTS "Document_projectId_idx" ON "documents" ("project_id");
    CREATE INDEX IF NOT EXISTS "Document_createdBy_idx" ON "documents" ("created_by");
    CREATE INDEX IF NOT EXISTS "Document_type_status_idx" ON "documents" ("type", "status");
    CREATE INDEX IF NOT EXISTS "Document_assignedTo_idx" ON "documents" ("assigned_to");
  END IF;
END $$;

-- ContractorSelection indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contractor_selections') THEN
    CREATE INDEX IF NOT EXISTS "ContractorSelection_projectId_idx" ON "contractor_selections" ("project_id");
    CREATE INDEX IF NOT EXISTS "ContractorSelection_qdKhlcntId_idx" ON "contractor_selections" ("qd_khlcnt_id");
  END IF;
END $$;

-- Payment indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    CREATE INDEX IF NOT EXISTS "Payment_projectId_idx" ON "payments" ("project_id");
    CREATE INDEX IF NOT EXISTS "Payment_contractorSelectionId_idx" ON "payments" ("contractor_selection_id");
  END IF;
END $$;

-- ProcurementStep indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procurement_steps') THEN
    CREATE INDEX IF NOT EXISTS "ProcurementStep_contractorSelectionId_stepKey_idx" ON "procurement_steps" ("contractor_selection_id", "step_key");
    CREATE INDEX IF NOT EXISTS "ProcurementStep_approvalStatus_idx" ON "procurement_steps" ("approval_status");
  END IF;
END $$;

-- PaymentStep indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_steps') THEN
    CREATE INDEX IF NOT EXISTS "PaymentStep_paymentId_stepKey_idx" ON "payment_steps" ("payment_id", "step_key");
  END IF;
END $$;

-- DatSachProject indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dat_sach_projects') THEN
    CREATE INDEX IF NOT EXISTS "DatSachProject_projectId_idx" ON "dat_sach_projects" ("project_id");
    CREATE INDEX IF NOT EXISTS "DatSachProject_parentId_idx" ON "dat_sach_projects" ("parent_id");
    CREATE INDEX IF NOT EXISTS "DatSachProject_createdBy_idx" ON "dat_sach_projects" ("created_by");
  END IF;
END $$;

-- Review indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE INDEX IF NOT EXISTS "Review_documentId_idx" ON "reviews" ("document_id");
    CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "reviews" ("user_id");
  END IF;
END $$;

-- Notification indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "notifications" ("user_id", "is_read");
    CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "notifications" ("user_id", "created_at");
  END IF;
END $$;

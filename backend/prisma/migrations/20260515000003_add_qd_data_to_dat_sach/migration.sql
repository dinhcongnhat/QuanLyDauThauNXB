-- Add qd_data column to dat_sach_projects (was missing from initial migration)
ALTER TABLE "dat_sach_projects" ADD COLUMN "qd_data" JSONB NOT NULL DEFAULT '{}';

-- Fix: drop global khoa unique index and create per-library unique instead
DROP INDEX IF EXISTS "library_fields_khoa_key";
CREATE UNIQUE INDEX "library_fields_library_id_khoa_key" ON "library_fields"("library_id", "khoa");

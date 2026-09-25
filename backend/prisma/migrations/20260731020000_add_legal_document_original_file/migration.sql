ALTER TABLE "legal_documents"
ADD COLUMN "original_object_path" TEXT,
ADD COLUMN "original_name" TEXT,
ADD COLUMN "original_mime_type" TEXT,
ADD COLUMN "original_size" INTEGER;

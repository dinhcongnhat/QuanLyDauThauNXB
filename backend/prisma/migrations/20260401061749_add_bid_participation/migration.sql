-- CreateEnum
CREATE TYPE "BidResult" AS ENUM ('PENDING', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "bid_participations" (
    "id" TEXT NOT NULL,
    "ma_thong_bao_moi_thau" TEXT NOT NULL,
    "ten_chu_dau_tu" TEXT NOT NULL,
    "ten_goi_thau" TEXT,
    "result" "BidResult" NOT NULL DEFAULT 'PENDING',
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_steps" (
    "id" TEXT NOT NULL,
    "bid_participation_id" TEXT NOT NULL,
    "step_key" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "data" JSONB NOT NULL DEFAULT '{}',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bid_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bid_steps_bid_participation_id_step_key_key" ON "bid_steps"("bid_participation_id", "step_key");

-- AddForeignKey
ALTER TABLE "bid_participations" ADD CONSTRAINT "bid_participations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_steps" ADD CONSTRAINT "bid_steps_bid_participation_id_fkey" FOREIGN KEY ("bid_participation_id") REFERENCES "bid_participations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

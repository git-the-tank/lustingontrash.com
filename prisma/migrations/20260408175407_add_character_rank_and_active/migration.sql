-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "guildRank" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Character_active_idx" ON "Character"("active");

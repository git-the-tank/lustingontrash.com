-- CreateEnum
CREATE TYPE "FightCategory" AS ENUM ('PROGRESSION', 'FARM', 'IGNORED');

-- CreateTable
CREATE TABLE "FightConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "category" "FightCategory" NOT NULL DEFAULT 'IGNORED',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FightConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FightConfig_guildId_idx" ON "FightConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "FightConfig_guildId_encounterId_difficulty_key" ON "FightConfig"("guildId", "encounterId", "difficulty");

-- AddForeignKey
ALTER TABLE "FightConfig" ADD CONSTRAINT "FightConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

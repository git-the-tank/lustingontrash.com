-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('NORMAL', 'HEROIC', 'MYTHIC');

-- CreateTable
CREATE TABLE "Parse" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "metric" TEXT NOT NULL,
    "bestPercent" DOUBLE PRECISION NOT NULL,
    "medianPercent" DOUBLE PRECISION,
    "bestAmount" DOUBLE PRECISION,
    "bestSpec" TEXT,
    "fastestKillMs" INTEGER,
    "killCount" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Parse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Parse_characterId_idx" ON "Parse"("characterId");

-- CreateIndex
CREATE INDEX "Parse_encounterId_difficulty_idx" ON "Parse"("encounterId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Parse_characterId_encounterId_difficulty_key" ON "Parse"("characterId", "encounterId", "difficulty");

-- CreateIndex
CREATE INDEX "Session_refreshTokenHash_idx" ON "Session"("refreshTokenHash");

-- AddForeignKey
ALTER TABLE "Parse" ADD CONSTRAINT "Parse_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

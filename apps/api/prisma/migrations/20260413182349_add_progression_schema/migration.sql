-- CreateEnum
CREATE TYPE "ReportState" AS ENUM ('NEW', 'LIVE', 'FINAL');

-- CreateEnum
CREATE TYPE "EffectiveProgEndSource" AS ENUM ('HEURISTIC', 'OVERRIDE', 'NONE');

-- CreateEnum
CREATE TYPE "DeathClassification" AS ENUM ('PROG_RELEVANT', 'WIPE_COLLAPSE', 'POST_WIPE_EXIT', 'RESET_ROLE_HOLDOUT');

-- CreateEnum
CREATE TYPE "RawPayloadSource" AS ENUM ('REPORT_SPINE', 'MASTER_DATA', 'TABLE_DEATHS', 'TABLE_DAMAGE_TAKEN', 'TABLE_CASTS', 'TABLE_INTERRUPTS', 'TABLE_DISPELS', 'TABLE_SUMMARY');

-- AlterTable
ALTER TABLE "FightConfig" ADD COLUMN     "config" JSONB;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT,
    "zoneId" INTEGER,
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "state" "ReportState" NOT NULL DEFAULT 'NEW',
    "lastFetchedAt" TIMESTAMPTZ(3),
    "lastFightSeenAt" TIMESTAMPTZ(3),
    "finalizedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fight" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "fightId" INTEGER NOT NULL,
    "encounterId" INTEGER NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "name" TEXT,
    "kill" BOOLEAN NOT NULL DEFAULT false,
    "startTime" INTEGER NOT NULL,
    "endTime" INTEGER NOT NULL,
    "bossPercentage" DOUBLE PRECISION,
    "fightPercentage" DOUBLE PRECISION,
    "phaseTransitions" JSONB,
    "effectiveProgEndMs" INTEGER,
    "effectiveProgEndSource" "EffectiveProgEndSource" NOT NULL DEFAULT 'NONE',
    "effectiveProgEndOverrideBy" TEXT,
    "effectiveProgEndOverrideAt" TIMESTAMPTZ(3),
    "effectiveProgEndOverrideVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Fight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    "guid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subType" TEXT,
    "characterId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" TEXT NOT NULL,
    "abilityId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerFightFact" (
    "id" TEXT NOT NULL,
    "fightId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "characterId" TEXT,
    "metricVersion" INTEGER NOT NULL,
    "timeAliveMs" INTEGER,
    "deathTimeMs" INTEGER,
    "deathAbilityId" INTEGER,
    "deathClassification" "DeathClassification",
    "bossPercentAtDeath" DOUBLE PRECISION,
    "diedBeforeFirstPhaseTransition" BOOLEAN NOT NULL DEFAULT false,
    "defensiveAvailableAtDeath" BOOLEAN,
    "unusedAvailableDefensives" JSONB,
    "damageDone" BIGINT,
    "damageTaken" BIGINT,
    "avoidableDamageTaken" BIGINT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PlayerFightFact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawPayloadCache" (
    "id" TEXT NOT NULL,
    "reportCode" TEXT NOT NULL,
    "sourceType" "RawPayloadSource" NOT NULL,
    "fightId" INTEGER,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawPayloadCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_code_key" ON "Report"("code");

-- CreateIndex
CREATE INDEX "Report_guildId_startTime_idx" ON "Report"("guildId", "startTime");

-- CreateIndex
CREATE INDEX "Report_state_idx" ON "Report"("state");

-- CreateIndex
CREATE INDEX "Fight_encounterId_difficulty_idx" ON "Fight"("encounterId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Fight_reportId_fightId_key" ON "Fight"("reportId", "fightId");

-- CreateIndex
CREATE INDEX "Actor_guid_idx" ON "Actor"("guid");

-- CreateIndex
CREATE INDEX "Actor_characterId_idx" ON "Actor"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Actor_reportId_actorId_key" ON "Actor"("reportId", "actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Ability_abilityId_key" ON "Ability"("abilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Npc_gameId_key" ON "Npc"("gameId");

-- CreateIndex
CREATE INDEX "PlayerFightFact_characterId_idx" ON "PlayerFightFact"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerFightFact_fightId_actorId_metricVersion_key" ON "PlayerFightFact"("fightId", "actorId", "metricVersion");

-- CreateIndex
CREATE INDEX "RawPayloadCache_reportCode_sourceType_fightId_idx" ON "RawPayloadCache"("reportCode", "sourceType", "fightId");

-- CreateIndex
CREATE INDEX "RawPayloadCache_reportCode_fetchedAt_idx" ON "RawPayloadCache"("reportCode", "fetchedAt");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fight" ADD CONSTRAINT "Fight_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actor" ADD CONSTRAINT "Actor_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFightFact" ADD CONSTRAINT "PlayerFightFact_fightId_fkey" FOREIGN KEY ("fightId") REFERENCES "Fight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFightFact" ADD CONSTRAINT "PlayerFightFact_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerFightFact" ADD CONSTRAINT "PlayerFightFact_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

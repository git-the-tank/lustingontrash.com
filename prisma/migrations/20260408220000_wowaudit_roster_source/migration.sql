-- Switch character source of truth from WCL to wowaudit.
-- Existing WCL-sourced characters are dropped; wowaudit sync will repopulate.

-- Drop old Character table and recreate with wowaudit fields
DROP TABLE IF EXISTS "Character";

CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "wowauditId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rank" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Character_wowauditId_key" ON "Character"("wowauditId");
CREATE UNIQUE INDEX "Character_name_server_key" ON "Character"("name", "server");
CREATE INDEX "Character_guildId_idx" ON "Character"("guildId");
CREATE INDEX "Character_active_idx" ON "Character"("active");

ALTER TABLE "Character" ADD CONSTRAINT "Character_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

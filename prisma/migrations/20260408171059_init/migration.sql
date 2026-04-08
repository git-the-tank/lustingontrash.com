-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "wclId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "wclId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_wclId_key" ON "Guild"("wclId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_server_region_key" ON "Guild"("name", "server", "region");

-- CreateIndex
CREATE UNIQUE INDEX "Character_wclId_key" ON "Character"("wclId");

-- CreateIndex
CREATE INDEX "Character_guildId_idx" ON "Character"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_name_server_key" ON "Character"("name", "server");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

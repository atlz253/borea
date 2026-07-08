-- CreateTable
CREATE TABLE "TaskBoard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationName" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "lastTaskNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "TaskBoard_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskColumn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "TaskColumn_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "TaskBoard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    CONSTRAINT "TaskCard_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "TaskColumn" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskBoard_organizationName_key_key" ON "TaskBoard"("organizationName", "key");

-- CreateIndex
CREATE INDEX "TaskBoard_organizationName_idx" ON "TaskBoard"("organizationName");

-- CreateIndex
CREATE INDEX "TaskColumn_boardId_position_idx" ON "TaskColumn"("boardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCard_boardId_number_key" ON "TaskCard"("boardId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "TaskCard_boardId_publicId_key" ON "TaskCard"("boardId", "publicId");

-- CreateIndex
CREATE INDEX "TaskCard_columnId_position_idx" ON "TaskCard"("columnId", "position");

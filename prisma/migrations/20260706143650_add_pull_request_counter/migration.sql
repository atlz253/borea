-- CreateTable
CREATE TABLE "PullRequestCounter" (
    "repositoryId" TEXT NOT NULL PRIMARY KEY,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "PullRequestCounter_repositoryId_idx" ON "PullRequestCounter"("repositoryId");

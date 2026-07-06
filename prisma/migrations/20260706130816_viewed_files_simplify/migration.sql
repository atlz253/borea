/*
  Warnings:

  - You are about to drop the `PullRequestViewedFile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "PullRequestViewedFile_repositoryId_prNumber_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PullRequestViewedFile";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PullRequest" (
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mergeCommitSha" TEXT,
    "authorName" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "viewedFiles" TEXT NOT NULL DEFAULT '[]',

    PRIMARY KEY ("repositoryId", "prNumber"),
    CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PullRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PullRequest" ("authorId", "authorName", "createdAt", "mergeCommitSha", "prNumber", "repositoryId", "sourceBranch", "status", "targetBranch", "title", "updatedAt") SELECT "authorId", "authorName", "createdAt", "mergeCommitSha", "prNumber", "repositoryId", "sourceBranch", "status", "targetBranch", "title", "updatedAt" FROM "PullRequest";
DROP TABLE "PullRequest";
ALTER TABLE "new_PullRequest" RENAME TO "PullRequest";
CREATE INDEX "PullRequest_repositoryId_status_idx" ON "PullRequest"("repositoryId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

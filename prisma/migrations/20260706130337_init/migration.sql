-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "credential" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GitToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    CONSTRAINT "GitToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Organization" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT,
    "createdAt" TEXT NOT NULL,
    "ownerId" TEXT,
    CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "organizationName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    PRIMARY KEY ("organizationName", "userId"),
    CONSTRAINT "OrganizationMember_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    CONSTRAINT "Repository_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Repository_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepositoryMember" (
    "repositoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    PRIMARY KEY ("repositoryId", "userId"),
    CONSTRAINT "RepositoryMember_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RepositoryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequest" (
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

    PRIMARY KEY ("repositoryId", "prNumber"),
    CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PullRequest_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequestComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetFilePath" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    CONSTRAINT "PullRequestComment_repositoryId_prNumber_fkey" FOREIGN KEY ("repositoryId", "prNumber") REFERENCES "PullRequest" ("repositoryId", "prNumber") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PullRequestComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PullRequestViewedFile" (
    "repositoryId" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TEXT NOT NULL,

    PRIMARY KEY ("repositoryId", "prNumber", "filePath", "userId"),
    CONSTRAINT "PullRequestViewedFile_repositoryId_prNumber_fkey" FOREIGN KEY ("repositoryId", "prNumber") REFERENCES "PullRequest" ("repositoryId", "prNumber") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "GitToken_userId_idx" ON "GitToken"("userId");

-- CreateIndex
CREATE INDEX "Organization_ownerId_idx" ON "Organization"("ownerId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "Repository_organizationName_idx" ON "Repository"("organizationName");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_organizationName_name_key" ON "Repository"("organizationName", "name");

-- CreateIndex
CREATE INDEX "RepositoryMember_userId_idx" ON "RepositoryMember"("userId");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_status_idx" ON "PullRequest"("repositoryId", "status");

-- CreateIndex
CREATE INDEX "PullRequestComment_repositoryId_prNumber_idx" ON "PullRequestComment"("repositoryId", "prNumber");

-- CreateIndex
CREATE INDEX "PullRequestComment_authorId_idx" ON "PullRequestComment"("authorId");

-- CreateIndex
CREATE INDEX "PullRequestViewedFile_repositoryId_prNumber_idx" ON "PullRequestViewedFile"("repositoryId", "prNumber");

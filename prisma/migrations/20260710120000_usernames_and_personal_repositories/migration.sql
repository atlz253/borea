PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH RECURSIVE
	"localpart"("id", "value") AS (
		SELECT "id", lower(substr("email", 1, instr("email", '@') - 1))
		FROM "User"
	),
	"chars"("id", "value", "pos", "len", "base") AS (
		SELECT "id", "value", 1, length("value"), ''
		FROM "localpart"
		UNION ALL
		SELECT
			"id",
			"value",
			"pos" + 1,
			"len",
			"base" || CASE
				WHEN substr("value", "pos", 1) GLOB '[a-z0-9._-]' THEN substr("value", "pos", 1)
				ELSE '-'
			END
		FROM "chars"
		WHERE "pos" <= "len"
	),
	"normalized"("id", "base") AS (
		SELECT
			"id",
			CASE
				WHEN "base" IS NULL OR "base" = '' OR "base" = '.' OR "base" = '..' OR "base" LIKE '.%' THEN 'user'
				ELSE substr("base", 1, 90)
			END
		FROM "chars"
		WHERE "pos" = "len" + 1
	),
	"ranked"("id", "username", "rn") AS (
		SELECT
			"id",
			"base",
			row_number() OVER (PARTITION BY "base" ORDER BY "id")
		FROM "normalized"
	)
UPDATE "User"
SET "username" = (
	SELECT CASE
		WHEN "rn" = 1 THEN "username"
		ELSE "username" || '-' || "rn"
	END
	FROM "ranked"
	WHERE "ranked"."id" = "User"."id"
);

UPDATE "User"
SET "username" = 'user-' || substr("id", 1, 8)
WHERE "username" IS NULL OR "username" = '' OR "username" = '.' OR "username" = '..' OR "username" LIKE '.%';

CREATE TABLE "new_User" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"username" TEXT NOT NULL,
	"email" TEXT NOT NULL,
	"createdAt" TEXT NOT NULL,
	"credential" TEXT NOT NULL
);

INSERT INTO "new_User" ("id", "username", "email", "createdAt", "credential")
SELECT "id", "username", "email", "createdAt", "credential" FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "User_email_idx" ON "User"("email");

CREATE TABLE "new_Repository" (
	"id" TEXT NOT NULL PRIMARY KEY,
	"organizationName" TEXT,
	"userId" TEXT,
	"name" TEXT NOT NULL,
	"description" TEXT,
	"createdAt" TEXT NOT NULL,
	"ownerId" TEXT NOT NULL,
	CONSTRAINT "Repository_organizationName_fkey" FOREIGN KEY ("organizationName") REFERENCES "Organization" ("name") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT "Repository_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Repository" ("id", "organizationName", "name", "description", "createdAt", "ownerId")
SELECT "id", "organizationName", "name", "description", "createdAt", "ownerId" FROM "Repository";

DROP TABLE "Repository";
ALTER TABLE "new_Repository" RENAME TO "Repository";

CREATE INDEX "Repository_organizationName_idx" ON "Repository"("organizationName");
CREATE INDEX "Repository_userId_idx" ON "Repository"("userId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

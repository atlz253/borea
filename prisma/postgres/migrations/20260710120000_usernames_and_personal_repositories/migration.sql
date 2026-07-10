ALTER TABLE "User" ADD COLUMN "username" TEXT;

WITH "normalized" AS (
	SELECT
		"id",
		CASE
			WHEN "base" IS NULL OR "base" = '' OR "base" = '.' OR "base" = '..' OR "base" LIKE '.%' THEN 'user'
			ELSE left("base", 90)
		END AS "base"
	FROM (
		SELECT
			"id",
			lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9._-]', '-', 'g')) AS "base"
		FROM "User"
	) "raw"
),
"ranked" AS (
	SELECT
		"id",
		"base",
		row_number() OVER (PARTITION BY "base" ORDER BY "id") AS "rn"
	FROM "normalized"
)
UPDATE "User"
SET "username" = CASE
	WHEN "ranked"."rn" = 1 THEN "ranked"."base"
	ELSE "ranked"."base" || '-' || "ranked"."rn"
END
FROM "ranked"
WHERE "ranked"."id" = "User"."id";

UPDATE "User"
SET "username" = 'user-' || left("id", 8)
WHERE "username" IS NULL OR "username" = '' OR "username" = '.' OR "username" = '..' OR "username" LIKE '.%';

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "name";

ALTER TABLE "Repository" ALTER COLUMN "organizationName" DROP NOT NULL;
ALTER TABLE "Repository" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_username_idx" ON "User"("username");
CREATE INDEX "Repository_userId_idx" ON "Repository"("userId");

ALTER TABLE "Repository" ADD CONSTRAINT "Repository_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

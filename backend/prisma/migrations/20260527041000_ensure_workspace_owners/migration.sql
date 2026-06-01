ALTER TABLE "organizations"
ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

CREATE INDEX IF NOT EXISTS "organizations_created_by_id_idx"
ON "organizations"("created_by_id");

UPDATE "organizations" AS org
SET "created_by_id" = oldest_member."user_id"
FROM (
  SELECT DISTINCT ON ("org_id")
    "org_id",
    "user_id"
  FROM "organization_members"
  ORDER BY "org_id", "created_at" ASC, "id" ASC
) AS oldest_member
WHERE org."id" = oldest_member."org_id"
  AND org."created_by_id" IS NULL;

UPDATE "organization_members" AS member
SET "role" = 'OWNER'
FROM "organizations" AS org
WHERE member."org_id" = org."id"
  AND member."user_id" = org."created_by_id"
  AND NOT EXISTS (
    SELECT 1
    FROM "organization_members" AS existing_owner
    WHERE existing_owner."org_id" = org."id"
      AND existing_owner."role" = 'OWNER'
  );

UPDATE "organization_members" AS member
SET "role" = 'OWNER'
WHERE member."id" IN (
  SELECT DISTINCT ON (candidate."org_id")
    candidate."id"
  FROM "organization_members" AS candidate
  WHERE NOT EXISTS (
    SELECT 1
    FROM "organization_members" AS existing_owner
    WHERE existing_owner."org_id" = candidate."org_id"
      AND existing_owner."role" = 'OWNER'
  )
  ORDER BY candidate."org_id", candidate."created_at" ASC, candidate."id" ASC
);

UPDATE "organization_members" AS member
SET "role" = 'OWNER'
WHERE member."id" IN (
  SELECT DISTINCT ON ("org_id") "id"
  FROM "organization_members"
  WHERE "role" = 'ADMIN'
  ORDER BY "org_id", "created_at" ASC
)
AND NOT EXISTS (
  SELECT 1
  FROM "organization_members" AS existing_owner
  WHERE existing_owner."org_id" = member."org_id"
    AND existing_owner."role" = 'OWNER'
);

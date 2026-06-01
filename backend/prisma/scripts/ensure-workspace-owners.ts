import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  await prisma.$executeRawUnsafe(`
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
  `);

  const ownerless = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`
    SELECT COUNT(*)::bigint AS count
    FROM "organizations" AS org
    WHERE EXISTS (
      SELECT 1
      FROM "organization_members" AS member
      WHERE member."org_id" = org."id"
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "organization_members" AS owner
      WHERE owner."org_id" = org."id"
        AND owner."role" = 'OWNER'
    );
  `);

  const remaining = Number(ownerless[0]?.count || 0);
  if (remaining > 0) {
    throw new Error(`Ainda existem ${remaining} workspace(s) com membros e sem OWNER.`);
  }

  console.log('Workspace owners corrigidos. Nenhum workspace com membros ficou sem OWNER.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

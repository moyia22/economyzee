-- Align the existing migration history with the current Prisma schema.
-- This migration is intentionally placed before 20260527020000 so that
-- invite_links exists before the older migration tries to alter it.

ALTER TYPE "TransactionOrigin" ADD VALUE IF NOT EXISTS 'RECURRING';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetPeriod') THEN
    CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'WEEKLY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('CONFIRMED', 'PENDING', 'CANCELLED');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "telegram_user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_chat_id" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_username" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_first_name" TEXT,
  ADD COLUMN IF NOT EXISTS "telegram_linked_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "telegram_last_seen_at" TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_user_id_key"
  ON "users"("telegram_user_id");

CREATE TABLE IF NOT EXISTS "telegram_link_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "telegram_link_tokens"
  ADD COLUMN IF NOT EXISTS "organization_id" TEXT,
  ADD COLUMN IF NOT EXISTS "used_at" TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'telegram_link_tokens'
      AND column_name = 'used'
  ) THEN
    EXECUTE 'UPDATE "telegram_link_tokens"
             SET "used_at" = COALESCE("used_at", "created_at")
             WHERE "used" = true
               AND "used_at" IS NULL';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_link_tokens_token_key"
  ON "telegram_link_tokens"("token");

DO $$
DECLARE
  item TEXT[];
  timestamp_columns TEXT[][] := ARRAY[
    ARRAY['users', 'created_at'],
    ARRAY['users', 'updated_at'],
    ARRAY['organizations', 'created_at'],
    ARRAY['organizations', 'updated_at'],
    ARRAY['organization_members', 'created_at'],
    ARRAY['categories', 'created_at'],
    ARRAY['categories', 'updated_at'],
    ARRAY['accounts', 'created_at'],
    ARRAY['accounts', 'updated_at'],
    ARRAY['cards', 'invoice_due'],
    ARRAY['cards', 'created_at'],
    ARRAY['cards', 'updated_at'],
    ARRAY['bills', 'due_date'],
    ARRAY['bills', 'created_at'],
    ARRAY['bills', 'updated_at'],
    ARRAY['budgets', 'created_at'],
    ARRAY['budgets', 'updated_at'],
    ARRAY['transactions', 'date'],
    ARRAY['transactions', 'created_at'],
    ARRAY['transactions', 'updated_at'],
    ARRAY['reminders', 'scheduled_at'],
    ARRAY['reminders', 'created_at'],
    ARRAY['smart_alerts', 'created_at'],
    ARRAY['telegram_events', 'created_at'],
    ARRAY['ai_processing_logs', 'created_at'],
    ARRAY['audit_logs', 'created_at'],
    ARRAY['telegram_link_tokens', 'expires_at'],
    ARRAY['telegram_link_tokens', 'created_at']
  ];
BEGIN
  FOREACH item SLICE 1 IN ARRAY timestamp_columns LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = item[1]
        AND column_name = item[2]
        AND data_type = 'timestamp without time zone'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
        item[1],
        item[2],
        item[2]
      );
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS "invite_links" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
  "invited_email" TEXT,
  "created_by_id" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "max_uses" INTEGER,
  "used_count" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "invite_links_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invite_links"
  ADD COLUMN IF NOT EXISTS "token" TEXT,
  ADD COLUMN IF NOT EXISTS "org_id" TEXT,
  ADD COLUMN IF NOT EXISTS "role" "MemberRole" DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS "invited_email" TEXT,
  ADD COLUMN IF NOT EXISTS "created_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "max_uses" INTEGER,
  ADD COLUMN IF NOT EXISTS "used_count" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "invite_links"
  ALTER COLUMN "role" SET DEFAULT 'MEMBER',
  ALTER COLUMN "used_count" SET DEFAULT 0,
  ALTER COLUMN "active" SET DEFAULT true,
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "invite_links_token_key"
  ON "invite_links"("token");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invite_links_org_id_fkey'
  ) THEN
    ALTER TABLE "invite_links"
    ADD CONSTRAINT "invite_links_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invite_links_created_by_id_fkey'
  ) THEN
    ALTER TABLE "invite_links"
    ADD CONSTRAINT "invite_links_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "status" "TransactionStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "installments" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "current_installment" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "installment_group_id" TEXT,
  ADD COLUMN IF NOT EXISTS "receipt_group_id" TEXT;

CREATE INDEX IF NOT EXISTS "transactions_deleted_at_idx"
  ON "transactions"("deleted_at");

CREATE INDEX IF NOT EXISTS "transactions_card_id_idx"
  ON "transactions"("card_id");

CREATE INDEX IF NOT EXISTS "transactions_receipt_group_id_idx"
  ON "transactions"("receipt_group_id");

ALTER TABLE "budgets"
  ADD COLUMN IF NOT EXISTS "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN IF NOT EXISTS "threshold_80_alerted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "threshold_100_alerted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "goals" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "target_in_cents" INTEGER NOT NULL,
  "current_in_cents" INTEGER NOT NULL DEFAULT 0,
  "deadline" TIMESTAMPTZ,
  "icon" TEXT NOT NULL DEFAULT 'Target',
  "color" TEXT NOT NULL DEFAULT '#3b82f6',
  "org_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_org_id_fkey'
  ) THEN
    ALTER TABLE "goals"
    ADD CONSTRAINT "goals_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "recurring_transactions" (
  "id" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount_in_cents" INTEGER NOT NULL,
  "type" "TransactionType" NOT NULL,
  "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  "day_of_month" INTEGER,
  "day_of_week" INTEGER,
  "last_occurrence" TIMESTAMPTZ,
  "next_occurrence" TIMESTAMPTZ NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "category_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_category_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_account_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_member_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "organization_members"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_org_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_org_id_fkey"
    FOREIGN KEY ("org_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

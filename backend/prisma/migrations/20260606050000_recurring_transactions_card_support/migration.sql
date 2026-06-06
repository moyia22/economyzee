-- Add optional card support for recurring transactions without deleting data.

ALTER TABLE "recurring_transactions"
  ADD COLUMN IF NOT EXISTS "card_id" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_method" "PaymentMethod";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recurring_transactions'
      AND column_name = 'account_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "recurring_transactions"
      ALTER COLUMN "account_id" DROP NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "recurring_transactions_card_id_idx"
  ON "recurring_transactions"("card_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_card_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_card_id_fkey"
    FOREIGN KEY ("card_id") REFERENCES "cards"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_transactions_account_id_fkey'
  ) THEN
    ALTER TABLE "recurring_transactions"
      DROP CONSTRAINT "recurring_transactions_account_id_fkey";
  END IF;

  ALTER TABLE "recurring_transactions"
    ADD CONSTRAINT "recurring_transactions_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
END $$;

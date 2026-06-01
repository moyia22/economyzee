CREATE TYPE "PaymentMethod" AS ENUM (
  'ACCOUNT',
  'PIX',
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'BOLETO',
  'OTHER'
);

ALTER TABLE "transactions" ADD COLUMN "payment_method" "PaymentMethod";

UPDATE "transactions"
SET "payment_method" = CASE
  WHEN "card_id" IS NOT NULL THEN 'CREDIT_CARD'::"PaymentMethod"
  WHEN lower(coalesce("note", '') || ' ' || coalesce("description", '')) LIKE '%pix%' THEN 'PIX'::"PaymentMethod"
  ELSE 'ACCOUNT'::"PaymentMethod"
END
WHERE "payment_method" IS NULL;

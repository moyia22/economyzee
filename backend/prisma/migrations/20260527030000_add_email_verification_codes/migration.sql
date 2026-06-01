ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ;

UPDATE "users"
SET "email_verified" = true,
    "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "email_verified" = false;

CREATE TABLE IF NOT EXISTS "email_verification_codes" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "user_id" TEXT,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "email_verification_codes_email_created_at_idx"
ON "email_verification_codes"("email", "created_at");

CREATE INDEX IF NOT EXISTS "email_verification_codes_user_id_idx"
ON "email_verification_codes"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_verification_codes_user_id_fkey'
  ) THEN
    ALTER TABLE "email_verification_codes"
    ADD CONSTRAINT "email_verification_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

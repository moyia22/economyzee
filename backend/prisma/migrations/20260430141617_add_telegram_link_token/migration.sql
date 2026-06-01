/*
  Warnings:

  - You are about to drop the column `pairing_code` on the `telegram_accounts` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "telegram_accounts_pairing_code_key";

-- AlterTable
ALTER TABLE "telegram_accounts" DROP COLUMN "pairing_code";

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_tokens_token_key" ON "telegram_link_tokens"("token");

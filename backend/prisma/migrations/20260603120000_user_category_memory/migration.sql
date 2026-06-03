-- CreateTable
CREATE TABLE "user_category_memory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_category_memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_category_memory_user_id_token_key" ON "user_category_memory"("user_id", "token");

-- CreateIndex
CREATE INDEX "user_category_memory_user_id_idx" ON "user_category_memory"("user_id");

-- AddForeignKey
ALTER TABLE "user_category_memory" ADD CONSTRAINT "user_category_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

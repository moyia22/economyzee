-- CreateTable
CREATE TABLE "card_workspace_links" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "linked" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "card_workspace_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_card_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "auto_link_personal_cards" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "workspace_card_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_workspace_links_user_id_org_id_idx" ON "card_workspace_links"("user_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "card_workspace_links_user_id_card_id_org_id_key" ON "card_workspace_links"("user_id", "card_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_card_preferences_user_id_org_id_key" ON "workspace_card_preferences"("user_id", "org_id");

-- AddForeignKey
ALTER TABLE "card_workspace_links" ADD CONSTRAINT "card_workspace_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_workspace_links" ADD CONSTRAINT "card_workspace_links_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_workspace_links" ADD CONSTRAINT "card_workspace_links_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_card_preferences" ADD CONSTRAINT "workspace_card_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_card_preferences" ADD CONSTRAINT "workspace_card_preferences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

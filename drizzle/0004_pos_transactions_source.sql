ALTER TABLE "pos_transactions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;

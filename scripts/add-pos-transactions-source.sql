-- Run once: adds source column for manual / Squire / POS provenance.

ALTER TABLE pos_transactions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN pos_transactions.source IS 'manual | squire | pos';

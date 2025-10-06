ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS in_bar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS in_shopping INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_ingredients_in_bar ON ingredients (in_bar);
CREATE INDEX IF NOT EXISTS idx_ingredients_in_shopping ON ingredients (in_shopping);

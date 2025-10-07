export type Migration = {
  id: string;
  sql: string;
};

export const MIGRATIONS: Migration[] = [
  {
    id: "0001_add_ingredient_flags",
    sql: `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS in_bar INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS in_shopping INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_ingredients_in_bar ON ingredients (in_bar);
CREATE INDEX IF NOT EXISTS idx_ingredients_in_shopping ON ingredients (in_shopping);`,
  },
  {
    id: "0002_create_ingredient_tags",
    sql: `CREATE TABLE IF NOT EXISTS ingredient_tags (
  ingredient_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_ingredient_tags_tag ON ingredient_tags (tag_id);`,
  },
  {
    id: "0003_create_events",
    sql: `CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  t INTEGER NOT NULL,
  type TEXT NOT NULL,
  ingredient_id TEXT NOT NULL,
  payload TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_ingredient ON events (ingredient_id, t DESC);`,
  },
];


CREATE TABLE IF NOT EXISTS ingredient_tags (
  ingredient_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_ingredient_tags_tag ON ingredient_tags (tag_id);

-- Theme module schema
CREATE TABLE IF NOT EXISTS themes (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	domain TEXT NOT NULL DEFAULT '_',
	name TEXT NOT NULL,
	is_default INTEGER NOT NULL DEFAULT 0,
	extends TEXT,
	tokens TEXT NOT NULL,
	updated_at INTEGER,
	created_at INTEGER
);

CREATE INDEX IF NOT EXISTS themes_domain_index ON themes(domain);
CREATE INDEX IF NOT EXISTS themes_default_index ON themes(is_default);
CREATE UNIQUE INDEX IF NOT EXISTS themes_domain_default_unique ON themes(domain, is_default) WHERE is_default = 1;

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT(100) NOT NULL,
    slug TEXT(100) NOT NULL,
    description TEXT,
    color TEXT(7),
    -- Hex color code (#RRGGBB)
    category TEXT(50),
    -- e.g., 'skill', 'interest', 'topic', 'genre'
    weight REAL DEFAULT 1.0,
    -- For weighted scoring in affinity calculations
    is_active INTEGER NOT NULL DEFAULT 1,
    -- Boolean: 1=active, 0=inactive
    created INTEGER NOT NULL DEFAULT (unixepoch()),
    -- Unix timestamp
    updated INTEGER NOT NULL DEFAULT (unixepoch()),
    -- Unix timestamp
    updated_by TEXT(64) -- User ID who last updated
);

-- ===== TAGGABLES TABLE (Junction Table) =====
CREATE TABLE taggables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id INTEGER NOT NULL,
    module TEXT(50) NOT NULL,
    -- Entity type: 'user', 'post', 'product', etc.
    id_object TEXT(64) NOT NULL,
    -- ID of the tagged entity
    relevance_score REAL DEFAULT 1.0,
    -- How relevant is this tag to this entity (0.0-1.0)
    created INTEGER NOT NULL DEFAULT (unixepoch()),
    -- Unix timestamp
    updated INTEGER NOT NULL DEFAULT (unixepoch()),
    -- Unix timestamp
    updated_by TEXT(64),
    -- User ID who applied/updated the tag
    auto_tagged INTEGER DEFAULT 0,
    -- Boolean: 1=auto-generated, 0=manual
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ===== UNIQUE CONSTRAINTS =====
-- Tags must have unique names and slugs
CREATE UNIQUE INDEX tags_name_unique ON tags(name);

CREATE UNIQUE INDEX tags_slug_unique ON tags(slug);

-- Prevent duplicate tags on same entity
CREATE UNIQUE INDEX taggables_entity_tag_unique ON taggables(module, id_object, tag_id);

-- ===== PERFORMANCE INDEXES =====
-- Tags table indexes
CREATE INDEX tags_category_index ON tags(category);

CREATE INDEX tags_active_index ON tags(is_active);

CREATE INDEX tags_weight_index ON tags(weight);

CREATE INDEX tags_updated_index ON tags(updated);

CREATE INDEX tags_updated_by_index ON tags(updated_by);

-- Taggables table indexes for common queries
CREATE INDEX taggables_tag_index ON taggables(tag_id);

CREATE INDEX taggables_entity_index ON taggables(module, id_object);

CREATE INDEX taggables_module_index ON taggables(module);

CREATE INDEX taggables_relevance_index ON taggables(relevance_score);

CREATE INDEX taggables_updated_by_index ON taggables(updated_by);

CREATE INDEX taggables_auto_tagged_index ON taggables(auto_tagged);

CREATE INDEX taggables_created_index ON taggables(created);

CREATE INDEX taggables_updated_index ON taggables(updated);

-- Composite indexes for affinity matching and complex queries
CREATE INDEX taggables_tag_relevance_index ON taggables(tag_id, relevance_score);

CREATE INDEX taggables_entity_relevance_index ON taggables(module, id_object, relevance_score);

CREATE INDEX taggables_module_relevance_index ON taggables(module, relevance_score);

-- ===== TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES =====
-- Update 'updated' timestamp when tags are modified
CREATE TRIGGER tags_updated_trigger
AFTER
UPDATE
    ON tags BEGIN
UPDATE
    tags
SET
    updated = unixepoch()
WHERE
    id = NEW.id;

END;

-- Update 'updated' timestamp when taggables are modified
CREATE TRIGGER taggables_updated_trigger
AFTER
UPDATE
    ON taggables BEGIN
UPDATE
    taggables
SET
    updated = unixepoch()
WHERE
    id = NEW.id;

END;

-- ===== VIEWS FOR COMMON QUERIES =====
-- View: Tag usage statistics
CREATE VIEW tag_usage_stats_view AS
SELECT
    t.id,
    t.name,
    t.slug,
    t.category,
    t.weight,
    COUNT(tg.id) as usage_count,
    AVG(tg.relevance_score) as avg_relevance,
    SUM(
        CASE
            WHEN tg.auto_tagged = 1 THEN 1
            ELSE 0
        END
    ) as auto_tagged_count,
    SUM(
        CASE
            WHEN tg.auto_tagged = 0 THEN 1
            ELSE 0
        END
    ) as manual_tagged_count,
    MAX(tg.created) as last_used
FROM
    tags t
    LEFT JOIN taggables tg ON t.id = tg.tag_id
WHERE
    t.is_active = 1
GROUP BY
    t.id,
    t.name,
    t.slug,
    t.category,
    t.weight
ORDER BY
    usage_count DESC;

-- View: Module statistics
CREATE VIEW tag_module_stats_view AS
SELECT
    module,
    COUNT(DISTINCT id_object) as unique_objects,
    COUNT(*) as total_tags,
    AVG(relevance_score) as avg_relevance,
    COUNT(DISTINCT tag_id) as unique_tags_used,
    SUM(
        CASE
            WHEN auto_tagged = 1 THEN 1
            ELSE 0
        END
    ) as auto_tagged_count,
    MIN(created) as first_tagged,
    MAX(created) as last_tagged
FROM
    taggables
GROUP BY
    module
ORDER BY
    total_tags DESC;

-- View: Objects with tag counts
CREATE VIEW tag_object_counts_view AS
SELECT
    module,
    id_object,
    COUNT(*) as tag_count,
    AVG(relevance_score) as avg_relevance,
    GROUP_CONCAT(t.name) as tag_names,
    GROUP_CONCAT(t.slug) as tag_slugs,
    MAX(tg.created) as last_tagged
FROM
    taggables tg
    JOIN tags t ON tg.tag_id = t.id
WHERE
    t.is_active = 1
GROUP BY
    module,
    id_object
ORDER BY
    tag_count DESC;
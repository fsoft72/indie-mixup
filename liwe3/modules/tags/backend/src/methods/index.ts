/**
 * @fileoverview Re-exports all tag methods and types
 */

// Tag management
export { tag_add, type TagAddParams, type TagAddResult } from './tag-add';
export { tag_object, type TagObjectParams, type TagObjectResult } from './tag-object';
export { tag_remove_object, type TagRemoveParams, type TagRemoveResult } from './tag-remove-object';
export { tag_update_relevance, type UpdateTagRelevanceParams, type TagUpdateRelevanceResult } from './tag-update-relevance';

// Tag listing and search
export { tag_list, type TagListParams, type TagListResult } from './tag-list';
export { tag_list_by_object, type TagListByObjectParams, type TagListByObjectResult } from './tag-list-by-object';
export { tag_search, type TagSearchParams, type TagSearchResult } from './tag-search';
export { tag_stats, type TagStatsParams, type TagStatsResult } from './tag-stats';
export { tag_list_by_module, type TagListByModuleParams, type TagListByModuleResult } from './tag-list-by-module';

// Bulk operations
export { tag_bulk_add, type TagBulkAddParams, type TagBulkAddResult } from './tag-bulk-add';
export { tag_bulk_remove, type TagBulkRemoveParams, type TagBulkRemoveResult } from './tag-bulk-remove';

// Advanced search and affinity
export { tag_find_by_tags, type TagFindByTagsParams, type TagFindByTagsResult } from './tag-find-by-tags';
export { tag_find_by_affinity, type TagFindByAffinityParams, type TagFindByAffinityResult } from './tag-find-by-affinity';

// Tag management
export { tag_merge, type TagMergeParams, type TagMergeResult } from './tag-merge';

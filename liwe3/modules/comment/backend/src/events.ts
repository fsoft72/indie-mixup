// A comment has been added  (module, id_obj, id comment)
export const COMMENT_EVENT_ADD = 'comment.add';

// A comment has been deleted (id comment)
export const COMMENT_EVENT_DEL = 'comment.del';

// Count the comments of one or more objects (callable by other modules). Payload: { domain: string, module: string, ids: string[] }. Returns { counts: Record<string, number> }, one entry per requested id (0 when the object has no comments). Only comments of the given domain and module are counted
export const COMMENT_CALL_COUNT = 'comment.call.count';

// Callable (MCP tools): forwards the payload (same params as comments_list) to the comments_list method with the caller ctx and returns its response untouched
export const COMMENT_CALL_LIST = 'comment.call.list';

// Callable (MCP tools): forwards the payload (same params as comment_add) to the comment_add method with the caller ctx and returns its response untouched
export const COMMENT_CALL_ADD = 'comment.call.add';

// Callable (MCP tools): forwards the payload (same params as comment_del) to the comment_del method with the caller ctx and returns its response untouched
export const COMMENT_CALL_DEL = 'comment.call.del';

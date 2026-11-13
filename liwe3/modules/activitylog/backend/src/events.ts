// Add a new event to the system
export const ACTIVITYLOG_CALL_EVENT_ADD = 'activitylog.call.event.add';

// Lists the events of one object. Payload: domain, module, id_obj, offset?, limit?, sort? (`asc` | `desc`, default `desc`). Returns { events : ActivityLogEvent[] } with `data` included.
export const ACTIVITYLOG_CALL_EVENT_LIST = 'activitylog.call.event.list';

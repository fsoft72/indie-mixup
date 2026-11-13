# Notifier Module - Implementation Summary

## Overview

The Notifier module has been successfully implemented for the GDPR monorepo. It provides a complete notification system with event-driven creation, user preferences, snooze/dismiss functionality, and toast-based UI delivery.

## Implementation Details

### Backend Module (@backend/modules/notifier)

#### 1. Database Schema (schema.ts)

- **notifications** table: Stores all notifications with status tracking
  - Fields: id, id_user, event_type, title, message, status, snooze_until, data, notification_type, domain
  - Status values: 'pending', 'dismissed', 'snoozed', 'shown'
  - Notification types: 'info', 'success', 'warning', 'error'

- **notification_settings** table: User preferences for event types
  - Fields: id, id_user, event_type, enabled, domain

#### 2. API Endpoints (index.ts)

- `GET /api/notifier/list` - Get pending notifications (auto-marks as 'shown')
- `POST /api/notifier/dismiss` - Permanently dismiss a notification
- `POST /api/notifier/snooze` - Snooze notification (default: 7 days)
- `GET /api/notifier/settings` - Get user notification preferences
- `PUT /api/notifier/settings` - Update event type enable/disable

#### 3. Methods (methods/*.ts)

- **notifier-list.ts**: Retrieves pending/unsnoozed notifications
- **notifier-dismiss.ts**: Marks notification as dismissed, emits event
- **notifier-snooze.ts**: Sets snooze_until timestamp, emits event
- **notifier-settings-get.ts**: Returns user's notification settings
- **notifier-settings-update.ts**: Creates/updates event type preferences

#### 4. Event System (listeners.ts, events.ts)

- **Event Listener**: `notifier.create` - Other modules call this to create notifications
- **Event Emitters**:
  - `notifier.created` - Emitted when notification is created
  - `notifier.dismissed` - Emitted when notification is dismissed
  - `notifier.snoozed` - Emitted when notification is snoozed
- **User Preference Check**: Automatically skips notifications for disabled event types

#### 5. Permissions (perms.ts)

- `notifier.list`
- `notifier.dismiss`
- `notifier.snooze`
- `notifier.settings_view`
- `notifier.settings_update`

### Frontend Integration (@apps/gdpr/frontend)

#### 1. Notifier Service (src/lib/notifier.ts)

- **Polling System**: Fetches new notifications every 30 seconds
- **Toast Display**: Uses @liwe3/webcomponents-svelte Toasts component
- **Toast Duration**: 2 minutes (120,000ms) before auto-dismiss
- **Action Buttons**: Dynamically adds "Dismiss" and "Remind me later" buttons to each toast
- **Lifecycle Management**: start(), stop(), setPollingInterval()
- **Settings Management**: getSettings(), updateSetting()

#### 2. Layout Integration (src/routes/+layout.svelte)

- Imports notifierService
- Starts polling onMount (after user login)
- Stops polling onDestroy
- Toasts component already present (no changes needed)

### Integration with Main App

#### GDPR Worker (@apps/gdpr/worker/src/index.ts)

- Added `import { module_init as notifier_init } from '@backend/modules/notifier';`
- Added `await notifier_init( app );` to module initialization sequence

### Database Migration (sql/notifier.sql)

- Complete SQL schema for both tables
- Indexes on critical fields (id_user, domain, status, event_type)
- Ready for database migration

## How It Works

### 1. Creating Notifications (From Any Module)

```typescript
import { liwe_event_call } from '@backend/liwe3/core';

await liwe_event_call( app, 'notifier.create', {
	id_user: user.id,
	event_type: 'comment.mention',
	title: 'New Mention',
	message: 'You were mentioned in a comment',
	notification_type: 'info',
	data: { id_comment: 'cmt_123' },
	domain: user.domain,
} );
```

### 2. User Experience Flow

1. **Backend creates notification** → Stored as 'pending' in database
2. **Frontend polls** (every 30 seconds) → GET /api/notifier/list
3. **Backend returns notifications** → Marks them as 'shown'
4. **Frontend displays toast** → Shows for 2 minutes with action buttons
5. **User actions**:
   - Click "Dismiss" → Marks as 'dismissed', never shown again
   - Click "Remind me later" → Marks as 'snoozed' for 7 days
   - Ignore → Toast auto-dismisses after 2 minutes, won't show again

### 3. User Preferences

Users can disable specific event types via settings:

```typescript
await notifierService.updateSetting( 'comment.mention', false );
```

When disabled, notifications for that event_type are automatically skipped during creation.

## Key Features Implemented

✅ **Generic event-driven system** - Works with any event type\
✅ **Polling-based delivery** - 30-second intervals\
✅ **Toast notifications** - 2-minute display duration\
✅ **Dismiss functionality** - Permanent dismissal\
✅ **Snooze functionality** - Default 7 days\
✅ **User preferences** - Enable/disable event types\
✅ **Multi-tenant support** - Domain-scoped\
✅ **Permission-based access** - Full permission control\
✅ **Event emission** - Other modules can listen to notifier events

## Configuration

### Backend Defaults

- **Status lifecycle**: pending → shown → dismissed/snoozed
- **Snooze default**: 7 days

### Frontend Defaults

- **Polling interval**: 30 seconds
- **Toast duration**: 2 minutes (120 seconds)

### Customization

To change polling interval:

```typescript
notifierService.setPollingInterval( 60000 ); // 60 seconds
```

To change toast duration, edit `@apps/gdpr/frontend/src/lib/notifier.ts`:

```typescript
private toastDuration: number = 180000; // 3 minutes
```

## Testing

### Manual Test

1. Create a test notification using any method or direct API call
2. Wait up to 30 seconds for polling
3. Toast appears with title, message, and action buttons
4. Click "Dismiss" or "Remind me later"
5. Verify notification status in database

### Example Test Code

```typescript
// Add to any module for testing
app.hono.post( '/api/test/notification', async ( c : Context ) => {
	const user = await app.user;
	await liwe_event_call( app, 'notifier.create', {
		id_user: user.id,
		event_type: 'test.ping',
		title: 'Test Notification',
		message: 'This is a test',
		notification_type: 'info',
		domain: user.domain,
	} );
	return c.json( { success: true } );
} );
```

## Files Created/Modified

### New Files

- `@backend/modules/notifier/src/schema.ts`
- `@backend/modules/notifier/src/types.ts`
- `@backend/modules/notifier/src/perms.ts`
- `@backend/modules/notifier/src/events.ts`
- `@backend/modules/notifier/src/listeners.ts`
- `@backend/modules/notifier/src/methods/*.ts` (5 methods)
- `@backend/modules/notifier/src/methods.ts`
- `@backend/modules/notifier/src/index.ts`
- `@backend/modules/notifier/package.json`
- `@backend/modules/notifier/tsconfig.json`
- `@backend/modules/notifier/vitest.config.ts`
- `@backend/modules/notifier/sql/notifier.sql`
- `@backend/modules/notifier/README.md`
- `@apps/gdpr/frontend/src/lib/notifier.ts`

### Modified Files

- `@apps/gdpr/worker/src/index.ts` (added notifier module initialization)
- `@apps/gdpr/frontend/src/routes/+layout.svelte` (added notifier service start/stop)

## Next Steps

1. **Apply database migration**: Run `sql/notifier.sql` on your database
2. **Build the project**: `pnpm build`
3. **Test the system**: Create test notifications and verify delivery
4. **Add to other modules**: Use `liwe_event_call(app, 'notifier.create', ...)` in other modules
5. **Customize**: Adjust polling interval, toast duration, or snooze defaults as needed

## Documentation

Complete documentation is available in:

- `@backend/modules/notifier/README.md` - Comprehensive usage guide
- This file - Implementation summary

## Compliance

✅ **Generic system** - Not tied to specific events\
✅ **Default snooze**: 7 days\
✅ **Polling-based**: 30-second intervals\
✅ **Auto-dismiss**: 2 minutes\
✅ **User actions**: Dismiss and Remind me later\
✅ **Multi-tenant**: Domain-scoped architecture

The notifier module is complete and ready for use!

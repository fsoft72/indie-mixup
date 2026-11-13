# Notifier Module

The Notifier module provides a system for handling event-driven notifications with user preferences and flexible delivery options.

## Features

- 🔔 **Event-driven notifications** - Other modules can emit events to create notifications
- ⏰ **Snooze functionality** - Users can postpone notifications (default: 7 days)
- 🚫 **Dismiss permanently** - Users can dismiss notifications they don't want to see again
- ⚙️ **User preferences** - Users can configure which event types trigger notifications
- 🎨 **Toast UI** - Notifications displayed as toasts with customizable duration (2 minutes)
- 🔄 **Polling system** - Frontend polls for new notifications every 30 seconds
- 🌐 **Multi-tenant** - Domain-scoped notifications

## Backend API

### Endpoints

#### GET `/api/notifier/list`

Get pending notifications for the current user.

**Query Parameters:**

- `limit` (optional, default: 10) - Maximum number of notifications to return

**Response:**

```json
{
	"success": true,
	"data": [
		{
			"id": "ntf_...",
			"id_user": "usr_...",
			"event_type": "comment.mention",
			"title": "New Comment",
			"message": "You were mentioned in a comment",
			"status": "pending",
			"notification_type": "info",
			"data": { "id_comment": "cmt_..." },
			"domain": "mydomain"
		}
	]
}
```

#### POST `/api/notifier/dismiss`

Permanently dismiss a notification.

**Body:**

```json
{
	"id": "ntf_..."
}
```

#### POST `/api/notifier/snooze`

Snooze a notification for a specified number of days.

**Body:**

```json
{
	"id": "ntf_...",
	"days": 7 // optional, default: 7
}
```

#### GET `/api/notifier/settings`

Get notification settings for the current user.

#### PUT `/api/notifier/settings`

Update notification setting for an event type.

**Body:**

```json
{
	"event_type": "comment.mention",
	"enabled": true
}
```

## Creating Notifications from Other Modules

Other modules can create notifications by calling the `notifier.create` event:

### Example: User Module

```typescript
import { liwe_event_call } from '@backend/liwe3/core';

// In your module method
await liwe_event_call( app, 'notifier.create', {
	id_user: user.id,
	event_type: 'user.password_expiring',
	title: 'Password Expiring Soon',
	message: 'Your password will expire in 7 days. Please update it.',
	notification_type: 'warning',
	data: {
		days_remaining: 7,
	},
	domain: user.domain,
} );
```

### Example: Comment Module

```typescript
// When a user is mentioned in a comment
await liwe_event_call( app, 'notifier.create', {
	id_user: mentioned_user.id,
	event_type: 'comment.mention',
	title: 'You were mentioned',
	message: `${author.username} mentioned you in a comment`,
	notification_type: 'info',
	data: {
		id_comment: comment.id,
		id_author: author.id,
	},
	domain: comment.domain,
} );
```

### Example: System Module

```typescript
// System maintenance notification
await liwe_event_call( app, 'notifier.create', {
	id_user: user.id,
	event_type: 'system.maintenance',
	title: 'Scheduled Maintenance',
	message: 'System maintenance scheduled for tonight at 10 PM EST',
	notification_type: 'warning',
	data: {
		scheduled_time: '2026-03-13T22:00:00Z',
	},
	domain: user.domain,
} );
```

## Frontend Integration

### Automatic Polling

The notifier service is automatically initialized in the main layout and polls for notifications every 30 seconds when a user is logged in.

### Manual Usage

```typescript
import { notifierService } from '$lib/notifier';

// Start polling (already done in layout)
notifierService.start();

// Stop polling
notifierService.stop();

// Change polling interval (default: 30 seconds)
notifierService.setPollingInterval( 60000 ); // 60 seconds

// Get user settings
const settings = await notifierService.getSettings();

// Update a setting
await notifierService.updateSetting( 'comment.mention', false );

// Manually dismiss a notification
await notifierService.dismissNotification( 'ntf_...' );

// Manually snooze a notification
await notifierService.snoozeNotification( 'ntf_...', 14 ); // 14 days
```

## Notification Types

The system supports four notification types that affect the toast appearance:

- `info` - Blue/informational
- `success` - Green/positive
- `warning` - Yellow/caution
- `error` - Red/critical

## Event Types (Examples)

Common event types you might use:

- `user.login` - User logged in
- `user.password_expiring` - Password expiration warning
- `comment.mention` - User mentioned in comment
- `comment.reply` - Reply to user's comment
- `system.maintenance` - System maintenance notice
- `system.update` - New feature announcement
- `gdpr.expiring` - GDPR consent expiring
- `license.expiring` - License expiring soon

Event types are arbitrary strings - you define them based on your needs.

## Database Schema

### notifications table

| Column            | Type         | Description                                |
| ----------------- | ------------ | ------------------------------------------ |
| id                | VARCHAR(64)  | Primary key                                |
| id_user           | VARCHAR(64)  | User to notify                             |
| event_type        | VARCHAR(200) | Event that triggered notification          |
| title             | TEXT         | Notification title                         |
| message           | TEXT         | Notification message                       |
| status            | VARCHAR(20)  | 'pending', 'dismissed', 'snoozed', 'shown' |
| snooze_until      | INTEGER      | Unix timestamp when snooze expires         |
| data              | TEXT         | JSON with additional data                  |
| notification_type | VARCHAR(20)  | 'info', 'success', 'warning', 'error'      |
| domain            | VARCHAR(200) | Multi-tenant domain                        |
| created           | DATETIME     | Creation timestamp                         |
| updated           | DATETIME     | Update timestamp                           |

### notification_settings table

| Column     | Type         | Description               |
| ---------- | ------------ | ------------------------- |
| id         | VARCHAR(64)  | Primary key               |
| id_user    | VARCHAR(64)  | User ID                   |
| event_type | VARCHAR(200) | Event type to configure   |
| enabled    | INTEGER      | 1 = enabled, 0 = disabled |
| domain     | VARCHAR(200) | Multi-tenant domain       |
| created    | DATETIME     | Creation timestamp        |
| updated    | DATETIME     | Update timestamp          |

## Permissions

- `notifier.list` - Can list notifications
- `notifier.dismiss` - Can dismiss notifications
- `notifier.snooze` - Can snooze notifications
- `notifier.settings_view` - Can view notification settings
- `notifier.settings_update` - Can update notification settings

## Configuration

Default values:

- **Polling interval**: 30 seconds
- **Toast duration**: 2 minutes (120 seconds)
- **Default snooze period**: 7 days

These can be adjusted in the frontend service (`@apps/gdpr/frontend/src/lib/notifier.ts`).

## Testing

To test the notification system:

1. Create a test notification via API or event call
2. Wait up to 30 seconds for polling to fetch it
3. Toast should appear with "Dismiss" and "Remind me later" buttons
4. Test both actions to verify functionality

Example test endpoint (add to any module):

```typescript
app.hono.post( '/api/test/notification', async ( c : Context ) => {
	const user = await app.user;
	if ( !user ) return c.json( { success: false } );

	await liwe_event_call( app, 'notifier.create', {
		id_user: user.id,
		event_type: 'test.notification',
		title: 'Test Notification',
		message: 'This is a test notification',
		notification_type: 'info',
		domain: user.domain,
	} );

	return c.json( { success: true } );
} );
```

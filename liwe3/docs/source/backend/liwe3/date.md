# date.ts

Date formatting and manipulation utilities.

## Overview

The `date` module provides functions for formatting dates into specific string formats and converting dates to international format (YYYY-MM-DD).

## Functions

### `date_format()`

Converts a date into a formatted string with customizable patterns.

```typescript
const date_format = (
  date: any,
  format?: string
): string
```

**Parameters:**

- `date` - Date to format (accepts Date object, timestamp, or date string)
- `format` - Format pattern (default: `'yyyy-mm-dd HH:MM:SS'`)

**Returns:** Formatted date string, or empty string if date is invalid

**Format Tokens:**

- `yyyy` - Full year (e.g., 2024)
- `mm` - Month with zero-padding (01-12)
- `dd` - Day with zero-padding (01-31)
- `HH` - Hours with zero-padding (00-23)
- `MM` - Minutes with zero-padding (00-59)
- `SS` - Seconds with zero-padding (00-59)

**Examples:**

```typescript
import { date_format } from '@backend/liwe3/core';

const date = new Date( '2024-03-15T14:30:45' );

date_format( date );
// '2024-03-15 14:30:45'

date_format( date, 'dd/mm/yyyy' );
// '15/03/2024'

date_format( date, 'yyyy-mm-dd HH:MM' );
// '2024-03-15 14:30'

date_format( date, 'HH:MM:SS' );
// '14:30:45'

// Invalid date returns empty string
date_format( null );
// ''

date_format( 'invalid' );
// ''
```

### `date_get()`

Returns a date in international ISO format (YYYY-MM-DD).

```typescript
const date_get = (d: Date): string
```

**Parameters:**

- `d` - Date object to convert

**Returns:** Date string in YYYY-MM-DD format with zero-padded month

**Example:**

```typescript
import { date_get } from '@backend/liwe3/core';

const date = new Date( '2024-03-05' );
date_get( date );
// '2024-03-05'

const today = new Date();
date_get( today );
// '2024-10-07' (current date)
```

## Use Cases

### API Response Formatting

```typescript
import { date_format } from '@backend/liwe3/core';

const user = await app.db.select().from( users ).where( eq( users.id, userId ) ).get();

return responseSuccess( {
	...user,
	createdAt: date_format( user.createdAt, 'yyyy-mm-dd HH:MM:SS' ),
	lastLogin: date_format( user.lastLogin, 'yyyy-mm-dd' ),
} );
```

### Log Timestamps

```typescript
import { date_format } from '@backend/liwe3/core';

const logEntry = {
	timestamp: date_format( new Date(), 'yyyy-mm-dd HH:MM:SS' ),
	level: 'INFO',
	message: 'User logged in',
};

console.log( `[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}` );
// [2024-10-07 14:30:45] INFO: User logged in
```

### Date Comparison

```typescript
import { date_get } from '@backend/liwe3/core';

const today = date_get( new Date() );
const expiryDate = date_get( new Date( subscription.expiresAt ) );

if ( expiryDate < today ) {
	console.log( 'Subscription expired' );
}
```

### Database Storage

```typescript
import { date_format, date_get } from '@backend/liwe3/core';

// Store dates in YYYY-MM-DD format
await app.db.insert( events ).values( {
	id: await mkid( 'evt' ),
	title: 'Meeting',
	date: date_get( new Date( '2024-03-15' ) ),
} );

// Display with custom format
const event = await app.db.select().from( events ).where( eq( events.id, eventId ) ).get();
console.log( `Event on ${date_format( event.date, 'dd/mm/yyyy' )}` );
// Event on 15/03/2024
```

### Custom Display Formats

```typescript
import { date_format } from '@backend/liwe3/core';

const timestamp = new Date();

// European format
const eu = date_format( timestamp, 'dd/mm/yyyy HH:MM' );
// 07/10/2024 14:30

// US format
const us = date_format( timestamp, 'mm/dd/yyyy HH:MM' );
// 10/07/2024 14:30

// Time only
const time = date_format( timestamp, 'HH:MM:SS' );
// 14:30:45

// Date only
const dateOnly = date_format( timestamp, 'yyyy-mm-dd' );
// 2024-10-07
```

## Implementation Notes

- All number values are zero-padded (e.g., `05` instead of `5`)
- Invalid dates return empty string instead of throwing errors
- `null` and `undefined` values are treated as invalid dates
- Month values are 1-indexed (January = 01, December = 12)
- Uses JavaScript's native `Date` object

## Best Practices

1. **Validate dates before formatting** - Check for valid Date objects
2. **Use consistent formats** - Stick to one format throughout your application
3. **Store dates in ISO format** - Use `date_get()` for database storage
4. **Display dates in user's locale** - Use `date_format()` with appropriate patterns
5. **Handle invalid dates gracefully** - Functions return empty strings for invalid input

## Related

- [conv.ts](./conv.md) - Type conversion utilities
- [utils.ts](./utils.md) - General utility functions

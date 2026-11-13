# conv.ts

Type conversion and formatting utilities for common data transformations.

## Overview

The `conv` module provides utility functions for converting between data types, formatting numbers as currency, creating slugs from strings, and encoding/decoding base-96 numbers.

## Functions

### Type Conversion

#### `int()`

Converts a value to an integer, returning 0 for falsy values.

```typescript
const int = (s: any): number
```

**Parameters:**

- `s` - Value to convert (any type)

**Returns:** Integer value, or 0 if falsy/undefined

**Examples:**

```typescript
import { int } from '@backend/liwe3/core';

int( '123' ); // 123
int( '45.67' ); // 45
int( null ); // 0
int( undefined ); // 0
int( '' ); // 0
```

#### `float()`

Converts a value to a floating-point number, returning 0.0 for falsy values.

```typescript
const float = (s: any): number
```

**Parameters:**

- `s` - Value to convert (any type)

**Returns:** Float value, or 0.0 if falsy

**Examples:**

```typescript
import { float } from '@backend/liwe3/core';

float( '123.45' ); // 123.45
float( '67' ); // 67.0
float( null ); // 0.0
float( '' ); // 0.0
```

### String Formatting

#### `slugify()`

Converts a string to a URL-friendly slug.

```typescript
const slugify = (str: string): string
```

**Parameters:**

- `str` - String to convert to slug

**Returns:** Lowercase slug with hyphens

**Behavior:**

1. Trims leading/trailing whitespace
2. Converts to lowercase
3. Replaces accented characters with ASCII equivalents
4. Removes special characters
5. Replaces spaces with hyphens
6. Collapses multiple hyphens

**Examples:**

```typescript
import { slugify } from '@backend/liwe3/core';

slugify( 'Hello World' ); // 'hello-world'
slugify( 'Café & Restaurant' ); // 'cafe-restaurant'
slugify( '  Multiple   Spaces  ' ); // 'multiple-spaces'
slugify( 'São Paulo, Brasil' ); // 'sao-paulo-brasil'
```

**Supported Character Replacements:**

- À, Á, Ä, Â, Ã, Å → a
- È, É, Ë, Ê → e
- Ì, Í, Ï, Î → i
- Ò, Ó, Ö, Ô, Õ, Ø → o
- Ù, Ú, Ü, Û → u
- Ñ → n
- Ç → c
- ß → ss

### Number Formatting

#### `formatCurrency()`

Formats a number as a currency string with thousand separators.

```typescript
const formatCurrency = (
  number: number,
  options?: {
    thousandSeparator?: string;
    decimalSeparator?: string;
  }
): string
```

**Parameters:**

- `number` - Number to format (accepts number or string)
- `options.thousandSeparator` - Character for thousands (default: `'.'`)
- `options.decimalSeparator` - Character for decimals (default: `','`)

**Returns:** Formatted currency string with 2 decimal places

**Examples:**

```typescript
import { formatCurrency } from '@backend/liwe3/core';

// Default (European format)
formatCurrency( 1234.56 ); // '1.234,56'
formatCurrency( 1000000 ); // '1.000.000,00'

// US format
formatCurrency( 1234.56, {
	thousandSeparator: ',',
	decimalSeparator: '.',
} ); // '1,234.56'

// No thousand separator
formatCurrency( 1234.56, {
	thousandSeparator: '',
	decimalSeparator: '.',
} ); // '1234.56'
```

#### `toNumDecimal()`

Rounds a number to a fixed number of decimal places.

```typescript
const toNumDecimal = (num: number, dec: number): number
```

**Parameters:**

- `num` - Number to round
- `dec` - Number of decimal places

**Returns:** Number rounded to specified decimal places

**Examples:**

```typescript
import { toNumDecimal } from '@backend/liwe3/core';

toNumDecimal( 3.14159, 2 ); // 3.14
toNumDecimal( 10.5, 0 ); // 11
toNumDecimal( 1.005, 2 ); // 1.01
```

### Base-96 Encoding

#### `decimalToBase96()`

Converts a decimal number to base-96 string representation.

```typescript
const decimalToBase96 = (decimal: number): string
```

**Parameters:**

- `decimal` - Decimal number to convert

**Returns:** Base-96 encoded string

**Character Set:** Uses 96 printable ASCII characters:

```
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
```

**Examples:**

```typescript
import { decimalToBase96 } from '@backend/liwe3/core';

decimalToBase96( 0 ); // 'A'
decimalToBase96( 95 ); // '~'
decimalToBase96( 96 ); // 'BA'
decimalToBase96( 1000 ); // 'Km'
```

#### `base96ToDecimal()`

Converts a base-96 string back to decimal.

```typescript
const base96ToDecimal = (base96: string): number
```

**Parameters:**

- `base96` - Base-96 encoded string

**Returns:** Decimal number

**Examples:**

```typescript
import { base96ToDecimal } from '@backend/liwe3/core';

base96ToDecimal( 'A' ); // 0
base96ToDecimal( '~' ); // 95
base96ToDecimal( 'BA' ); // 96
base96ToDecimal( 'Km' ); // 1000
```

## Use Cases

### URL Slug Generation

```typescript
import { slugify } from '@backend/liwe3/core';

const title = 'My Blog Post: A Guide to TypeScript!';
const slug = slugify( title );
// 'my-blog-post-a-guide-to-typescript'

const url = `/blog/${slug}`;
```

### Price Formatting

```typescript
import { formatCurrency } from '@backend/liwe3/core';

const products = [
	{ name: 'Widget', price: 29.99 },
	{ name: 'Gadget', price: 149.50 },
];

products.forEach( ( p ) => {
	console.log( `${p.name}: €${formatCurrency( p.price )}` );
} );
// Widget: €29,99
// Gadget: €149,50
```

### Query Parameter Parsing

```typescript
import { float, int } from '@backend/liwe3/core';

const params = {
	page: int( request.query.page ), // Safely convert to int
	limit: int( request.query.limit ),
	price: float( request.query.price ),
};
```

### Compact Number Encoding

```typescript
import { base96ToDecimal, decimalToBase96 } from '@backend/liwe3/core';

// Encode timestamp for shorter URLs
const timestamp = Date.now();
const encoded = decimalToBase96( timestamp );
const url = `/share/${encoded}`;

// Decode later
const decoded = base96ToDecimal( encoded );
```

## Best Practices

1. **Use `int()` and `float()` for user inputs** - Safely handles null/undefined values
2. **Always slugify user-generated URLs** - Ensures consistent, URL-safe strings
3. **Format currency on display** - Never store formatted strings in database
4. **Base-96 for compact IDs** - More efficient than base-64 for short encodings

## Related

- [mkid.ts](./mkid.md) - ID generation utilities
- [utils.ts](./utils.md) - Additional utility functions

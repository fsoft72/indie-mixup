# config.ts

Configuration management with template variable resolution for environment-specific settings.

## Overview

The `config` module provides a powerful configuration system that:

- Loads configuration from JSON
- Resolves template variables (e.g., `{{JWT_SECRET}}`) from environment
- Supports default values and type conversion
- Validates required variables
- Extracts and lists all template variables

## Types

### `AppConfig`

Standard application configuration structure.

```typescript
type AppConfig = {
	jwt : JWTConfig;
	site : SiteConfig;
	user? : UserConfig;
	[key : string] : any; // Additional module configs
};
```

### `UserConfig`

Settings of the `user` module.

```typescript
type UserConfig = {
	passwordMaxAgeDays? : number; // Days after which a password must be changed. 0 or missing: never expires
};
```

See `liwe3/modules/user/docs/password-expiry.md`.

### `JWTConfig`

JWT authentication configuration.

```typescript
type JWTConfig = {
	secret : string; // JWT secret key (from {{JWT_SECRET}})
	expiresIn : string; // Token expiry (e.g., "1h", "24h", "7d")
};
```

### `SiteConfig`

General site configuration.

```typescript
type SiteConfig = {
	name : string; // Site name
	secret : string; // Site secret (from {{SITE_SECRET}})
	debugKey : string; // Debug access key (from {{DEBUG_KEY}})
	adminKey : string; // Admin key (from {{ADMIN_KEY}})
};
```

### `ConfigTemplateOptions`

Options for template variable resolution.

```typescript
type ConfigTemplateOptions = {
	env? : Record<string, any>; // Environment variables
	strict? : boolean; // Throw error if variable missing (default: true)
	defaults? : Record<string, string>; // Default values for variables
};
```

### `ConfigLoadResult<T>`

Result of configuration loading.

```typescript
type ConfigLoadResult<T> = {
	config : T; // Resolved configuration
	resolvedVariables : string[]; // Variables that were resolved
	missingVariables : string[]; // Variables that couldn't be resolved
};
```

## Functions

### `configLoad()`

Loads and resolves configuration from a JavaScript object.

```typescript
const configLoad = <T = any>(
  configData: any,
  options?: ConfigTemplateOptions
): ConfigLoadResult<T>
```

**Parameters:**

- `configData` - Configuration object (parsed JSON)
- `options` - Template resolution options

**Returns:** Configuration load result

**Throws:** Error if `configData` is not an object

**Examples:**

```typescript
import { configLoad } from '@backend/liwe3/core';

const configData = {
	jwt: {
		secret: '{{JWT_SECRET}}',
		expiresIn: '24h',
	},
	site: {
		name: 'My App',
		secret: '{{SITE_SECRET}}',
	},
};

const result = configLoad( configData, {
	env: {
		JWT_SECRET: 'my-jwt-secret-123',
		SITE_SECRET: 'my-site-secret-456',
	},
	strict: true,
} );

console.log( result.config );
// {
//   jwt: { secret: 'my-jwt-secret-123', expiresIn: '24h' },
//   site: { name: 'My App', secret: 'my-site-secret-456' }
// }

console.log( result.resolvedVariables );
// ['JWT_SECRET', 'SITE_SECRET']
```

### `configLoadFromJSON()`

Loads configuration from a JSON string.

```typescript
const configLoadFromJSON = <T = any>(
  jsonString: string,
  options?: ConfigTemplateOptions
): ConfigLoadResult<T>
```

**Parameters:**

- `jsonString` - JSON configuration string
- `options` - Template resolution options

**Returns:** Configuration load result

**Throws:** Error if JSON parsing fails

**Examples:**

```typescript
import { configLoadFromJSON } from '@backend/liwe3/core';

const jsonConfig = `{
  "jwt": {
    "secret": "{{JWT_SECRET}}",
    "expiresIn": "{{JWT_EXPIRES_IN}}"
  },
  "features": {
    "debug": {{DEBUG_MODE}}
  }
}`;

const result = configLoadFromJSON( jsonConfig, {
	env: {
		JWT_SECRET: 'secret-key',
		JWT_EXPIRES_IN: '7d',
		DEBUG_MODE: 'true',
	},
} );

console.log( result.config );
// {
//   jwt: { secret: 'secret-key', expiresIn: '7d' },
//   features: { debug: true }  // Converted to boolean!
// }
```

### `templateValidation()`

Validates that all template variables can be resolved.

```typescript
const templateValidation = (
  configData: any,
  env?: Record<string, any>,
  defaults?: Record<string, string>
): string[]
```

**Parameters:**

- `configData` - Configuration object
- `env` - Environment variables
- `defaults` - Default values

**Returns:** Array of missing variable names (empty if all resolved)

**Examples:**

```typescript
import { templateValidation } from '@backend/liwe3/core';

const config = {
	jwt: {
		secret: '{{JWT_SECRET}}',
		key: '{{API_KEY}}',
	},
};

const missing = templateValidation( config, {
	JWT_SECRET: 'my-secret',
	// API_KEY is missing
} );

console.log( missing );
// ['API_KEY']

if ( missing.length > 0 ) {
	console.error( `Missing environment variables: ${missing.join( ', ' )}` );
}
```

### `templateExtractVars()`

Extracts all template variables from configuration.

```typescript
const templateExtractVars = (configData: any): string[]
```

**Parameters:**

- `configData` - Configuration object

**Returns:** Array of all template variable names found

**Examples:**

```typescript
import { templateExtractVars } from '@backend/liwe3/core';

const config = {
	jwt: { secret: '{{JWT_SECRET}}' },
	site: { secret: '{{SITE_SECRET}}', key: '{{API_KEY}}' },
	db: { url: '{{DATABASE_URL}}' },
};

const variables = templateExtractVars( config );

console.log( variables );
// ['JWT_SECRET', 'SITE_SECRET', 'API_KEY', 'DATABASE_URL']
```

### `createConfigLoader()`

Creates typed configuration loader functions.

```typescript
const createConfigLoader = <T>() => {
	return {
		loadConfig: ( configData : any, options? : ConfigTemplateOptions ) => ConfigLoadResult<T>,
		loadConfigFromJSON: ( jsonString : string, options? : ConfigTemplateOptions ) => ConfigLoadResult<T>,
	};
};
```

**Returns:** Object with typed loader functions

**Examples:**

```typescript
import { AppConfig, createConfigLoader } from '@backend/liwe3/core';

const loader = createConfigLoader<AppConfig>();

const result = loader.loadConfigFromJSON( jsonString, { env } );
// result.config is typed as AppConfig
```

## Template Variable Format

Template variables use the pattern: `{{VARIABLE_NAME}}`

**Rules:**

- Must start with uppercase letter or underscore
- Can contain uppercase letters, numbers, and underscores
- Examples: `{{JWT_SECRET}}`, `{{API_KEY}}`, `{{DB_URL}}`

## Type Conversion

String values are automatically converted to appropriate types:

| String Value | Converted Type | Example   |
| ------------ | -------------- | --------- |
| `"true"`     | boolean        | `true`    |
| `"false"`    | boolean        | `false`   |
| `"123"`      | number         | `123`     |
| `"45.67"`    | number         | `45.67`   |
| `"hello"`    | string         | `"hello"` |

**Examples:**

```typescript
const config = {
	features: {
		enabled: '{{FEATURE_ENABLED}}', // "true" → true
		maxUsers: '{{MAX_USERS}}', // "100" → 100
		ratio: '{{RATIO}}', // "0.5" → 0.5
	},
};

const result = configLoad( config, {
	env: {
		FEATURE_ENABLED: 'true',
		MAX_USERS: '100',
		RATIO: '0.5',
	},
} );

console.log( result.config.features );
// { enabled: true, maxUsers: 100, ratio: 0.5 }
```

## Use Cases

### Application Initialization

```typescript
import { configLoadFromJSON } from '@backend/liwe3/core';
import configJSON from './config.json';

const app = app_init( 'myapp', env );

// Load configuration with environment variables
const result = app.loadConfigFromString(
	JSON.stringify( configJSON ),
	{ env },
);

console.log( 'Resolved:', result.resolvedVariables );
console.log( 'Missing:', result.missingVariables );

// Access configuration
const jwtSecret = app.cfg.jwt.secret;
```

### Configuration File

```json
// config.json
{
  "jwt": {
    "secret": "{{JWT_SECRET}}",
    "expiresIn": "{{JWT_EXPIRES_IN}}"
  },
  "site": {
    "name": "My Application",
    "secret": "{{SITE_SECRET}}",
    "debugKey": "{{DEBUG_KEY}}",
    "adminKey": "{{ADMIN_KEY}}"
  },
  "features": {
    "enableAnalytics": {{ENABLE_ANALYTICS}},
    "maxUploadSize": {{MAX_UPLOAD_SIZE}}
  }
}
```

### Environment Variables (wrangler.toml)

```toml
# wrangler.toml
[vars]
JWT_EXPIRES_IN = "7d"

# Secrets (set via: wrangler secret put JWT_SECRET)
# - JWT_SECRET
# - SITE_SECRET
# - DEBUG_KEY
# - ADMIN_KEY
# - ENABLE_ANALYTICS
# - MAX_UPLOAD_SIZE
```

### Validation Before Deployment

```typescript
import { templateExtractVars, templateValidation } from '@backend/liwe3/core';
import configJSON from './config.json';

// List all required variables
const allVars = templateExtractVars( configJSON );
console.log( 'Required variables:', allVars );

// Check which are missing
const missing = templateValidation( configJSON, process.env );

if ( missing.length > 0 ) {
	console.error( 'Missing environment variables:' );
	missing.forEach( ( v ) => console.error( `  - ${v}` ) );
	process.exit( 1 );
}
```

### Default Values

```typescript
import { configLoad } from '@backend/liwe3/core';

const result = configLoad( configData, {
	env: process.env,
	defaults: {
		JWT_EXPIRES_IN: '24h', // Default if not in env
		MAX_UPLOAD_SIZE: '10485760', // 10MB
		ENABLE_ANALYTICS: 'false',
	},
} );
```

### Non-Strict Mode

```typescript
const result = configLoad( configData, {
	env: process.env,
	strict: false, // Don't throw error on missing variables
} );

// Check what couldn't be resolved
if ( result.missingVariables.length > 0 ) {
	console.warn( 'Missing variables:', result.missingVariables );
	// Variables remain as {{VAR_NAME}} in config
}
```

## Security Best Practices

1. **Never commit secrets** - Use environment variables for sensitive data
2. **Use Cloudflare Secrets** - Set via `wrangler secret put SECRET_NAME`
3. **Validate in CI/CD** - Check all variables before deployment
4. **Rotate secrets regularly** - Update JWT_SECRET periodically
5. **Use different secrets per environment** - dev, staging, production
6. **Document required variables** - List all template variables

## Error Handling

```typescript
import { configLoadFromJSON } from '@backend/liwe3/core';

try {
	const result = configLoadFromJSON( jsonString, {
		env,
		strict: true,
	} );

	console.log( 'Config loaded successfully' );
} catch ( error ) {
	if ( error.message.includes( 'not found' ) ) {
		console.error( 'Missing required environment variable' );
	} else if ( error.message.includes( 'parse' ) ) {
		console.error( 'Invalid JSON format' );
	} else {
		console.error( 'Config error:', error.message );
	}
}
```

## Related

- [app.ts](./app.md) - Application class with config loading
- [crypto.ts](./crypto.md) - JWT operations using config secrets
- [session.ts](./session.md) - Session management with config

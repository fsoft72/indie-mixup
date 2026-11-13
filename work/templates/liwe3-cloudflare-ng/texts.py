#!/usr/bin/env python3

texts = {
    # ==================================================================================
    # BACKEND TEXTS
    # ==================================================================================

    "INDEX_FILE_START": """import { LOGGED, type LiWEApp, PUBLIC, permissions_register, routeBody, routeGet } from '@backend/liwe3';
import { %(__methods)s } from './methods';
import { %(__perms_import)s } from './perms';

/*=== f2c_start _module ===*/
%(__module_snippet)s
/*=== f2c_end _module ===*/

// Module initialization function
export const module_init = async ( app: LiWEApp ) => {
	console.log( "=== Module: %(__mod_name)s" );

	/*=== f2c_start module_init ===*/
%(__module_init_snippet)s
	/*=== f2c_end module_init ===*/

""",
    "INDEX_FILE_END": """
	// Register %(__mod_name)s module permissions
	permissions_register( {
		module: '%(__mod_name)s',
		perms: %(__permissions_const)s
	} );
};
""",
    "ENDPOINT_GET": """\tapp.hono.get( '%(__path)s', routeGet( %(__method_name)s, { perms: %(__gate)s } ) );

""",
    "ENDPOINT_BODY": """\tapp.hono.%(method_lower)s( '%(__path)s', routeBody( %(__method_name)s, { perms: %(__gate)s } ) );

""",
    "PERMS_FILE_START": """/**
 * @fileoverview %(__mod_name_camel)s Module Permissions
 *
 * Defines all permissions available in the %(__mod_name)s module.
 * These permissions are registered with the global permissions system
 * during module initialization.
 */

import { SystemPermission } from '@backend/liwe3';

""",
    "PERMS_CONSTANTS_START": """// Permission constants
""",
    "PERMS_CONST_ROW": """export const %(const_name)s = '%(perm_name)s';
""",
    "PERMS_CONSTANTS_END": """
""",
    "PERMS_ARRAY_START": """/**
 * All permissions available in the %(__mod_name)s module
 */
export const %(__permissions_const)s: SystemPermission[] = [
""",
    "PERMS_FILE_END": """];
""",
    "PERMS_ROW": """\t{
\t\tname: %(name)s,
\t\tdescription: '%(description)s'
\t},
""",
    "METHOD_FILE_START": """import { z, LiWEApp, type LiWECtx, LiWEResponse, LiWESysParams, responseError, responseSuccess, eq, and, or, like, isNull, zodBoolean } from './utils';
import { ERR_UNAUTHORIZED, ERR_PERMISSION_DENIED, paramsValidation } from '@backend/liwe3';

""",
    "METHOD_SCHEMA_START": """/**
 * Schema for %(__schema_description)s
 *
%(__schema_properties)s
 */
const %(__schema_name)s = z.object( {
""",
    "METHOD_SCHEMA_FIELD": """\t%(name)s: %(zod_type)s,
""",
    "METHOD_SCHEMA_END": """} );

""",
    "METHOD_PARAMS_TYPE": """/** Parameters for %(__function_description)s */
export type %(__params_type)s = z.infer<typeof %(__schema_name)s>;

""",
    "METHOD_RESULT_TYPE": """/** Return type for %(__function_description)s */
export type %(__result_type)s = %(__result_fields)s;

""",
    "METHOD_HEADERS_BLOCK": """/*=== f2c_start %(__block_name)s ===*/
%(__snippet)s
/*=== f2c_end %(__block_name)s ===*/

""",
    "METHOD_FUNCTION_START": """/**
 * %(__function_description)s
 *
%(__param_docs)s * @param {LiWESysParams} [sys] - System parameters for tracking and metadata
 *
 * @returns {Promise<LiWEResponse<%(__result_type)s>>} Result object with success status and data or error details
 */
export const %(__function_name)s = async ( ctx: LiWECtx%(__params_arg)s, sys?: LiWESysParams ): Promise<LiWEResponse<%(__result_type)s>> => {
""",
    "METHOD_VALIDATION": """\tconst validation = paramsValidation<%(__params_type)s>( %(__schema_name)s as any, params );
\tif ( !validation.success ) return validation.error;

""",
    "METHOD_PARAMS_EXTRACT": """\tconst { %(__param_names)s } = validation.data;

""",
    "METHOD_BODY_BLOCK": """\t/*=== f2c_start %(__block_name)s ===*/
%(__snippet)s
\t/*=== f2c_end %(__block_name)s ===*/
""",
    "METHOD_FUNCTION_END": """};
""",
    "METHOD_UTILS_FILE": """/**
 * @fileoverview Common utilities for %(__mod_name)s module methods
 */

// Core imports
export { LiWEApp, LiWEResponse, LiWESysParams, responseError, responseSuccess, zodBoolean } from '@backend/liwe3';
export type { LiWECtx } from '@backend/liwe3';

// Database operation imports
export { eq, and, ne, desc, asc, count, avg, sql, inArray, or, like, isNull } from 'drizzle-orm';

// Schema imports
// == Import your schema tables here

// Zod for validation
export { z } from 'zod';

/*=== f2c_start utils ===*/
%(__utils_snippet)s
/*=== f2c_end utils ===*/
""",
    "METHODS_INDEX_START": """/**
 * @fileoverview Re-exports all %(__mod_name)s methods and types
 */

""",
    "METHODS_INDEX_EXPORT": """export { %(__function_name)s, type %(__params_type)s, type %(__result_type)s } from './%(__file_name)s';
""",
    "METHODS_WRAPPER_FILE": """/**
 * @fileoverview %(__mod_name_camel)s Module Methods - Re-exports from individual method files
 *
 * This file maintains backward compatibility by re-exporting all methods
 * from their individual files in the methods/ directory.
 */

// Re-export all methods and types from the methods directory
export * from './methods/index';
""",
    "BE_TYPES_FILE_START": """import { z } from 'zod';
import { zodBoolean } from '@backend/liwe3';

/*=== f2c_start __types ===*/
%(__types_snippet)s
/*=== f2c_end __types ===*/

""",
    "SCHEMA_FILE_START": """import { relations, sql } from 'drizzle-orm';
import { text, integer, sqliteTable, index, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

""",
    "SCHEMA_FILE_END": "",
    "SQL_FILE_HEADER": """-- SQL Schema for %(__mod_name)s module
-- Generated by flow2code
-- Database: SQLite

""",
    "BE_PACKAGE_JSON": """{
  "name": "@backend-modules/%(__mod_name)s",
  "version": "1.0.0",
  "description": "%(__mod_name_camel)s module",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@backend/liwe3": "workspace:*",
    "drizzle-orm": "^0.45.1",
    "zod": "^4.2.1"
  },
  "devDependencies": {
    "@types/node": "^25.0.3",
    "@vitest/ui": "^4.0.16",
    "hono": "^4.11.3",
    "typescript": "^5.9.3",
    "vitest": "^4.0.16"
  }
}
""",
    "BE_TSCONFIG_JSON": """{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ],
  "references": [
    { "path": "%(__core_ref)s" }
  ]
}
""",
    "BE_VITEST_CONFIG": """import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true
	}
});
""",

    # ==================================================================================
    # FRONTEND TEXTS
    # ==================================================================================

    "FE_PACKAGE_JSON": """{
  "name": "@frontend-modules/%(__mod_name)s",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js"
    }
  },
  "files": [
    "dist",
    "!dist/**/*.test.*",
    "!dist/**/*.spec.*"
  ],
  "dependencies": {
    "@frontend/liwe3": "workspace:*"
  },
  "peerDependencies": {
    "@sveltejs/kit": "^2.37.0",
    "svelte": "^5.0.0",
    "svelte-hero-icons": "^5.2.0",
    "zod": "^4.1.11"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.37.0",
    "@sveltejs/package": "^2.5.0",
    "publint": "^0.3.12",
    "svelte": "^5.38.6",
    "svelte-hero-icons": "^5.2.0",
    "typescript": "^5.9.2",
    "vite": "^7.1.4",
    "vitest": "^3.2.4",
    "zod": "^4.1.11"
  },
  "scripts": {
    "dev": "svelte-package -w -i src --types false",
    "build": "svelte-package -i src && publint",
    "prepublishOnly": "npm run build",
    "test": "vitest"
  }
}
""",
    "FE_TSCONFIG_JSON": """{
  "extends": "../../../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "noEmit": true,
    "paths": {
      "@frontend/liwe3": ["../../../../liwe3/frontend/core/src"],
      "@frontend/liwe3/*": ["../../../../liwe3/frontend/core/src/*"],
      "@frontend-modules/%(__mod_name)s": ["./src"],
      "@frontend-modules/%(__mod_name)s/*": ["./src/*"]
    }
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.js",
    "src/**/*.svelte"
  ]
}
""",
    "FE_VITEST_CONFIG": """import { defineConfig } from 'vitest/config';

export default defineConfig( {
	test: {
		environment: 'node',
		globals: true
	}
} );
""",
    "FE_TYPES_FILE_START": """import { z } from 'zod';
import { zodBoolean } from '@frontend/liwe3';

/*=== f2c_start __types ===*/
%(__types_snippet)s
/*=== f2c_end __types ===*/

""",
    "ACTIONS_FILE_START": """import { apiClient, type LiWEResponse } from '@frontend/liwe3';

""",
    "ACTIONS_HEADER_BLOCK": """/*=== f2c_start actions ===*/
%(actions_snippet)s
/*=== f2c_end actions ===*/

""",
    "ACTIONS_CUSTOM_BLOCK": """/*=== f2c_start __actions ===*/
%(__actions_snippet)s
/*=== f2c_end __actions ===*/
""",
    "ACTION_CODE_BLOCK": """
\t/*=== f2c_start %(action_name)s ===*/
%(action_snippet)s
\t/*=== f2c_end %(action_name)s ===*/
""",
    "INDEX_CUSTOM_BLOCK": """/*=== f2c_start index ===*/
%(index_snippet)s
/*=== f2c_end index ===*/
""",
    "INTERNAL_CALL_HELPER": """/**
 * Internal helper function to handle API calls with optional hooks
 * @param method - The API client method to call (e.g., apiClient.get, apiClient.post)
 * @param url - The API endpoint URL
 * @param params - Optional parameters to send with the request
 * @param options - Optional hooks (beforeSend, afterSend, errorHandling)
 * @returns Promise resolving to LiWEResponse
 */
const _internalCall = async <P, R>(
\tmethod: ( url: string, data?: any ) => Promise<any>,
\turl: string,
\tparams?: P,
\toptions?: LiWEActionOptions
): Promise<LiWEResponse<R>> => {
\t// Call beforeSend if defined
\tlet processedParams = params;

\tif ( options?.beforeSend && params !== undefined ) {
\t\tprocessedParams = await options.beforeSend( params );
\t}

\t// Make API call
\tlet res: LiWEResponse<R> = await method( url, processedParams );

\t// Check for errors
\tif ( !res.ok && options?.errorHandling ) {
\t\toptions.errorHandling( res );
\t\treturn res;
\t}

\t// Call afterSend if defined
\tif ( options?.afterSend ) {
\t\tres = await options.afterSend( res );
\t\t// Check for errors after afterSend
\t\tif ( !res.ok && options?.errorHandling ) {
\t\t\toptions.errorHandling( res );
\t\t\treturn res;
\t\t}
\t}

\treturn res;
};

""",
}

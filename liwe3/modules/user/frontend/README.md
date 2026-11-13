# @frontend/modules-user

A Svelte 5 library providing user management components and utilities for LiWE3 applications.

## Features

- User authentication components (Login, Logout, etc.)
- User profile management
- Admin user management
- Two-factor authentication
- User permissions management
- Svelte 5 runes support

## Installation

This package is part of the LiWE3 monorepo and should be installed via the workspace.

## Usage

```typescript
import { Login, UserProfile } from '@frontend/modules-user';
import { storeUser, userStoreUpdate } from '@frontend/modules-user';
```

## Components

- `Login` - User login form with 2FA support
- `Logout` - User logout component
- `UserProfile` - Complete user profile management
- `UserAdminList` - Admin interface for user management
- `TwoFAConfig` - Two-factor authentication setup
- And more...

## Stores

- `storeUser` - Svelte 5 state store for user data
- `userStoreUpdate` - Function to update user store
- `userStoreClear` - Function to clear user store

## Actions

Complete set of API actions for user management including:

- Authentication (login, logout, register)
- Profile management
- Admin functions
- Permissions
- Two-factor authentication

## Dependencies

This package requires:

- Svelte 5
- @sveltejs/kit
- svelte-hero-icons

And the LiWE3 framework packages.

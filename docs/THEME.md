# LiWE3 Theme System

> Complete guide to the new token-driven theme system.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Token System](#token-system)
- [CSS Variables Reference](#css-variables-reference)
- [Using Themes in Components](#using-themes-in-components)
- [Components](#components)
- [Store API](#store-api)
- [Backend API](#backend-api)
- [Build Pipeline](#build-pipeline)
- [Migration Guide](#migration-guide)

---

## Overview

The LiWE3 theme system replaces hardcoded colors with a **token-driven architecture**:

- **Single source of truth**: Colors defined in TypeScript, CSS is generated
- **Semantic naming**: Components use `--liwe3-primary`, never `--liwe3-mode1-500`
- **Automatic derivation**: Color scales (50-950) generated from seed values
- **Subtree scoping**: Different sections can have different themes
- **Zero FOUC**: Theme applied before first paint via inline script
- **Backend-driven**: Admins can change the visual identity without redeploy

---

## Architecture

```
tokens/*.ts          →  Source of truth (TypeScript)
       ↓
   build:theme       →  Generates CSS files
       ↓
dist/theme/*.css     →  Static CSS served via <link>
       
/api/theme/instance.css  →  Dynamic seed overrides from backend
       
ThemeProvider.svelte →  Mounts links, syncs attributes
themeStore           →  Runtime state (variant, density, brand)
```

### Three Token Layers

| Layer           | Purpose                | Example                                      |
| --------------- | ---------------------- | -------------------------------------------- |
| **1. Seed**     | Values the admin edits | `--liwe3-seed-primary: oklch(0.62 0.14 255)` |
| **2. Scale**    | Derived from seeds     | `--liwe3-primary-500` (auto-calculated)      |
| **3. Semantic** | What components use    | `--liwe3-primary`, `--liwe3-surface`         |

**Rule**: Always consume the highest layer available. Never use seed or scale values directly in components.

---

## Token System

### Seed Colors

Each theme defines 10 seed colors per variant:

```typescript
// liwe3/modules/theme/frontend/src/tokens/colors.ts
SEED_COLORS = {
	light: {
		primary: 'oklch(0.62 0.14 255)',
		secondary: 'oklch(0.59 0.07 236)',
		accent: 'oklch(0.52 0.08 232)',
		neutral: 'oklch(0.55 0.04 139)',
		info: 'oklch(0.60 0.10 250)',
		success: 'oklch(0.75 0.12 150)',
		warning: 'oklch(0.82 0.14 80)',
		error: 'oklch(0.65 0.18 25)',
		surface: 'oklch(0.98 0.004 271)',
		text: 'oklch(0.28 0.02 250)',
	},
	dark: {/* ... */},
	'high-contrast': {/* ... */},
};
```

### Color Scales

Each seed generates 11 scale steps (50-950) automatically:

```css
--liwe3-primary-50   /* Lightest */
--liwe3-primary-100
...
--liwe3-primary-500  /* Base (seed value) */
...
--liwe3-primary-950  /* Darkest */
```

### Non-Color Tokens

| Category         | Tokens                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **Spacing**      | `--liwe3-space-0` to `--liwe3-space-16`                                 |
| **Radius**       | `--liwe3-radius-none\|sm\|md\|lg\|xl\|full`                             |
| **Shadows**      | `--liwe3-shadow-sm\|md\|lg\|xl`                                         |
| **Typography**   | `--liwe3-text-xs` to `--liwe3-text-4xl`                                 |
| **Font weights** | `--liwe3-weight-light\|normal\|medium\|semibold\|bold`                  |
| **Line heights** | `--liwe3-leading-none\|tight\|snug\|normal\|relaxed\|loose`             |
| **Motion**       | `--liwe3-duration-fast\|base\|slow`, `--liwe3-ease-out\|in-out\|spring` |
| **Z-index**      | `--liwe3-z-dropdown\|sticky\|overlay\|modal\|toast`                     |
| **Density**      | `--liwe3-density-scale` (1 = comfortable, 0.85 = compact)               |

---

## CSS Variables Reference

### Surfaces

```css
--liwe3-surface          /* Main background */
--liwe3-surface-sunken   /* Recessed areas */
--liwe3-surface-raised   /* Cards, elevated content */
--liwe3-surface-overlay  /* Modals, popovers */
```

### Text

```css
--liwe3-text             /* Primary text */
--liwe3-text-muted       /* Secondary text */
--liwe3-text-subtle      /* Tertiary text */
--liwe3-text-disabled    /* Disabled text */

/* Auto-contrast text for colored backgrounds */
--liwe3-text-on-primary
--liwe3-text-on-secondary
--liwe3-text-on-accent
--liwe3-text-on-neutral
--liwe3-text-on-info
--liwe3-text-on-success
--liwe3-text-on-warning
--liwe3-text-on-error
```

### Borders

```css
--liwe3-border-subtle    /* Subtle dividers */
--liwe3-border           /* Default borders */
--liwe3-border-strong    /* Emphasized borders */
```

### Color Roles

Each role (primary, secondary, accent, info, success, warning, error) has:

```css
--liwe3-{role}           /* Base color */
--liwe3-{role}-hover     /* Hover state */
--liwe3-{role}-active    /* Active/pressed state */
--liwe3-{role}-subtle    /* Subtle background */
```

### State Indicators

```css
--liwe3-focus-ring       /* Focus outline color */
--liwe3-hover-overlay    /* Hover overlay (semi-transparent) */
--liwe3-active-overlay   /* Active overlay (semi-transparent) */
```

---

## Using Themes in Components

### In Svelte Styles (Recommended)

Always use semantic tokens:

```svelte
<style>
.card {
	background: var(--liwe3-surface-raised);
	color: var(--liwe3-text);
	border: 1px solid var(--liwe3-border-subtle);
	border-radius: var(--liwe3-radius-lg);
	padding: var(--liwe3-space-6);
}

.card:hover {
	border-color: var(--liwe3-border-strong);
}

.primary-button {
	background: var(--liwe3-primary);
	color: var(--liwe3-text-on-primary);
	border-radius: var(--liwe3-radius-md);
	padding: var(--liwe3-space-2) var(--liwe3-space-4);
	font-weight: var(--liwe3-weight-medium);
	transition: background var(--liwe3-duration-fast) var(--liwe3-ease-out);
}

.primary-button:hover {
	background: var(--liwe3-primary-hover);
}

.alert-error {
	background: var(--liwe3-error-subtle);
	color: var(--liwe3-text-on-error);
	border: 1px solid var(--liwe3-error);
}
</style>
```

### In Inline Styles

```svelte
<div style="background: var(--liwe3-surface); color: var(--liwe3-text)">
	Content
</div>
```

### Using Opt-In Component Classes

The theme provides pre-built component classes:

```svelte
<button class="liwe3-btn liwe3-btn--primary">Save</button>
<button class="liwe3-btn liwe3-btn--ghost">Cancel</button>
<button class="liwe3-btn liwe3-btn--danger">Delete</button>

<input class="liwe3-input" type="text" />
<select class="liwe3-select">...</select>

<div class="liwe3-card">Card content</div>

<div class="liwe3-alert--info">Information</div>
<div class="liwe3-alert--success">Success!</div>
<div class="liwe3-alert--warning">Warning</div>
<div class="liwe3-alert--error">Error occurred</div>
```

### NEVER Do This

```svelte
<!-- WRONG: Hardcoded colors -->
<style>
.button {
	background: #4f46e5;
}
.text {
	color: #1f2937;
}
.border {
	border: 1px solid #d1d5db;
}
</style>

<!-- WRONG: Using raw scale values -->
<style>
.bg {
	background: var(--liwe3-primary-500);
}
</style>

<!-- WRONG: Styling bare elements -->
<style>
button {
	background: var(--liwe3-primary);
}
input {
	border: 1px solid var(--liwe3-border);
}
</style>
```

---

## Components

### ThemeProvider

Mount at the application root. Handles CSS loading and state initialization.

```svelte
<script>
import { ThemeProvider } from '@frontend-modules/theme';
</script>

<ThemeProvider parts={[ 'tokens', 'base', 'typography', 'components' ]}>
	<App />
</ThemeProvider>
```

**Props:**

| Prop      | Type       | Default                            | Description                                       |
| --------- | ---------- | ---------------------------------- | ------------------------------------------------- |
| `parts`   | `string[]` | `['tokens', 'base', 'typography']` | CSS parts to load                                 |
| `variant` | `Variant`  | -                                  | Initial variant (overridden by stored preference) |
| `density` | `Density`  | -                                  | Initial density                                   |
| `brand`   | `string`   | -                                  | Initial brand name                                |

### ThemeScope

Create a subtree with a different theme variant, brand, or density.

```svelte
<script>
import { ThemeScope } from '@frontend-modules/theme';
</script>

<!-- Dark section in a light page -->
<ThemeScope variant="dark">
	<p>This section uses dark theme</p>
</ThemeScope>

<!-- Compact density for a data table -->
<ThemeScope density="compact" class="table-wrapper">
	<DataTable />
</ThemeScope>

<!-- Brand-specific section -->
<ThemeScope variant="light" brand="partner">
	<PartnerWidget />
</ThemeScope>
```

**Props:**

| Prop      | Type        | Description                         |
| --------- | ----------- | ----------------------------------- |
| `variant` | `ThemeName` | `light`, `dark`, or `high-contrast` |
| `brand`   | `string`    | Brand name for scoped styling       |
| `density` | `Density`   | `comfortable` or `compact`          |
| `class`   | `string`    | CSS class on wrapper div            |

### ThemeToggle

Accessible button that cycles through light/dark/system.

```svelte
<script>
import { ThemeToggle } from '@frontend-modules/theme';
</script>

<header>
	<ThemeToggle />
</header>
```

### ColorPicker

OKLCH-native color picker with sliders.

```svelte
<script>
import { ColorPicker } from '@frontend-modules/theme';

let color = '#4f46e5';

const handleColorChange = ( newColor ) => {
	color = newColor;
};
</script>

<ColorPicker
	value={color}
	onChange={handleColorChange}
	onPreview={( c ) => console.log( 'Preview:', c )}
	label="Brand Color"
/>
```

**Props:**

| Prop        | Type                      | Description                  |
| ----------- | ------------------------- | ---------------------------- |
| `value`     | `string`                  | Current color (hex or oklch) |
| `onChange`  | `(value: string) => void` | Called on commit             |
| `onPreview` | `(value: string) => void` | Called on live preview       |
| `label`     | `string`                  | Label text                   |

---

## Store API

Import and use the theme store directly:

```svelte
<script>
import { themeStore } from '@frontend-modules/theme';
</script>

<!-- Read current state -->
<p>Current variant: {themeStore.variant}</p>
<p>Resolved variant: {themeStore.resolvedVariant}</p>
<p>Density: {themeStore.density}</p>
<p>Brand: {themeStore.brand}</p>

<!-- Change variant -->
<button on:click={() => themeStore.setVariant( 'dark' )}>Dark</button>
<button on:click={() => themeStore.setVariant( 'light' )}>Light</button>
<button on:click={() => themeStore.setVariant( 'system' )}>System</button>

<!-- Change density -->
<button on:click={() => themeStore.setDensity( 'compact' )}>Compact</button>

<!-- Live preview (for theme editor) -->
<script>
const previewColors = () => {
	themeStore.preview( { primary: 'oklch(0.7 0.2 200)' } );
};

const clearPreview = () => {
	themeStore.clearPreview();
};
</script>
```

### Store Properties

| Property          | Type             | Description                                                 |
| ----------------- | ---------------- | ----------------------------------------------------------- |
| `variant`         | `Variant`        | User preference: `light`, `dark`, `high-contrast`, `system` |
| `resolvedVariant` | `ThemeName`      | Actual variant (resolves `system` to `light`/`dark`)        |
| `brand`           | `string \| null` | Active brand name                                           |
| `density`         | `Density`        | `comfortable` or `compact`                                  |

### Store Methods

| Method           | Parameters               | Description                           |
| ---------------- | ------------------------ | ------------------------------------- |
| `setVariant(v)`  | `Variant`                | Set theme variant preference          |
| `setDensity(d)`  | `Density`                | Set density mode                      |
| `setBrand(b)`    | `string \| null`         | Set brand name                        |
| `preview(seeds)` | `Record<string, string>` | Apply seed overrides for live preview |
| `clearPreview()` | -                        | Remove preview overrides              |

---

## Backend API

### Endpoints

| Method   | Route                     | Auth          | Description             |
| -------- | ------------------------- | ------------- | ----------------------- |
| `GET`    | `/api/theme/instance.css` | Public        | CSS with seed overrides |
| `GET`    | `/api/theme/get`          | Public        | Active theme JSON       |
| `GET`    | `/api/theme/list`         | `theme.read`  | List all themes         |
| `POST`   | `/api/theme/add`          | `theme.admin` | Create theme            |
| `PATCH`  | `/api/theme/update`       | `theme.admin` | Update theme            |
| `DELETE` | `/api/theme/del`          | `theme.admin` | Delete theme            |
| `POST`   | `/api/theme/import`       | `theme.admin` | Import theme JSON       |
| `GET`    | `/api/theme/export`       | `theme.admin` | Export theme JSON       |

### Instance CSS Endpoint

The `/api/theme/instance.css` endpoint returns a small CSS file with seed overrides:

```css
/* LiWE3 Instance Theme: My Brand */
[data-theme="light"] {
	--liwe3-seed-primary: oklch(0.65 0.18 280);
	--liwe3-seed-secondary: oklch(0.55 0.12 200);
}
[data-theme="dark"] {
	--liwe3-seed-primary: oklch(0.75 0.15 280);
}
```

Include it after `tokens.css` to override default seeds:

```html
<link rel="stylesheet" href="/theme/tokens.css" />
<link rel="stylesheet" href="/api/theme/instance.css" />
```

### Theme JSON Format

```json
{
	"$schema": "liwe3-theme/v1",
	"name": "my-brand",
	"extends": "light",
	"variants": {
		"light": {
			"seed": {
				"primary": "oklch(0.65 0.18 280)",
				"surface": "oklch(0.98 0.005 280)"
			}
		},
		"dark": {
			"seed": {
				"primary": "oklch(0.75 0.15 280)"
			}
		}
	},
	"scales": {
		"radius-base": "8px",
		"space-unit": "4px"
	},
	"fonts": {
		"sans": "Inter, system-ui, sans-serif"
	}
}
```

---

## Build Pipeline

### Generate CSS

```bash
cd liwe3/modules/theme/frontend
pnpm build:theme
```

This generates:

- `dist/theme/tokens.css` - All token definitions
- `dist/theme/base.css` - Reset, color-scheme, focus styles
- `dist/theme/components.css` - Opt-in component classes
- `dist/theme/utilities.css` - Utility classes
- `dist/theme-types.d.ts` - TypeScript type declarations

### Add to Package Scripts

Already configured in `package.json`:

```json
{
	"scripts": {
		"build:theme": "tsx src/generate/cli.ts"
	}
}
```

### Contrast Validation

The generator checks WCAG contrast ratios and reports warnings:

```
Contrast warnings:
  --liwe3-text on --liwe3-primary: ratio 3.60 (min 4.5)
```

These are informational - the `text-on-*` tokens use auto-contrast at runtime.

---

## Migration Guide

### Old to New Variable Names

| Old                         | New                                                                     |
| --------------------------- | ----------------------------------------------------------------------- |
| `--liwe3-color-mode1`       | `--liwe3-primary`                                                       |
| `--liwe3-color-mode2`       | `--liwe3-secondary`                                                     |
| `--liwe3-color-mode3`       | `--liwe3-accent`                                                        |
| `--liwe3-color-mode4`       | `--liwe3-neutral`                                                       |
| `--liwe3-mode1-<n>`         | `--liwe3-primary-<n>`                                                   |
| `--liwe3-text-on-mode1`     | `--liwe3-text-on-primary`                                               |
| `--liwe3-background`        | `--liwe3-surface`                                                       |
| `--liwe3-color`             | `--liwe3-text`                                                          |
| `--liwe3-surface-mode1/2/3` | `--liwe3-surface` / `--liwe3-surface-sunken` / `--liwe3-surface-raised` |
| `--liwe3-text-mode1/2/3`    | `--liwe3-text` / `--liwe3-text-muted` / `--liwe3-text-subtle`           |
| `--liwe3-border-default`    | `--liwe3-border`                                                        |
| `--liwe3-gray-<n>`          | `--liwe3-neutral-<n>`                                                   |
| `--liwe3-main-font-family`  | `--liwe3-font-sans`                                                     |
| `--liwe3-border-radius`     | `--liwe3-radius-md`                                                     |
| `--liwe3-font-size`         | `--liwe3-font-size-base`                                                |

### Hardcoded Color Mapping

| Hardcoded                         | Semantic Token                                                           |
| --------------------------------- | ------------------------------------------------------------------------ |
| `#fef3c7` / `#fbbf24` / `#92400e` | `--liwe3-warning-subtle` / `--liwe3-warning` / `--liwe3-text-on-warning` |
| `#d1fae5` / `#10b981` / `#065f46` | `--liwe3-success-subtle` / `--liwe3-success` / `--liwe3-text-on-success` |
| `#fee2e2` / `#ef4444` / `#991b1b` | `--liwe3-error-subtle` / `--liwe3-error` / `--liwe3-text-on-error`       |
| `#4f46e5` / `#4338ca`             | `--liwe3-primary` / `--liwe3-primary-hover`                              |
| Gray backgrounds                  | `--liwe3-surface` / `--liwe3-surface-sunken` / `--liwe3-surface-raised`  |
| Text grays                        | `--liwe3-text` / `--liwe3-text-muted` / `--liwe3-text-subtle`            |

### Migration Steps

1. **Update CSS variable names** using the mapping above
2. **Replace hardcoded hex values** with semantic tokens
3. **Use opt-in classes** where possible (`.liwe3-btn`, `.liwe3-card`, etc.)
4. **Test all variants** (light, dark, high-contrast)
5. **Run the linter** to catch remaining hardcoded colors

### Anti-FOUC Script

Add to `app.html` before any content:

```html
<script>
  (function () {
    try {
      var s = JSON.parse(localStorage.getItem('liwe3-theme') || '{}');
      var v = s.variant || 'system';
      if (v === 'system')
        v = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var d = document.documentElement;
      d.setAttribute('data-theme', v);
      if (s.density) d.setAttribute('data-density', s.density);
      if (s.brand) d.setAttribute('data-brand', s.brand);
    } catch (e) {}
  })();
</script>
```

---

## Quick Reference

### Import from Package

```svelte
<script>
import {
	ColorPicker,
	ThemeProvider,
	ThemeScope,
	ThemeToggle,
	contrastRatio,
	fromOklch,
	themeStore,
	toOklch,
} from '@frontend-modules/theme';
</script>
```

### CSS Layer Order

```css
@layer liwe3.reset, liwe3.tokens, liwe3.base, liwe3.components, liwe3.utilities;
```

App CSS (not in any layer) always wins over theme CSS.

### Density Scoping

```html
<body data-theme="light">
  <section data-theme="dark">          <!-- Dark section -->
  <aside data-brand="partner">         <!-- Brand override -->
  <div data-density="compact">         <!-- Compact density -->
  <div style="--liwe3-seed-primary: oklch(0.6 0.2 200)">  <!-- One-off override -->
</body>
```

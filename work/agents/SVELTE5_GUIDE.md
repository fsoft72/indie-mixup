# Svelte 5 & TypeScript Complete Implementation Guide

## When to Read This File

**Read this guide when:**

- ✅ Creating any new Svelte component
- ✅ Implementing interactive UI features
- ✅ Working with component state and props
- ✅ Setting up SvelteKit pages and routing
- ✅ Implementing forms and user input
- ✅ Managing shared state across components
- ✅ Debugging reactivity issues
- ✅ Integrating TypeScript with Svelte components
- ✅ Using LiWE3 UI components from `@liwe3/webcomponents-svelte`

**This guide covers:**

- Svelte 5 runes system (`$state`, `$props`, `$derived`, `$effect`)
- TypeScript strict typing patterns
- SvelteKit static site generation
- Component patterns and best practices
- Event handling and callback props
- State management strategies
- Common mistakes and how to avoid them

---

## Core Rules

### Identity

You are an expert Frontend Engineer specializing in **Svelte 5**, **SvelteKit**, and **Strict TypeScript**. Your goal is to write type-safe, performant, and idiomatic Svelte code using the latest features.

### Mandatory Requirements

1. **Runes Only** - Use Svelte 5 runes exclusively. No legacy `let` reactive syntax or `$:` labels
2. **Zero `any` Policy** - The use of `any` is strictly forbidden. Use `unknown` or define proper types
3. **Static Site Generation** - All SvelteKit apps are static. Use `+page.ts` ONLY (no `+page.server.ts`)
4. **TypeScript Always** - Every `.svelte` file MUST use `<script lang="ts">`
5. **LiWE3 Components First** - Use components from `@liwe3/webcomponents-svelte` before creating custom ones
6. **FormCreator Mandatory** - **ALWAYS** use `FormCreator` component to create forms. NEVER build forms manually with raw `<form>`/`<input>` elements. FormCreator handles validation, rendering, and required-field checks automatically
7. **Upload Module Mandatory** - **ALWAYS** use the `Upload` component from `@frontend-modules/upload` for file uploads. NEVER use raw `<input type="file">` or custom upload implementations. The Upload module handles chunked uploads, progress tracking, auth tokens, and file validation automatically

---

## Component Patterns

### Basic Component Structure

Every Svelte component follows this structure:

```typescript
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import type { SomeType } from './types';

  // 2. Type definitions
  interface Props {
    title: string;
    count?: number;
  }

  // 3. Props
  let { title, count = 0 }: Props = $props();

  // 4. State
  let is_loading = $state(false);

  // 5. Derived state
  let display_text = $derived.by(() => {
    return `${title}: ${count}`;
  });

  // 6. Functions
  const handle_click = () => {
    count++;
  };

  // 7. Lifecycle
  onMount(() => {
    console.log('Component mounted');
  });
</script>

<!-- 8. Template -->
<div class="component">
  <h1>{display_text}</h1>
  <button onclick={handle_click}>Increment</button>
</div>

<!-- 9. Styles -->
<style>
  .component {
    padding: 1rem;
  }
</style>
```

### Props with $props()

**Basic Props:**

```typescript
<script lang="ts">
  interface Props {
    name: string;
    age: number;
  }

  let { name, age }: Props = $props();
</script>

<p>{name} is {age} years old</p>
```

**Optional Props with Defaults:**

```typescript
<script lang="ts">
  interface Props {
    title: string;
    subtitle?: string;
    show_icon?: boolean;
    max_items?: number;
  }

  let {
    title,
    subtitle = '',
    show_icon = true,
    max_items = 10
  }: Props = $props();
</script>

<div>
  <h1>{title}</h1>
  {#if subtitle}
    <h2>{subtitle}</h2>
  {/if}
  {#if show_icon}
    <span>🎯</span>
  {/if}
  <p>Max: {max_items}</p>
</div>
```

**Spread Props:**

```typescript
<script lang="ts">
  interface Props {
    class?: string;
    [key: string]: unknown; // For additional HTML attributes
  }

  let { class: className, ...rest_props }: Props = $props();
</script>

<div class={className} {...rest_props}>
  Content
</div>
```

**Callback Props:**

```typescript
<script lang="ts">
  interface Props {
    onsubmit?: (data: { name: string; email: string }) => void;
    oncancel?: () => void;
  }

  let { onsubmit, oncancel }: Props = $props();

  let name = $state('');
  let email = $state('');

  const handle_submit = () => {
    onsubmit?.({ name, email });
  };

  const handle_cancel = () => {
    oncancel?.();
  };
</script>

<form>
  <input bind:value={name} />
  <input bind:value={email} />
  <button type="button" onclick={handle_submit}>Submit</button>
  <button type="button" onclick={handle_cancel}>Cancel</button>
</form>
```

### State with $state()

**Simple State:**

```typescript
<script lang="ts">
  let count = $state(0);
  let name = $state('');
  let is_visible = $state(true);
  let items = $state<string[]>([]);
</script>
```

**Object State:**

```typescript
<script lang="ts">
  interface User {
    id_user: string;
    name: string;
    email: string;
  }

  let user = $state<User | null>(null);
  let form_data = $state({
    username: '',
    password: '',
    remember: false
  });

  const update_username = (value: string) => {
    form_data.username = value;
  };
</script>
```

**Array State:**

```typescript
<script lang="ts">
  interface Todo {
    id_todo: string;
    text: string;
    completed: boolean;
  }

  let todos = $state<Todo[]>([]);

  const todo_add = (text: string) => {
    todos.push({
      id_todo: `todo_${Date.now()}`,
      text,
      completed: false
    });
  };

  const todo_remove = (id_todo: string) => {
    todos = todos.filter(t => t.id_todo !== id_todo);
  };

  const todo_toggle = (id_todo: string) => {
    const todo = todos.find(t => t.id_todo === id_todo);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };
</script>
```

### Derived State with $derived.by()

**ALWAYS use `$derived.by()` instead of `$derived()`:**

```typescript
<script lang="ts">
  let first_name = $state('John');
  let last_name = $state('Doe');

  // ✅ CORRECT - Use $derived.by()
  let full_name = $derived.by(() => {
    return `${first_name} ${last_name}`;
  });

  // ❌ WRONG - Don't use $derived()
  // let full_name = $derived(`${first_name} ${last_name}`);
</script>
```

**Complex Derived State:**

```typescript
<script lang="ts">
  interface Product {
    id_product: string;
    name: string;
    price: number;
    quantity: number;
  }

  let cart_items = $state<Product[]>([]);
  let tax_rate = $state(0.08);

  let subtotal = $derived.by(() => {
    return cart_items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  });

  let tax_amount = $derived.by(() => {
    return subtotal * tax_rate;
  });

  let total = $derived.by(() => {
    return subtotal + tax_amount;
  });

  let item_count = $derived.by(() => {
    return cart_items.reduce((sum, item) => sum + item.quantity, 0);
  });

  let formatted_total = $derived.by(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(total);
  });
</script>

<div>
  <p>Items: {item_count}</p>
  <p>Subtotal: ${subtotal.toFixed(2)}</p>
  <p>Tax: ${tax_amount.toFixed(2)}</p>
  <p>Total: {formatted_total}</p>
</div>
```

**Filtering and Sorting:**

```typescript
<script lang="ts">
  interface User {
    id_user: string;
    name: string;
    age: number;
    active: boolean;
  }

  let users = $state<User[]>([]);
  let search_term = $state('');
  let sort_by = $state<'name' | 'age'>('name');
  let show_inactive = $state(false);

  let filtered_users = $derived.by(() => {
    let result = users;

    // Filter by search
    if (search_term) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(search_term.toLowerCase())
      );
    }

    // Filter by active status
    if (!show_inactive) {
      result = result.filter(u => u.active);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort_by === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.age - b.age;
      }
    });

    return result;
  });
</script>
```

### Effects with $effect()

**Use $effect() sparingly** - prefer derived state or event handlers.

**Valid use cases:**

```typescript
<script lang="ts">
  import { onMount } from 'svelte';

  let user_id = $state('');
  let user_data = $state(null);

  // ✅ GOOD - Fetching data when dependency changes
  $effect(() => {
    if (!user_id) return;

    fetch(`/api/user/${user_id}`)
      .then(r => r.json())
      .then(data => user_data = data);
  });

  // ✅ GOOD - Logging for debugging
  $effect(() => {
    console.log('User changed:', user_data);
  });

  // ✅ GOOD - Third-party library integration
  let chart_element: HTMLDivElement;

  $effect(() => {
    if (!chart_element) return;

    const chart = new SomeChartLibrary(chart_element, {
      data: user_data
    });

    return () => {
      chart.destroy();
    };
  });
</script>
```

**Avoid $effect() when you can use alternatives:**

```typescript
<script lang="ts">
  let count = $state(0);

  // ❌ WRONG - Use derived state instead
  let doubled = $state(0);
  $effect(() => {
    doubled = count * 2;
  });

  // ✅ CORRECT
  let doubled = $derived.by(() => count * 2);
</script>
```

### Event Handling Patterns

**All event names MUST BE LOWERCASE:**

```typescript
<script lang="ts">
  // ✅ CORRECT - lowercase event names
  const handle_click = () => { };
  const handle_submit = () => { };
  const handle_input = () => { };

  // ❌ WRONG - camelCase
  const handleClick = () => { };
  const onClick = () => { };
</script>

<!-- ✅ CORRECT -->
<button onclick={handle_click}>Click</button>
<form onsubmit={handle_submit}>Submit</form>
<input oninput={handle_input} />

<!-- ❌ WRONG - old Svelte 4 syntax -->
<button on:click={handle_click}>Click</button>
```

**Typed Event Handlers:**

```typescript
<script lang="ts">
  const handle_click = (event: MouseEvent) => {
    console.log('Clicked at:', event.clientX, event.clientY);
  };

  const handle_submit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const form_data = new FormData(form);
    console.log('Form data:', Object.fromEntries(form_data));
  };

  const handle_input = (event: Event) => {
    const target = event.target as HTMLInputElement;
    console.log('Input value:', target.value);
  };

  const handle_keydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      console.log('Enter pressed');
    }
  };
</script>
```

**Inline Event Handlers:**

```typescript
<script lang="ts">
  let count = $state(0);
  let items = $state<string[]>([]);

  const item_remove = (index: number) => {
    items = items.filter((_, i) => i !== index);
  };
</script>

<!-- Simple inline -->
<button onclick={() => count++}>Increment</button>
<button onclick={() => count--}>Decrement</button>

<!-- With parameters -->
{#each items as item, index}
  <div>
    {item}
    <button onclick={() => item_remove(index)}>Remove</button>
  </div>
{/each}
```

### Lifecycle (onMount, onDestroy)

**Prefer onMount() over $effect():**

```typescript
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let data = $state([]);
  let interval_id: number | null = null;

  // ✅ CORRECT - Use onMount for initial data fetch
  onMount(async () => {
    const response = await fetch('/api/data');
    data = await response.json();

    // Setup interval
    interval_id = setInterval(() => {
      console.log('Tick');
    }, 1000);
  });

  // ✅ CORRECT - Cleanup in onDestroy
  onDestroy(() => {
    if (interval_id) {
      clearInterval(interval_id);
    }
  });
</script>
```

**onMount with cleanup:**

```typescript
<script lang="ts">
  import { onMount } from 'svelte';

  let canvas_element: HTMLCanvasElement;

  onMount(() => {
    const ctx = canvas_element.getContext('2d');
    if (!ctx) return;

    // Setup
    const render = () => {
      ctx.clearRect(0, 0, canvas_element.width, canvas_element.height);
      // ... render logic
    };

    const animation_id = requestAnimationFrame(render);

    // Cleanup function
    return () => {
      cancelAnimationFrame(animation_id);
    };
  });
</script>

<canvas bind:this={canvas_element}></canvas>
```

---

## State Management

### Component State

Use `$state()` for local component state that doesn't need to be shared:

```typescript
<script lang="ts">
	// Form state let email = $state(''); let password = $state(''); let remember_me = $state(false);

	// UI state let is_loading = $state(false); let show_password = $state(false); let error_message = $state('');

	// Data state let user_profile = $state(null);
</script>;
```

### Store Files (.svelte.ts)

**Create store files ending with `.svelte.ts`** for shared state. Use the **class-based singleton pattern**:

1. Define a class with private `$state()` fields using `#` prefix
2. Expose read-only access via `get` accessors
3. Define methods for mutations and async operations
4. Export a singleton instance with `export default new StoreClass()`

**Example: `/src/modules/gdpr_license/store.svelte.ts`**

```typescript
import { GDPRContract, GDPRLicense } from './types';
import { gdpr_license_contract_list, gdpr_license_license_list, gdpr_license_license_user_active } from './actions';

class StoreClass {
	#contracts : GDPRContract[] = $state( [] );
	#licenses : Record<string, GDPRLicense> = $state( {} );
	#activeLicense : GDPRLicense = $state( {} as GDPRLicense );

	get contracts() {
		return this.#contracts;
	}

	get activeLicense() {
		return this.#activeLicense;
	}

	async contractsLoad () {
		const res = await gdpr_license_contract_list( {} );
		if ( !res.ok ) {
			console.error( 'Failed to load contracts', res.error );
			return res;
		}

		this.#contracts = res.data ?? [];

		return res;
	}

	contractByIdBuyer ( id_user : string ) {
		return this.#contracts.find( ( c ) => c.id_buyer === id_user );
	}

	async licensesLoad () {
		const res = await gdpr_license_license_list( {} );
		if ( !res.ok ) {
			console.error( 'Failed to load licenses', res.error );
			return res;
		}

		this.#licenses = {};
		res.data!.forEach( ( license ) => {
			this.#licenses[license.id] = license;
		} );

		return res;
	}

	async licenseGetActive () {
		const res = await gdpr_license_license_user_active();
		if ( !res.ok ) return res;

		this.#activeLicense = res.data!;

		return res;
	}
}

export default new StoreClass();
```

**Key rules:**

- **Private `$state()` fields** (`#field`) — state is encapsulated, not directly writable from outside
- **Getters for read access** — components can read state but not mutate it directly
- **Methods for mutations** — all state changes go through class methods
- **Singleton export** — `export default new StoreClass()` ensures a single shared instance

**Using the store:**

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import store from '../store.svelte';

  onMount( async () => {
    await store.contractsLoad();
    await store.licenseGetActive();
  } );
</script>

<div>
  {#if store.activeLicense}
    <p>Active license: {store.activeLicense.id}</p>
  {/if}

  {#each store.contracts as contract}
    <div>{contract.id_buyer}</div>
  {/each}
</div>
```

### Shared State Patterns

**Cart Store Example (class-based):**

```typescript
// /src/modules/cart/store.svelte.ts
import type { Product } from './types';

interface CartItem extends Product {
	quantity : number;
}

class StoreClass {
	#items : CartItem[] = $state( [] );

	get items() {
		return this.#items;
	}

	get total_items() {
		return this.#items.reduce( ( sum, item ) => sum + item.quantity, 0 );
	}

	get total_price() {
		return this.#items.reduce( ( sum, item ) => sum + ( item.price * item.quantity ), 0 );
	}

	item_add ( product : Product ) {
		const existing = this.#items.find( ( i ) => i.id_product === product.id_product );

		if ( existing ) {
			existing.quantity++;
		} else {
			this.#items.push( { ...product, quantity: 1 } );
		}
	}

	item_remove ( id_product : string ) {
		this.#items = this.#items.filter( ( i ) => i.id_product !== id_product );
	}

	item_update_quantity ( id_product : string, quantity : number ) {
		const item = this.#items.find( ( i ) => i.id_product === id_product );
		if ( item ) {
			item.quantity = quantity;
		}
	}

	cart_clear () {
		this.#items = [];
	}
}

export default new StoreClass();
```

---

## Event Handling

### Event Names (Lowercase Only)

```typescript
<script lang="ts">
	// ✅ CORRECT - All lowercase const handle_submit = () => {  }; const handle_click = () => {  }; const handle_change = () => {  }; const handle_input = () =>{' '}
	{  }; const handle_keydown = () => {  }; const handle_focus = () => {  }; const handle_blur = () => {  };

	// ❌ WRONG - CamelCase const handleSubmit = () => {  }; const onClick = () => {  };
</script>;
```

### Callback Props

```typescript
<script lang="ts">
  // Child component
  interface Props {
    onsubmit?: (data: FormData) => void;
    oncancel?: () => void;
  }

  let { onsubmit, oncancel }: Props = $props();

  const handle_submit = () => {
    const data = { name: 'John', age: 30 };
    onsubmit?.(data);
  };
</script>

<button onclick={handle_submit}>Submit</button>
<button onclick={() => oncancel?.()}>Cancel</button>
```

**Using the component:**

```typescript
<script lang="ts">
  import MyForm from './MyForm.svelte';

  const handle_form_submit = (data: FormData) => {
    console.log('Received:', data);
  };

  const handle_form_cancel = () => {
    console.log('Cancelled');
  };
</script>

<MyForm
  onsubmit={handle_form_submit}
  oncancel={handle_form_cancel}
/>
```

### Event Modifiers

Svelte 5 doesn't use event modifiers. Handle them in your code:

```typescript
<script lang="ts">
  const handle_submit = (event: SubmitEvent) => {
    event.preventDefault(); // Instead of |preventDefault
    // ... handle submit
  };

  const handle_click_once = (() => {
    let clicked = false;

    return () => {
      if (clicked) return; // Instead of |once
      clicked = true;
      // ... handle click
    };
  })();

  const handle_self_click = (event: MouseEvent) => {
    if (event.target !== event.currentTarget) return; // Instead of |self
    // ... handle click
  };
</script>

<form onsubmit={handle_submit}>
  <button>Submit</button>
</form>
```

---

## Props Patterns

### Required vs Optional

```typescript
<script lang="ts">
  interface Props {
    // Required props
    title: string;
    user_id: string;

    // Optional props
    subtitle?: string;
    max_items?: number;
    onclose?: () => void;
  }

  let {
    title,
    user_id,
    subtitle,
    max_items,
    onclose
  }: Props = $props();
</script>
```

### Default Values

```typescript
<script lang="ts">
  interface Props {
    title?: string;
    count?: number;
    items?: string[];
    config?: {
      show_header: boolean;
      theme: 'light' | 'dark';
    };
  }

  let {
    title = 'Untitled',
    count = 0,
    items = [],
    config = {
      show_header: true,
      theme: 'light'
    }
  }: Props = $props();
</script>
```

### Spread Props

```typescript
<script lang="ts">
  interface Props {
    variant?: 'primary' | 'secondary';
    size?: 'small' | 'medium' | 'large';
    [key: string]: unknown; // Allow any HTML attributes
  }

  let {
    variant = 'primary',
    size = 'medium',
    ...rest_props
  }: Props = $props();
</script>

<button
  class="btn btn-{variant} btn-{size}"
  {...rest_props}
>
  <slot />
</button>
```

### Type Safety

```typescript
<script lang="ts">
  import type { User, Product } from '$lib/types';

  interface Props {
    user: User; // Required complex type
    products?: Product[]; // Optional array
    onselect?: (product: Product) => void; // Typed callback
  }

  let { user, products = [], onselect }: Props = $props();

  const handle_product_click = (product: Product) => {
    onselect?.(product);
  };
</script>
```

---

## SvelteKit Integration

### Routing Patterns

**Directory structure:**

```
src/routes/
├── +page.svelte          # Homepage (/)
├── +layout.svelte        # Root layout
├── about/
│   └── +page.svelte      # /about
├── products/
│   ├── +page.svelte      # /products
│   └── [id_product]/
│       └── +page.svelte  # /products/:id_product
└── api/
    └── users/
        └── +server.ts    # API endpoint
```

### Load Functions (ONLY +page.ts)

**DO NOT USE `+page.server.ts`** - The site is static.

**Example: `/src/routes/products/+page.ts`**

```typescript
import type { PageLoad } from './$types';
import type { Product } from '$lib/types';

export const load : PageLoad = async ( { fetch, params } ) => {
	const response = await fetch( '/api/products' );
	const products : Product[] = await response.json();

	return {
		products,
	};
};
```

**Using load data in component:**

```typescript
<script lang="ts">
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // data.products is available from load function
</script>

<div>
  <h1>Products</h1>
  {#each data.products as product}
    <div>{product.name}</div>
  {/each}
</div>
```

### Static Site Generation

**Configure in `svelte.config.js`:**

```javascript
import adapter from '@sveltejs/adapter-static';

export default {
	kit: {
		adapter: adapter( {
			pages: 'build',
			assets: 'build',
			fallback: null,
		} ),
	},
};
```

### API Calls from Frontend

**Use onMount() for data fetching:**

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '$lib/types';

  let users = $state<User[]>([]);
  let is_loading = $state(true);
  let error = $state('');

  onMount(async () => {
    try {
      const response = await fetch('/api/users');

      if (!response.ok) {
        throw new Error('Failed to fetch');
      }

      users = await response.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      is_loading = false;
    }
  });
</script>

{#if is_loading}
  <p>Loading...</p>
{:else if error}
  <p>Error: {error}</p>
{:else}
  {#each users as user}
    <div>{user.name}</div>
  {/each}
{/if}
```

---

## Style Guide

### Naming Conventions

```typescript
<script lang="ts">
	// ✅ CORRECT - Snake case, noun before verb const user_get = async (id_user: string) => {  }; const users_list = async () => {  }; const product_add = (product: Product) =>
	{' '}
	{  }; const cart_items_clear = () => {  };

	// ❌ WRONG - Verb before noun const getUser = async (userId: string) => {  }; const listUsers = async () => {  };

	// ✅ CORRECT - Event handlers lowercase const handle_click = () => {  }; const handle_submit = () => {  };

	// ❌ WRONG - CamelCase const handleClick = () => {  };
</script>;
```

### ID Naming

**All IDs start with `id_` prefix:**

```typescript
<script lang="ts">
  interface User {
    id_user: string;      // ✅ CORRECT
    id_company: string;   // ✅ CORRECT
  }

  interface Product {
    userId: string;       // ❌ WRONG - remap to id_user
    productId: string;    // ❌ WRONG - remap to id_product
  }

  // Remapping external data
  const api_user_get = async (user_id: string) => {
    const response = await fetch(`/api/user/${user_id}`);
    const data = await response.json();

    // Remap userId to id_user
    return {
      id_user: data.userId,
      name: data.name,
      email: data.email
    };
  };
</script>
```

### Event Names (Lowercase)

```typescript
<script lang="ts">
  interface Props {
    onexit?: () => void;        // ✅ CORRECT
    onsubmit?: () => void;      // ✅ CORRECT
    onitemselect?: () => void;  // ✅ CORRECT

    onExit?: () => void;        // ❌ WRONG
    onSubmit?: () => void;      // ❌ WRONG
  }
</script>
```

### Snake Case Preference

```typescript
<script lang="ts">
	// ✅ CORRECT - Snake case let user_profile = $state(null); let is_loading = $state(false); let error_message = $state(''); let selected_items = $state([]);

	// ❌ WRONG - CamelCase let userProfile = $state(null); let isLoading = $state(false);
</script>;
```

---

## Code Examples

### Complete Form Component

```typescript
<script lang="ts">
  import { toastAdd } from '@liwe3/webcomponents-svelte';

  interface FormData {
    name: string;
    email: string;
    message: string;
  }

  interface Props {
    onsubmit?: (data: FormData) => void;
    oncancel?: () => void;
  }

  let { onsubmit, oncancel }: Props = $props();

  // Form state
  let name = $state('');
  let email = $state('');
  let message = $state('');

  // Validation state
  let errors = $state({
    name: '',
    email: '',
    message: ''
  });

  // UI state
  let is_submitting = $state(false);

  // Derived - form is valid
  let is_valid = $derived.by(() => {
    return name.length > 0 &&
           email.includes('@') &&
           message.length > 10;
  });

  const validate_form = () => {
    errors.name = name.length === 0 ? 'Name is required' : '';
    errors.email = !email.includes('@') ? 'Invalid email' : '';
    errors.message = message.length < 10 ? 'Message too short' : '';

    return !errors.name && !errors.email && !errors.message;
  };

  const handle_submit = async (event: SubmitEvent) => {
    event.preventDefault();

    if (!validate_form()) {
      toastAdd({ message: 'Please fix errors', type: 'error' });
      return;
    }

    is_submitting = true;

    try {
      onsubmit?.({ name, email, message });

      // Reset form
      name = '';
      email = '';
      message = '';

      toastAdd({ message: 'Form submitted!', type: 'success' });
    } catch (err) {
      toastAdd({ message: 'Submission failed', type: 'error' });
    } finally {
      is_submitting = false;
    }
  };

  const handle_cancel = () => {
    oncancel?.();
  };
</script>

<form onsubmit={handle_submit} class="contact-form">
  <div class="form-group">
    <label for="id_name">Name</label>
    <input
      id="id_name"
      type="text"
      bind:value={name}
      disabled={is_submitting}
    />
    {#if errors.name}
      <span class="error">{errors.name}</span>
    {/if}
  </div>

  <div class="form-group">
    <label for="id_email">Email</label>
    <input
      id="id_email"
      type="email"
      bind:value={email}
      disabled={is_submitting}
    />
    {#if errors.email}
      <span class="error">{errors.email}</span>
    {/if}
  </div>

  <div class="form-group">
    <label for="id_message">Message</label>
    <textarea
      id="id_message"
      bind:value={message}
      disabled={is_submitting}
      rows="5"
    ></textarea>
    {#if errors.message}
      <span class="error">{errors.message}</span>
    {/if}
  </div>

  <div class="form-actions">
    <button
      type="submit"
      disabled={!is_valid || is_submitting}
    >
      {is_submitting ? 'Submitting...' : 'Submit'}
    </button>

    <button
      type="button"
      onclick={handle_cancel}
      disabled={is_submitting}
    >
      Cancel
    </button>
  </div>
</form>

<style>
  .contact-form {
    max-width: 500px;
    margin: 0 auto;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .error {
    color: red;
    font-size: 0.875rem;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
  }
</style>
```

### Complete List Component with Filtering

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import type { User } from '$lib/types';

  // State
  let users = $state<User[]>([]);
  let search_term = $state('');
  let sort_by = $state<'name' | 'email'>('name');
  let is_loading = $state(false);

  // Derived - filtered and sorted users
  let filtered_users = $derived.by(() => {
    let result = users;

    // Filter by search
    if (search_term) {
      result = result.filter(user => {
        const name_match = user.name.toLowerCase().includes(search_term.toLowerCase());
        const email_match = user.email.toLowerCase().includes(search_term.toLowerCase());
        return name_match || email_match;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sort_by === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        return a.email.localeCompare(b.email);
      }
    });

    return result;
  });

  let result_count = $derived.by(() => filtered_users.length);

  // Fetch data
  onMount(async () => {
    is_loading = true;
    const response = await fetch('/api/users');
    users = await response.json();
    is_loading = false;
  });

  const handle_search_input = (event: Event) => {
    const target = event.target as HTMLInputElement;
    search_term = target.value;
  };

  const handle_sort_change = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    sort_by = target.value as 'name' | 'email';
  };
</script>

<div class="user-list">
  <div class="controls">
    <input
      type="text"
      placeholder="Search users..."
      value={search_term}
      oninput={handle_search_input}
    />

    <select value={sort_by} onchange={handle_sort_change}>
      <option value="name">Sort by Name</option>
      <option value="email">Sort by Email</option>
    </select>

    <span class="count">{result_count} users</span>
  </div>

  {#if is_loading}
    <p>Loading...</p>
  {:else if filtered_users.length === 0}
    <p>No users found</p>
  {:else}
    <ul>
      {#each filtered_users as user (user.id_user)}
        <li>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </li>
      {/each}
    </ul>
  {/if}
</div>
```

---

## Common Mistakes

### Don't Use Legacy Syntax

```typescript
<script lang="ts">
  // ❌ WRONG - Legacy reactive syntax
  let count = 0;
  $: doubled = count * 2;

  // ✅ CORRECT - Use runes
  let count = $state(0);
  let doubled = $derived.by(() => count * 2);


  // ❌ WRONG - export let for props
  export let name: string;

  // ✅ CORRECT - Use $props()
  interface Props {
    name: string;
  }
  let { name }: Props = $props();


  // ❌ WRONG - Old event syntax
  <button on:click={handle_click}>Click</button>

  // ✅ CORRECT - New attribute syntax
  <button onclick={handle_click}>Click</button>
</script>
```

### Don't Use `any`

```typescript
<script lang="ts">
  // ❌ WRONG - Using any
  const fetch_data = async (): Promise<any> => {
    const response = await fetch('/api/data');
    return response.json();
  };

  // ✅ CORRECT - Define proper types
  interface ApiResponse {
    id_item: string;
    name: string;
    value: number;
  }

  const fetch_data = async (): Promise<ApiResponse[]> => {
    const response = await fetch('/api/data');
    return response.json();
  };


  // ❌ WRONG - any for event handlers
  const handle_click = (event: any) => {
    console.log(event);
  };

  // ✅ CORRECT - Proper event types
  const handle_click = (event: MouseEvent) => {
    console.log(event);
  };
</script>
```

### Don't Use $derived() - Use $derived.by()

```typescript
<script lang="ts">
	let count = $state(0);

	// ❌ WRONG let doubled = $derived(count * 2);

	// ✅ CORRECT let doubled = $derived.by(() => count * 2);
</script>;
```

### Don't Mutate Props

```typescript
<script lang="ts">
  interface Props {
    user: User;
  }

  let { user }: Props = $props();

  // ❌ WRONG - Mutating props
  const update_name = (new_name: string) => {
    user.name = new_name;
  };

  // ✅ CORRECT - Use callback or events
  interface Props {
    user: User;
    onupdate?: (user: User) => void;
  }

  let { user, onupdate }: Props = $props();

  const update_name = (new_name: string) => {
    onupdate?.({ ...user, name: new_name });
  };
</script>
```

### Don't Use Server Load Functions

```typescript
// ❌ WRONG - +page.server.ts for static site
// /src/routes/users/+page.server.ts
export const load = async ({ fetch }) => {
  const users = await fetch('/api/users');
  return { users };
};

// ✅ CORRECT - Use +page.ts OR onMount()
// /src/routes/users/+page.ts
export const load: PageLoad = async ({ fetch }) => {
  const response = await fetch('/api/users');
  const users = await response.json();
  return { users };
};

// ✅ OR in component with onMount()
<script lang="ts">
  import { onMount } from 'svelte';

  let users = $state([]);

  onMount(async () => {
    const response = await fetch('/api/users');
    users = await response.json();
  });
</script>
```

---

## TypeScript Integration

### Type Definitions

```typescript
<script lang="ts">
  // Define types for your data
  interface User {
    id_user: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
  }

  interface Product {
    id_product: string;
    name: string;
    price: number;
    in_stock: boolean;
  }

  // Use types in state
  let current_user = $state<User | null>(null);
  let products = $state<Product[]>([]);

  // Type function parameters and returns
  const user_get = async (id_user: string): Promise<User> => {
    const response = await fetch(`/api/user/${id_user}`);
    if (!response.ok) throw new Error('User not found');
    return response.json();
  };
</script>
```

### Generics in Components

```typescript
<script lang="ts" generics="T">
  interface Props<T> {
    items: T[];
    render_item: (item: T) => string;
    onselect?: (item: T) => void;
  }

  let {
    items,
    render_item,
    onselect
  }: Props<T> = $props();

  const handle_item_click = (item: T) => {
    onselect?.(item);
  };
</script>

<ul>
  {#each items as item}
    <li onclick={() => handle_item_click(item)}>
      {render_item(item)}
    </li>
  {/each}
</ul>
```

**Using the generic component:**

```typescript
<script lang="ts">
  import GenericList from './GenericList.svelte';

  interface User {
    id_user: string;
    name: string;
  }

  let users: User[] = $state([
    { id_user: '1', name: 'John' },
    { id_user: '2', name: 'Jane' }
  ]);

  const render_user = (user: User) => user.name;
  const handle_user_select = (user: User) => {
    console.log('Selected:', user);
  };
</script>

<GenericList
  items={users}
  render_item={render_user}
  onselect={handle_user_select}
/>
```

### Event Types

```typescript
<script lang="ts">
  // Mouse events
  const handle_click = (event: MouseEvent) => {
    const button = event.currentTarget as HTMLButtonElement;
    console.log('Button clicked:', button.textContent);
  };

  // Keyboard events
  const handle_keydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  };

  // Form events
  const handle_submit = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
  };

  // Input events
  const handle_input = (event: Event) => {
    const input = event.target as HTMLInputElement;
    console.log('Value:', input.value);
  };

  // Custom callback types
  type ItemCallback = (item: { id_item: string; name: string }) => void;

  const handle_item_select: ItemCallback = (item) => {
    console.log('Selected:', item);
  };
</script>
```

---

## Available UI Components

LiWE3 library provides UI components via `@liwe3/webcomponents-svelte`.
**USE THESE COMPONENTS** wherever possible to ensure consistency.

**Import example:**

```typescript
import { SmartSelect, Toasts, toastAdd } from '@liwe3/webcomponents-svelte';
import type { SelectOption } from '@liwe3/webcomponents';
```

**IMPORTANT:** Before using any component below, **READ its documentation first**.
Each doc contains: Props, Events, Methods, TypeScript types, and working examples.

| Component         | Description                                                          | Documentation                                                    |
| ----------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AIMarkdownEditor  | Markdown editor with AI-powered text continuation and settings panel | [Docs](/work/agent/frontend/webcomponents/ai-markdown-editor.md) |
| AITextEditor      | Text editor with AI-powered text continuation                        | [Docs](/work/agent/frontend/webcomponents/ai-text-editor.md)     |
| ButtonToolbar     | Customizable toolbar with grouped buttons                            | [Docs](/work/agent/frontend/webcomponents/button-toolbar.md)     |
| CheckList         | Checklist component for managing checkable items                     | [Docs](/work/agent/frontend/webcomponents/check-list.md)         |
| ChunkUploader     | File uploader with chunked upload support for large files            | [Docs](/work/agent/frontend/webcomponents/chunk-uploader.md)     |
| ContainerBox      | Container with optional popover menu                                 | [Docs](/work/agent/frontend/webcomponents/container-box.md)      |
| DateSelector      | Date picker with optional date range selection                       | [Docs](/work/agent/frontend/webcomponents/date-selector.md)      |
| Dialogs           | Modal dialog system for confirmations and alerts                     | [Docs](/work/agent/frontend/webcomponents/dialogs.md)            |
| Drawer            | Collapsible drawer/sidebar with expand, shrink, and close states     | [Docs](/work/agent/frontend/webcomponents/drawer.md)             |
| MarkdownPreview   | Renders Markdown content as HTML                                     | [Docs](/work/agent/frontend/webcomponents/markdown-preview.md)   |
| PopoverMenu       | Popover menu for contextual actions                                  | [Docs](/work/agent/frontend/webcomponents/popover-menu.md)       |
| ResizableCropper  | Resizable and croppable container for images                         | [Docs](/work/agent/frontend/webcomponents/resizable-cropper.md)  |
| SmartSelect       | Advanced dropdown with search, multi-select, and keyboard navigation | [Docs](/work/agent/frontend/webcomponents/smart-select.md)       |
| SortableContainer | Drag-and-drop container for reordering elements                      | [Docs](/work/agent/frontend/webcomponents/sortable-container.md) |
| Toasts            | Toast notification system for temporary messages                     | [Docs](/work/agent/frontend/webcomponents/toasts.md)             |
| TreeView          | Hierarchical tree view for nested data                               | [Docs](/work/agent/frontend/webcomponents/tree-view.md)          |

### When to Fetch Documentation

- **Using a component?** - Read its linked doc for props, events, and types
- **Need a dropdown/select?** - See `SmartSelect`
- **Need notifications?** - See `Toasts`
- **Need modals/confirms?** - See `Dialogs`
- **Need file uploads?** - See `ChunkUploader`
- **Need date picking?** - See `DateSelector`
- **Need drag-and-drop sorting?** - See `SortableContainer`
- **Need a sidebar/panel?** - See `Drawer`
- **Need hierarchical data display?** - See `TreeView`
- **Need AI-assisted writing?** - See `AIMarkdownEditor` or `AITextEditor`

---

## Related Documentation

- **General guidelines**: `/work/agent/guides/DEVELOPMENT_GUIDELINES.md`
- **Backend API reference**: `/work/agent/backend/API_REFERENCE.md`
- **Module organization**: `/work/agent/backend/MODULE_CREATION.md`
- **Component documentation**: `/work/agent/frontend/webcomponents/`

---

## Quick Reference Checklist

Before writing any Svelte component, verify:

- ✅ Using `<script lang="ts">`
- ✅ Props defined with `$props()` and typed interface
- ✅ State using `$state()`
- ✅ Derived state using `$derived.by()` (NOT `$derived()`)
- ✅ Event names are all lowercase
- ✅ IDs have `id_` prefix
- ✅ Snake_case for variables and functions
- ✅ Noun before verb in function names
- ✅ No `any` types anywhere
- ✅ Event handlers typed (MouseEvent, SubmitEvent, etc.)
- ✅ Using LiWE3 components where applicable
- ✅ Data fetching in `onMount()` or `+page.ts` (NOT `+page.server.ts`)
- ✅ Callback props for parent communication (NOT createEventDispatcher)
- ✅ Proper cleanup in `onDestroy()` when needed

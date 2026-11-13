# Multi-Tier Domain System Specification

This specification outlines the required changes and additions to the **System Module** to implement the Multi-Tier Domain structure in the LiWE ecosystem. All new API endpoints **must** use the `/api/system` base path.

---

## 1. Data Model Updates: `SystemDomain`

The `SystemDomain` interface/type (likely in `server/modules/system/types.ts`) must be extended to support the domain hierarchy and the consumption-based tier limit model.

| Field Name                  | Type             | Constraint/Context                         | Description                                                                                                                                                                 |
| :-------------------------- | :--------------- | :----------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`total_max_tiers`** (New) | `number \| null` | Only set on domains that can have children | The maximum number of tiers that can be allocated to **direct children** of this domain. Set by `admin` on root domains, or by `multi-tier` users when creating subdomains. |
| **`tiers_allocated`** (New) | `number`         | Required, default: 0                       | The sum of `total_max_tiers` values of all **direct children** of this domain. Dynamically updated when children are created or deleted.                                    |

**Note:** The `parent_code` field is **NOT** needed. Parent domain relationships are determined by parsing the domain `code` field (e.g., "A:B:C" has parent "A:B", which has parent "A").

---

## 2. New Permissions and Roles

The following permissions must be defined and checked on the corresponding endpoints:

| Role             | Permission                     | Description                                                                                                        | Required Endpoint                      |
| :--------------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| **`admin`**      | `system.admin`                 | Super user permission that supersedes all other permissions. Can create root domains and manage all configuration. | `/api/system/admin/domain/create_root` |
| **`multi-tier`** | `domain.multi-tier.create_sub` | Ability to create subdomains and assign roles within their domain hierarchy.                                       | `/api/system/domain/subdomain/create`  |
| **`user`**       | N/A                            | Standard user role with no domain creation privileges.                                                             | N/A                                    |

**Note:** The old `system.domain.manage` permission is superseded by the new structure. Only `system.admin` maintains full system access.

---

## 3. Utility Implementation

### A. Domain Segment Code Generation

Implement the following function in `server/modules/system/utils.ts` to generate the unique code segment for new domains.

```javascript
/**
 * Generates a unique, base-36 code segment for a new domain.
 * This will be used as the complete code for root domains, or appended
 * to the parent_code using the ":" separator for subdomains.
 */
export const generate_domain_segment_code = (): string => {
  const start_time = new Date("2025-10-09 11:00:00").getTime();
  const dom = ((new Date().getTime() - start_time) / 1000 / 60).toString(36);
  return dom;
};
```

### B. Parent Domain Resolution

Implement a utility function to extract the parent domain code from a domain code:

```javascript
/**
 * Extracts the parent domain code from a given domain code.
 * Returns null if the domain is a root domain (no ":" separator).
 *
 * Examples:
 * - "A:B:C" -> "A:B"
 * - "A:B" -> "A"
 * - "A" -> null
 */
export const get_parent_domain_code = (domain_code: string): string | null => {
  const parts = domain_code.split(":");
  if (parts.length === 1) {
    return null; // Root domain
  }
  parts.pop(); // Remove last segment
  return parts.join(":");
};
```

### C. Tier Validation Logic (Crucial Business Logic)

The primary complexity is validating the tier allocation. A dedicated service function (e.g., `validateTierAllocation`) must be implemented.

**Validation Rules:**

1. **Determine Parent Domain:** Extract parent code from current user's domain using `get_parent_domain_code(req.user.domain)`. If creating a subdomain under the user's own domain, the parent is `req.user.domain`.

2. **Find Parent Domain:** Query `COLL_SYSTEM_DOMAINS` to retrieve the parent domain record.

3. **Check Parent's Available Budget:**

   - Parent must have a `total_max_tiers` value set
   - Calculate parent's remaining budget: `remaining = parent.total_max_tiers - parent.tiers_allocated`
   - Validate: `requested_tiers_allocated ≤ remaining`

4. **If validation passes:**
   - Create the new subdomain with `total_max_tiers = requested_tiers_allocated`
   - Update parent's `tiers_allocated`: `parent.tiers_allocated += requested_tiers_allocated`

**Important:** Each domain only tracks its **direct children's** tier consumption. Grandchildren do not affect a grandparent's `tiers_allocated`.

**Example Flow:**

```
Initial State:
- Root A: total_max_tiers=5, tiers_allocated=0

Create A:B with 3 tiers:
- A:B: total_max_tiers=3, tiers_allocated=0
- A: tiers_allocated=3 (updated)
- Validation: 3 ≤ (5-0) ✓

Create A:C with 2 tiers:
- A:C: total_max_tiers=2, tiers_allocated=0
- A: tiers_allocated=5 (updated: 3+2)
- Validation: 2 ≤ (5-3) ✓

Create A:B:X with 1 tier:
- A:B:X: total_max_tiers=1, tiers_allocated=0
- A:B: tiers_allocated=1 (updated)
- A: tiers_allocated=5 (unchanged - grandchildren don't affect)
- Validation: 1 ≤ (3-0) ✓
```

---

## 4. API Endpoint Specifications

All new endpoints must be implemented within the `system` module's router/controller.

### A. Admin Endpoints (Requires `system.admin`)

| Endpoint                               | Method   | Request Body/Query                        | Logic Requirements                                                                                                                                                                                              |
| :------------------------------------- | :------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/system/admin/domain/create_root` | **POST** | `name: string`, `total_max_tiers: number` | 1. Generate complete domain `code` using `generate_domain_segment_code()`. 2. Insert the domain with `tiers_allocated: 0`, and the provided `total_max_tiers`. 3. Must use the `system.admin` permission check. |

### B. Multi-Tier User Endpoints (Requires `domain.multi-tier.create_sub`)

This section contains the main workflow for the `multi-tier` user.

#### 1. Create Subdomain and Auto-Provision Admin

| Endpoint                              | Method   | Request Body/Query                        | Logic Requirements                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------------------------ | :------- | :---------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/system/domain/subdomain/create` | **POST** | `name: string`, `tiers_allocated: number` | **1. Authentication:** Check for `domain.multi-tier.create_sub` in `req.user.perms`. **2. Get Parent Domain:** Parent domain is `req.user.domain`. **3. Tier Validation:** Validate that `tiers_allocated ≤ (parent.total_max_tiers - parent.tiers_allocated)`. **4. Domain Creation:** Generate unique code segment, form `new_domain_code` as `req.user.domain:generated_code`, insert new domain with `total_max_tiers: tiers_allocated`, `tiers_allocated: 0`, `name: name`. **5. Update Parent:** Update parent domain's `tiers_allocated += tiers_allocated`. **6. User Auto-Provisioning:** Create new user: Username: `${new_domain_code}-admin`, Email: `${new_domain_code}-admin@example.com`, Domain: `new_domain_code`, Permissions: `["domain.multi-tier.create_sub"]`, Password: `sha512(mkid('pwd'))`, Enabled: `true`, Language: `req.user.language`. |

#### 2. List Managed Domains

| Endpoint                                    | Method  | Request Body/Query                         | Logic Requirements                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| :------------------------------------------ | :------ | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/api/system/domain/subdomain/list_managed` | **GET** | Optional: `deep: boolean` (default `true`) | **1. Context:** Use the current user's domain: `user_domain_code = req.user.domain`. **2. Database Query:** Query `COLL_SYSTEM_DOMAINS` for all records where: (a) `code` equals `user_domain_code` (own domain), OR (b) `code` starts with `${user_domain_code}:` (direct and nested children). If `deep=false`, only return domains where `code` matches `${user_domain_code}:[^:]+$` (direct children only, no nested). **3. Return:** The list of matching domain objects. |

#### 3. Assign Role to User

| Endpoint                              | Method   | Request Body/Query                                | Logic Requirements                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :------------------------------------ | :------- | :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/system/domain/user/assign_role` | **POST** | `id_user: string`, `role: 'multi-tier' \| 'user'` | **1. Authorization:** Ensure `req.user` has `domain.multi-tier.create_sub`. **2. Get Target User:** Retrieve the user with `id_user`. **3. Scope Check:** Verify that the target user's `domain` field either equals `req.user.domain` or starts with `req.user.domain:` (is in a subdomain). **4. Update User:** Set the target user's `perms` array: `multi-tier` maps to `["domain.multi-tier.create_sub"]`, and `user` maps to an empty array `[]`. |

---

## 5. Domain Deletion Rules

When a domain is deleted (via existing endpoints or new ones):

1. **Determine Children:** Find all domains where `code` starts with `deleted_domain_code:`.

2. **Cascade Delete:** Delete all child domains recursively **without confirmation**.

3. **User Deletion:** Delete all users where `user.domain` equals the deleted domain code or any deleted child domain code **without confirmation**.

4. **Parent Update:**

   - Determine parent domain using `get_parent_domain_code(deleted_domain_code)`
   - If parent exists, update parent's `tiers_allocated` by subtracting the deleted domain's `total_max_tiers`

5. **Event Chain:** The standard `USER_EVENT_PRE_DELETE` event should be triggered for each user to allow other modules to clean up related data.

---

## 6. Domain Modification Rules

### Updating `total_max_tiers`

A domain's `total_max_tiers` can be updated by:

- An `admin` user (with `system.admin` permission)
- A `multi-tier` user who **created** that specific domain (track creator in domain record via `created_by` field)

**Validation:**

- If not a root domain:
  - Determine parent using `get_parent_domain_code(domain.code)`
  - Cannot increase beyond parent's available budget: `new_value ≤ (parent.total_max_tiers - parent.tiers_allocated + current_domain.total_max_tiers)`
  - Update parent's `tiers_allocated` accordingly
- Cannot decrease below current `tiers_allocated` (would invalidate existing children)

### Updating `tiers_allocated`

This field is **automatically managed** by the system and should not be directly editable via API. It updates when:

- A child domain is created (increment by child's `total_max_tiers`)
- A child domain is deleted (decrement by child's `total_max_tiers`)
- A child domain's `total_max_tiers` is modified (adjust difference)

---

## 7. Migration Strategy for Existing Domains

On system startup or during module initialization:

1. Query all existing domains in `COLL_SYSTEM_DOMAINS`
2. For any domain without `total_max_tiers` or `tiers_allocated` fields:
   - If domain code contains no ":" (root domain):
     - Set `total_max_tiers: 1` (minimum viable default)
     - Set `tiers_allocated: 0`
   - If domain code contains ":" (was created as subdomain somehow):
     - Set `total_max_tiers: 0` (cannot create children)
     - Set `tiers_allocated: 0`
     - **Warning:** Log this case as it indicates pre-existing hierarchy
3. Save the updated domain records

---

## 8. Auto-Provisioned Admin User Specifications

When creating a subdomain via `/api/system/domain/subdomain/create`:

| Field           | Value                                                        |
| :-------------- | :----------------------------------------------------------- |
| **Username**    | `${new_domain_code}-admin` (e.g., "A:B-admin")               |
| **Email**       | `${new_domain_code}-admin@example.com`                       |
| **Domain**      | `new_domain_code`                                            |
| **Password**    | `sha512(mkid('pwd'))` - random, secure, only admin can reset |
| **Enabled**     | `true`                                                       |
| **Language**    | `req.user.language` (inherit from creator)                   |
| **Permissions** | `["domain.multi-tier.create_sub"]`                           |

---

## 9. Session and Domain Context

The existing `system_domain_get_by_session(req)` function should:

- Return the user's **exact domain** (value of `req.user.domain`)
- NOT traverse up to find a parent or root domain
- Users are locked to their specific domain level

---

## 10. Database Indexes

Update `system_db_init` to ensure proper indexing:

```javascript
await adb_collection_init(
	liwe.db,
	COLL_SYSTEM_DOMAINS,
	[
		{ type: 'persistent', fields: [ 'id' ], unique: true },
		{ type: 'persistent', fields: [ 'code' ], unique: true },
		{ type: 'persistent', fields: [ 'visible' ], unique: false },
		{ type: 'persistent', fields: [ 'created_by' ], unique: false }, // New
	],
	{ drop: false },
);
```

---

## 11. Implementation Checklist

- [ ] Update `SystemDomain` type with new fields (`total_max_tiers`, `tiers_allocated`, `created_by`)
- [ ] Create `utils.ts` with generation, parent resolution, and validation functions
- [ ] Implement `/api/system/admin/domain/create_root` endpoint
- [ ] Implement `/api/system/domain/subdomain/create` endpoint with auto-provisioning
- [ ] Implement `/api/system/domain/subdomain/list_managed` endpoint
- [ ] Implement `/api/system/domain/user/assign_role` endpoint
- [ ] Add cascade deletion logic to existing domain deletion endpoints
- [ ] Add migration logic to `system_db_init()` for existing domains
- [ ] Update database indexes for new fields
- [ ] Add `domain.multi-tier.create_sub` permission to permissions registry
- [ ] Write tests for tier validation edge cases
- [ ] Document the new permission model

---

## 12. Error Messages

Standard error responses for common validation failures:

| Scenario                 | Error Message                                                                                      |
| :----------------------- | :------------------------------------------------------------------------------------------------- |
| Insufficient tier budget | "Insufficient tiers available. Parent domain has X tiers allocated out of Y maximum. Requested: Z" |
| Invalid parent domain    | "Parent domain not found or is invalid"                                                            |
| Permission denied        | "You do not have permission to create subdomains in this domain"                                   |
| User not in scope        | "Target user is not within your domain hierarchy"                                                  |
| Cannot reduce tiers      | "Cannot reduce total_max_tiers below currently allocated tiers (X allocated)"                      |
| Domain not found         | "Domain with code '...' not found"                                                                 |
| Root domain modification | "Cannot modify root domain hierarchy without system.admin permission"                              |

---

**End of Specification**

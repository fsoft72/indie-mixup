# Module: System

## Index

### Types

| Name                                                  | Description                       |
| ----------------------------------------------------- | --------------------------------- |
| [SystemDomain](#structure-system-domain)              | The multi-tier domain             |
| [SystemDomainAdmin](#structure-system-domain-admin)   | The multi-tier domain             |
| [SystemDomainPublic](#structure-system-domain-public) | The public info for a Domain      |
| [SystemTheme](#structure-system-theme)                | Handling of system theme settings |

### Endpoints

|            | Path                                                                 | Description                                     |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| **POST**   | [/system/admin/domain/add](#post-system-admin-domain-add)            | Adds a domain in the system                     |
| **DELETE** | [/system/admin/domain/del](#delete-system-admin-domain-del)          | Deletes a domain from the system                |
| **PATCH**  | [/system/admin/domain/update](#patch-system-admin-domain-update)     | Updates a domain in the system                  |
| **GET**    | [/system/admin/domains/list](#get-system-admin-domains-list)         | List all domains                                |
| **GET**    | [/system/admin/permissions/list](#get-system-admin-permissions-list) | Returns all permissions available on the system |
| **GET**    | [/system/domain/create/invite](#get-system-domain-create-invite)     | Creates an invitation token for a domain        |
| **POST**   | [/system/domain/set](#post-system-domain-set)                        | Set the current domain for the user             |
| **GET**    | [/system/domains/list](#get-system-domains-list)                     | List all visible domains                        |
| **POST**   | [/system/email/test](#post-system-email-test)                        | Test email sending                              |
| **GET**    | [/system/uptime](#get-system-uptime)                                 | Returns the system uptime (in seconds)          |

### Functions

| Name                                                          | Description                            |
| ------------------------------------------------------------- | -------------------------------------- |
| [system_db_init](#system_db_init)                             | Initializes system module              |
| [system_domain_get_by_code](#system_domain_get_by_code)       | Gets a domain by its code              |
| [system_domain_get_by_id](#system_domain_get_by_id)           | Gets a domain by its id                |
| [system_domain_get_by_session](#system_domain_get_by_session) | Gets a domain by user session          |
| [system_domain_get_default](#system_domain_get_default)       | Gets the default domain                |
| [system_permissions_register](#system_permissions_register)   | Add module's permissions to the system |

# Types

---

<a id="structure-system-domain"></a>

### SystemDomain

DB Table: `system_domains`

The multi-tier domain

| idx | Name    | Type    | size | req   | priv | Description              |
| --- | ------- | ------- | ---- | ----- | ---- | ------------------------ |
| u   | code    | str     | 30   | **Y** |      | The domain unique code   |
|     | name    | str     | 50   | **Y** |      | The domain name          |
| y   | visible | boolean |      | **Y** |      | If the domain is visible |

---

<a id="structure-system-domain-admin"></a>

### SystemDomainAdmin

The multi-tier domain

| idx | Name    | Type    | size | req   | priv | Description              |
| --- | ------- | ------- | ---- | ----- | ---- | ------------------------ |
| u   | code    | str     |      | **Y** |      | The domain unique code   |
|     | name    | str     |      | **Y** |      | The domain name          |
| y   | visible | boolean |      | **Y** |      | If the domain is visible |

---

<a id="structure-system-domain-public"></a>

### SystemDomainPublic

The public info for a Domain

| idx | Name | Type | size | req   | priv | Description |
| --- | ---- | ---- | ---- | ----- | ---- | ----------- |
|     | code | str  |      | **Y** |      |             |
|     | name | str  |      | **Y** |      |             |

---

<a id="structure-system-theme"></a>

### SystemTheme

DB Table: `system_themes`

Handling of system theme settings

| idx | Name | Type | size | req   | priv | Description     |
| --- | ---- | ---- | ---- | ----- | ---- | --------------- |
| u   | code | str  | 30   | **Y** |      | The domain code |
|     | data | json |      | **Y** |      | The Theme data  |

# Endpoints

---

<a id="get-system-domains-list"></a>

## **GET**&nbsp;`/system/domains/list`&nbsp;- List all visible domains

List all visible domains

##### Parameters:

| Name | Type | req | Description |
| ---- | ---- | --- | ----------- |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `system.domain` | The user can operate on system domains     |
| `public`        | Everyone can call this                     |
| `logged`        | Only autheticated users can call this      |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.theme`  | The user can manage system themes          |

##### Return: [SystemDomain](#structure-system-domain)

---

<a id="post-system-domain-set"></a>

## **POST**&nbsp;`/system/domain/set`&nbsp;- Set the current domain for the user

Set the provided domain to the current user.
Domain is defined by the `code` parameter.

##### Parameters:

| Name | Type | req   | Description            |
| ---- | ---- | ----- | ---------------------- |
| code | str  | **Y** | the domain unique code |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `logged`        | Only autheticated users can call this      |
| `public`        | Everyone can call this                     |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.domain` | The user can operate on system domains     |
| `system.theme`  | The user can manage system themes          |

##### Return: [SystemDomain](#structure-system-domain)

---

<a id="post-system-admin-domain-add"></a>

## **POST**&nbsp;`/system/admin/domain/add`&nbsp;- Adds a domain in the system

Adds a new domain to the System.

##### Parameters:

| Name    | Type    | req | Description                                     |
| ------- | ------- | --- | ----------------------------------------------- |
| code    | str     |     | the domain unique code                          |
| name    | str     |     | the domain name                                 |
| visible | boolean |     | if the domain is visible or not [default: true] |

###### Permissions:

| name            | description                            |
| --------------- | -------------------------------------- |
| `system.domain` | The user can operate on system domains |

##### Return: [SystemDomain](#structure-system-domain)

---

<a id="patch-system-admin-domain-update"></a>

## **PATCH**&nbsp;`/system/admin/domain/update`&nbsp;- Updates a domain in the system

Updates a domain in the system. The `code` field must be provided, while both `name` and `visible` are optional.
If `name` or `visible` are defined, they will be updated accordingly, otherwise, the existing values will remain unchanged. After updating the domain, the system will reflect the changes made to the specified `code` field.

##### Parameters:

| Name    | Type    | req   | Description                     |
| ------- | ------- | ----- | ------------------------------- |
| code    | str     | **Y** | the domain unique code          |
| name    | str     |       | the domain name                 |
| visible | boolean |       | if the domain is visible or not |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `system.domain` | The user can operate on system domains     |
| `public`        | Everyone can call this                     |
| `logged`        | Only autheticated users can call this      |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.theme`  | The user can manage system themes          |

##### Return: [SystemDomain](#structure-system-domain)

---

<a id="delete-system-admin-domain-del"></a>

## **DELETE**&nbsp;`/system/admin/domain/del`&nbsp;- Deletes a domain from the system

Delete a domain from the system. You must specify the domain `code`.

##### Parameters:

| Name | Type | req   | Description            |
| ---- | ---- | ----- | ---------------------- |
| code | str  | **Y** | the domain unique code |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `system.domain` | The user can operate on system domains     |
| `public`        | Everyone can call this                     |
| `logged`        | Only autheticated users can call this      |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.theme`  | The user can manage system themes          |

##### Return: str

---

<a id="get-system-admin-domains-list"></a>

## **GET**&nbsp;`/system/admin/domains/list`&nbsp;- List all domains

List all domains

##### Parameters:

| Name | Type | req | Description |
| ---- | ---- | --- | ----------- |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `system.domain` | The user can operate on system domains     |
| `public`        | Everyone can call this                     |
| `logged`        | Only autheticated users can call this      |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.theme`  | The user can manage system themes          |

##### Return: [SystemDomainAdmin](#structure-system-domain-admin)

---

<a id="post-system-email-test"></a>

## **POST**&nbsp;`/system/email/test`&nbsp;- Test email sending

This endpoint tests email sending.

You can specify the destination email address to send the message to, but the message itself is defined by the app.

##### Parameters:

| Name  | Type | req | Description               |
| ----- | ---- | --- | ------------------------- |
| email | str  |     | Destination email address |

###### Permissions:

| name     | description                           |
| -------- | ------------------------------------- |
| `logged` | Only autheticated users can call this |

##### Return: boolean

---

<a id="get-system-admin-permissions-list"></a>

## **GET**&nbsp;`/system/admin/permissions/list`&nbsp;- Returns all permissions available on the system

Returns all the permissions available in the System.
The list depends also on the user's permissions:

- If the user has `system.admin`, the endpoint will return **all permissions** available
- if the user doesn't have `system.admin` the endpoint will return **only the permissions the user already has**.

Permissions are returned in an object with: `module name` as key and a string list of permissions available for that module.

##### Parameters:

| Name | Type | req | Description |
| ---- | ---- | --- | ----------- |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `logged`        | Only autheticated users can call this      |
| `public`        | Everyone can call this                     |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.domain` | The user can operate on system domains     |
| `system.theme`  | The user can manage system themes          |

##### Return: json

---

<a id="get-system-domain-create-invite"></a>

## **GET**&nbsp;`/system/domain/create/invite`&nbsp;- Creates an invitation token for a domain

This endpoint creates an invitation token for a domain.

The invitation can have an `expire` date, so you can create temporary tokens.
The `expire` field is expressed in `minutes`. If you specify a value different that `0`, the token will last the `expire` minutes.
If the `expire` is set to `0` (default), the token does not expire.

##### Parameters:

| Name   | Type | req   | Description                             |
| ------ | ---- | ----- | --------------------------------------- |
| code   | str  | **Y** | The Domain unique code                  |
| expire | int  | **Y** | The amount of minutes the link is valid |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `logged`        | Only autheticated users can call this      |
| `public`        | Everyone can call this                     |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.domain` | The user can operate on system domains     |
| `system.theme`  | The user can manage system themes          |

##### Return: str

---

<a id="get-system-uptime"></a>

## **GET**&nbsp;`/system/uptime`&nbsp;- Returns the system uptime (in seconds)

Returns the system uptime (in seconds)

##### Parameters:

| Name | Type | req | Description |
| ---- | ---- | --- | ----------- |

###### Permissions:

| name            | description                                |
| --------------- | ------------------------------------------ |
| `public`        | Everyone can call this                     |
| `logged`        | Only autheticated users can call this      |
| `admins`        |                                            |
| `system.admin`  | The super user permission to do everything |
| `system.domain` | The user can operate on system domains     |
| `system.theme`  | The user can manage system themes          |

##### Return: number

# Functions

---

<a id="system_domain_get_default"></a>

## system_domain_get_default - Gets the default domain

This function returns a `SystemDomain` structure by its id.

| Name | Type | req | Description |
| ---- | ---- | --- | ----------- |

#### Return: [SystemDomain](#structure-system-domain)

---

<a id="system_domain_get_by_id"></a>

## system_domain_get_by_id - Gets a domain by its id

This function returns a `SystemDomain` structure by its id.

| Name | Type | req | Description   |
| ---- | ---- | --- | ------------- |
| id   | str  |     | The Domain id |

#### Return: [SystemDomain](#structure-system-domain)

---

<a id="system_domain_get_by_code"></a>

## system_domain_get_by_code - Gets a domain by its code

This function returns a `SystemDomain` structure by its code.

| Name | Type | req | Description     |
| ---- | ---- | --- | --------------- |
| code | str  |     | The Domain code |

#### Return: [SystemDomain](#structure-system-domain)

---

<a id="system_domain_get_by_session"></a>

## system_domain_get_by_session - Gets a domain by user session

This function returns a `SystemDomain` structure by its code.

| Name | Type      | req | Description                 |
| ---- | --------- | --- | --------------------------- |
| req  | ilrequest |     | The current session request |

#### Return: [SystemDomain](#structure-system-domain)

---

<a id="system_db_init"></a>

## system_db_init - Initializes system module

This function initializes the module database tables.

| Name | Type  | req | Description      |
| ---- | ----- | --- | ---------------- |
| liwe | iliwe |     | LiWE full config |

#### Return: boolean

---

<a id="system_permissions_register"></a>

## system_permissions_register - Add module's permissions to the system

This function is called by every module during the initialization phase.
The module calls this function to pass its permissions and descriptions to the system.

This data is consumed by `/system/admin/permissions/list` endpoint

| Name   | Type | req | Description            |
| ------ | ---- | --- | ---------------------- |
| module | str  |     | The module name        |
| perms  | json |     | The module permissions |

#### Return: boolean

#!/usr/bin/env python3

"""Helpers shared by more than one backend generator."""


def perm_const_name(perm_name: str, mod_name: str) -> str:
	"""
	Build the TypeScript constant name for a permission, matching what
	gen_be_perms emits in perms.ts.

	`user.list` in module `user` -> `USER_PERM_LIST`.

	@param perm_name: the permission name (e.g. "user.list", "system.admin")
	@param mod_name: the owning module name in snake_case
	@return: the constant identifier
	"""
	suffix = perm_name.split(".", 1)[1] if "." in perm_name else perm_name
	const_suffix = suffix.replace("-", "_").replace(".", "_").upper()
	return f"{mod_name.upper()}_PERM_{const_suffix}"

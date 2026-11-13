#!/usr/bin/env python3

import os
from lib.types import Module
from texts import texts as TEMPL
from _shared import perm_const_name


def generate_be_perms(self, mod: Module, output: str):
	"""Generate the perms.ts file"""
	mod_name = self.mod_name(mod)

	outfile = os.path.join(output, "src", "perms.ts")
	out = self.create_file(outfile, mod)

	permissions_const = f"{mod_name.upper()}_PERMISSIONS"

	snippets = {
		"__mod_name": mod_name,
		"__mod_name_camel": mod_name.capitalize(),
		"__permissions_const": permissions_const,
	}

	out.write(TEMPL["PERMS_FILE_START"] % snippets)

	def _const_name(perm) -> str:
		return perm_const_name(perm.name, mod_name)

	out.write(TEMPL["PERMS_CONSTANTS_START"])
	for perm in mod.permissions.values():
		const_name = _const_name(perm)
		out.write(TEMPL["PERMS_CONST_ROW"] % {"const_name": const_name, "perm_name": perm.name})
	out.write(TEMPL["PERMS_CONSTANTS_END"])

	out.write(TEMPL["PERMS_ARRAY_START"] % snippets)

	for perm in mod.permissions.values():
		description = perm.description.replace("'", "\\'")
		out.write(TEMPL["PERMS_ROW"] % {"name": _const_name(perm), "description": description})

	out.write(TEMPL["PERMS_FILE_END"] % snippets)

	out.close()
	print("Generated", outfile)

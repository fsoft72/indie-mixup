#!/usr/bin/env python3

import os
from lib.types import Module
from texts import texts as TEMPL


def generate_fe_index(self, mod: Module, output: str):
	"""Generate the index.ts file that exports everything from types.ts and actions.ts"""
	mod_name = self.mod_name(mod)

	has_types = mod.types and len(mod.types) > 0
	has_endpoints = mod.endpoints and len(mod.endpoints) > 0

	if not has_types and not has_endpoints:
		print(f"Skipping frontend index generation - no types or endpoints found")
		return

	src_dir = os.path.join(output, "src")
	os.makedirs(src_dir, exist_ok=True)

	outfile = os.path.join(src_dir, "index.ts")
	out = self.create_file(outfile, mod)

	if has_types:
		out.write("export * from './types';\n")

	if has_endpoints:
		out.write("export * from './actions';\n")

	index_snippet = self.snippets["index"]
	if not index_snippet:
		index_snippet = "\n// Add custom exports here\n"

	out.write(TEMPL["INDEX_CUSTOM_BLOCK"] % {"index_snippet": index_snippet})

	out.close()
	print(f"Generated {outfile}")

#!/usr/bin/env python3

import os
from lib.types import Module
from texts import texts as TEMPL

# Core backend package, relative to the repo root (flow2code runs from there)
CORE_BACKEND_DIR = "liwe3/backend/core"


def generate_be_config(self, mod: Module, output: str):
	"""Generate package.json, tsconfig.json, and vitest.config.ts only if they don't exist"""
	mod_name = self.mod_name(mod)
	mod_name_camel = mod.name

	package_json_path = os.path.join(output, "package.json")
	if not os.path.exists(package_json_path):
		content = TEMPL["BE_PACKAGE_JSON"] % {
			'__mod_name': mod_name,
			'__mod_name_camel': mod_name_camel
		}
		with self.create_file(package_json_path, mod) as f:
			f.write(content)
		print(f"Generated {package_json_path}")
	else:
		print(f"Skipped {package_json_path} (already exists)")

	tsconfig_path = os.path.join(output, "tsconfig.json")
	if not os.path.exists(tsconfig_path):
		with self.create_file(tsconfig_path, mod) as f:
			# Project reference to the core backend, so the single `tsc -b` watcher can build this module
			core_ref = os.path.relpath(CORE_BACKEND_DIR, output)
			f.write(TEMPL["BE_TSCONFIG_JSON"] % {'__core_ref': core_ref})
		print(f"Generated {tsconfig_path}")
	else:
		print(f"Skipped {tsconfig_path} (already exists)")

	vitest_config_path = os.path.join(output, "vitest.config.ts")
	if not os.path.exists(vitest_config_path):
		with self.create_file(vitest_config_path, mod) as f:
			f.write(TEMPL["BE_VITEST_CONFIG"])
		print(f"Generated {vitest_config_path}")
	else:
		print(f"Skipped {vitest_config_path} (already exists)")

#!/usr/bin/env python3

import os
from lib.types import Module
from texts import texts as TEMPL


def generate_fe_config(self, mod: Module, output: str):
	"""Generate package.json, tsconfig.json, and vitest.config.ts only if they don't exist"""
	mod_name = self.mod_name(mod)
	mod_name_camel = mod.name

	package_json_path = os.path.join(output, "package.json")
	if not os.path.exists(package_json_path):
		content = TEMPL["FE_PACKAGE_JSON"] % {
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
		content = TEMPL["FE_TSCONFIG_JSON"] % {
			'__mod_name': mod_name
		}
		with self.create_file(tsconfig_path, mod) as f:
			f.write(content)
		print(f"Generated {tsconfig_path}")
	else:
		print(f"Skipped {tsconfig_path} (already exists)")

	vitest_config_path = os.path.join(output, "vitest.config.ts")
	if not os.path.exists(vitest_config_path):
		with self.create_file(vitest_config_path, mod) as f:
			f.write(TEMPL["FE_VITEST_CONFIG"])
		print(f"Generated {vitest_config_path}")
	else:
		print(f"Skipped {vitest_config_path} (already exists)")

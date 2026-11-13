#!/usr/bin/env python3

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from lib.types import Module
from lib.json_to_drizzle import json_to_drizzle
from texts import texts as TEMPL


def generate_be_schema(self, mod: Module, output: str):
	"""Generate the schema.ts file with Drizzle ORM table definitions"""
	mod_name = self.mod_name(mod)

	types_with_db = []
	for type_obj in mod.types.values():
		if hasattr(type_obj, "coll_table") and type_obj.coll_table:
			types_with_db.append(type_obj)

	if not types_with_db:
		print(f"Skipping schema.ts generation - no types with coll_table found")
		return

	BUILTIN_TYPES = {
		"str", "string", "text", "int", "num", "number",
		"float", "double", "real", "bool", "boolean",
		"date", "datetime", "json", "obj", "object", "file", "upload",
	}

	custom_types_needed = set()
	for type_obj in types_with_db:
		for field in type_obj.fields:
			if field.type[0].value == "custom":
				custom_type_name = field.type[1]
				if custom_type_name.lower() in BUILTIN_TYPES:
					continue
				if custom_type_name in mod.types:
					referenced_type = mod.types[custom_type_name]
					if hasattr(referenced_type, "coll_table") and referenced_type.coll_table:
						continue
				if custom_type_name in mod.enums:
					custom_types_needed.add(custom_type_name)
					continue
				custom_types_needed.add(custom_type_name)

	outfile = os.path.join(output, "src", "schema.ts")
	out = self.create_file(outfile, mod)

	out.write(TEMPL["SCHEMA_FILE_START"])

	if custom_types_needed:
		type_imports = ", ".join(sorted(custom_types_needed))
		out.write(f"import type {{ {type_imports} }} from './types';\n\n")

	for type_obj in types_with_db:
		type_dict = {
			"name": type_obj.name,
			"description": "",
			"db_table": type_obj.coll_table,
			"fields": [],
		}

		for field in type_obj.fields:
			if not field.name or field.name.strip() == "":
				sys.stderr.write(f"WARNING: Skipping field without name in type '{type_obj.name}' (table: {type_obj.coll_table})\n")
				continue

			index_str = ""
			if hasattr(field, "idx_unique") and field.idx_unique:
				index_str = "u"
			elif hasattr(field, "idx_multi") and field.idx_multi:
				index_str = "y"
			elif hasattr(field, "idx_array") and field.idx_array:
				index_str = "*"
			elif hasattr(field, "idx_fulltext") and field.idx_fulltext:
				index_str = "f"

			field_dict = {
				"name": field.name,
				"type": field.type[1] if field.type[0].value == "custom" else field.type[0].value,
				"is_required": field.required,
				"is_array": field.is_array,
				"description": field.description,
				"size": field.size if hasattr(field, "size") else 0,
				"index": index_str,
			}
			type_dict["fields"].append(field_dict)

		drizzle_code = json_to_drizzle(type_dict)
		out.write(drizzle_code)
		out.write("\n\n")

	out.write(TEMPL["SCHEMA_FILE_END"])
	out.close()
	print(f"Generated {outfile}")

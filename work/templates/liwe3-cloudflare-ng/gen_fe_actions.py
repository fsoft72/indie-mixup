#!/usr/bin/env python3

import os
from lib.types import Module, Endpoint
from lib.const import FieldType
from texts import texts as TEMPL


# ==================================================================================================
# HELPER FUNCTIONS
# ==================================================================================================


def _create_action_name(ep: Endpoint, mod: Module) -> str:
	"""Create action function name from endpoint, e.g., GET /system/admin/users -> system_admin_users"""
	path = ep.path.replace("/api/", "/").replace("/api", "")
	path = path.lstrip("/")
	parts = []
	for part in path.split("/"):
		if not part.startswith(":"):
			parts.append(part.replace("-", "_").lower())
	return "_".join(parts)


def _get_typescript_return_type(ep: Endpoint, mod: Module = None) -> str:
	if not ep.return_type:
		return "any"

	return_type = ep.return_type.lower()

	if return_type in ["str", "string", "text"]:
		base = "string"
	elif return_type in ["int", "num", "number"]:
		base = "number"
	elif return_type in ["float", "double"]:
		base = "number"
	elif return_type in ["bool", "boolean", "check", "checkbox"]:
		base = "boolean"
	elif return_type in ["date"]:
		base = "string"
	elif return_type in ["datetime"]:
		base = "Date"
	elif return_type in ["file", "upload"]:
		base = "File"
	elif return_type in ["binary", "blob"]:
		base = "Blob"
	elif return_type in ["json", "obj", "object"]:
		base = "any"
	else:
		if mod:
			found = False
			for type_obj in mod.types.values():
				if type_obj.name == ep.return_type:
					base = type_obj.name
					found = True
					break
			if not found:
				for enum_obj in mod.enums.values():
					if enum_obj.name == ep.return_type:
						base = enum_obj.name
						found = True
						break
			if not found:
				base = ep.return_type
		else:
			base = "any"

	if ep.is_array:
		base += "[]"

	return base


def _get_params_type(ep: Endpoint, mod: Module) -> str:
	if not ep.parameters:
		return None

	fields = []
	for param in ep.parameters:
		opt = "?" if not param.required else ""

		if param.type[0] == FieldType.STR:
			ts_type = "string"
		elif param.type[0] == FieldType.NUMBER or param.type[0] == FieldType.FLOAT:
			ts_type = "number"
		elif param.type[0] == FieldType.BOOL:
			ts_type = "boolean"
		elif param.type[0] == FieldType.DATE:
			ts_type = "string"
		elif param.type[0] == FieldType.DATETIME:
			ts_type = "Date"
		elif param.type[0] == FieldType.FILE:
			ts_type = "File"
		elif param.type[0] == FieldType.OBJECT:
			ts_type = "any"
		elif param.type[0] == FieldType.CUSTOM:
			if len(param.type) > 1:
				custom_type_name = param.type[1]
				found = False
				for type_obj in mod.types.values():
					if type_obj.name == custom_type_name:
						ts_type = type_obj.name
						found = True
						break
				if not found:
					for enum_obj in mod.enums.values():
						if enum_obj.name == custom_type_name:
							ts_type = enum_obj.name
							found = True
							break
				if not found:
					ts_type = custom_type_name
			else:
				ts_type = "any"
		else:
			ts_type = "any"

		if param.is_array:
			ts_type += "[]"

		fields.append(f"\t{param.name}{opt}: {ts_type}")

	return "{\n" + ";\n".join(fields) + "\n}"


# ==================================================================================================
# MAIN GENERATION FUNCTION
# ==================================================================================================


def generate_fe_actions(self, mod: Module, output: str):
	"""Generate the actions.ts file with API client calls for each endpoint"""
	mod_name = self.mod_name(mod)

	if not mod.endpoints or len(mod.endpoints) == 0:
		print(f"Skipping actions generation - no endpoints found")
		return

	src_dir = os.path.join(output, "src")
	os.makedirs(src_dir, exist_ok=True)

	outfile = os.path.join(src_dir, "actions.ts")
	out = self.create_file(outfile, mod)

	# Collect custom types used in return types and parameters
	custom_types_needed = set()
	for ep in mod.endpoints.values():
		if ep.return_type:
			return_type_lower = ep.return_type.lower()
			if return_type_lower not in [
				"str", "string", "text", "int", "num", "number",
				"float", "double", "bool", "boolean", "check", "checkbox",
				"date", "datetime", "file", "upload", "binary", "blob", "json", "obj", "object",
			]:
				for type_obj in mod.types.values():
					if type_obj.name == ep.return_type:
						custom_types_needed.add(type_obj.name)
						break
				for enum_obj in mod.enums.values():
					if enum_obj.name == ep.return_type:
						custom_types_needed.add(enum_obj.name)
						break

		if ep.parameters:
			for param in ep.parameters:
				if param.type[0] == FieldType.CUSTOM and len(param.type) > 1:
					custom_type_name = param.type[1]
					for type_obj in mod.types.values():
						if type_obj.name == custom_type_name:
							custom_types_needed.add(type_obj.name)
							break
					for enum_obj in mod.enums.values():
						if enum_obj.name == custom_type_name:
							custom_types_needed.add(enum_obj.name)
							break

	# Write file header
	out.write(TEMPL["ACTIONS_FILE_START"])
	out.write("import type { LiWEActionOptions } from '@frontend/liwe3';\n")

	if custom_types_needed:
		type_imports = ", ".join(sorted(custom_types_needed))
		out.write(f"import type {{ {type_imports} }} from './types';\n")

	out.write("\n")

	actions_snippet = self.snippets["actions"]
	if not actions_snippet:
		actions_snippet = "\n// Add custom imports here\n"

	out.write(TEMPL["ACTIONS_HEADER_BLOCK"] % {"actions_snippet": actions_snippet})
	out.write(TEMPL["INTERNAL_CALL_HELPER"])

	for ep in mod.endpoints.values():
		_write_action(self, out, ep, mod)

	__actions_snippet = self.snippets["__actions"]
	if not __actions_snippet:
		__actions_snippet = "\n// Add custom actions here\n"

	out.write(TEMPL["ACTIONS_CUSTOM_BLOCK"] % {"__actions_snippet": __actions_snippet})

	out.close()
	print(f"Generated {outfile}")


def _write_action(self, out, ep: Endpoint, mod: Module):
	"""Write a single action function"""
	action_name = _create_action_name(ep, mod)
	method = ep.method.lower()
	path = ep.path if ep.path == "/api" or ep.path.startswith("/api/") else f"/api{ep.path}"
	return_type = _get_typescript_return_type(ep, mod)

	has_params = len(ep.parameters) > 0
	params_type = _get_params_type(ep, mod) if has_params else None

	if has_params:
		func_sig = f"export const {action_name} = async ( params: {params_type}, options?: LiWEActionOptions ): Promise<LiWEResponse<{return_type}>> => {{"
	else:
		func_sig = f"export const {action_name} = async ( options?: LiWEActionOptions ): Promise<LiWEResponse<{return_type}>> => {{"

	out.write(func_sig + "\n")

	# A "binary" endpoint streams its body (PDF, image, ...): apiClient.getBlob reads
	# it as a Blob, instead of parsing it as JSON like the HTTP-verb helpers do.
	is_binary = bool(ep.return_type) and ep.return_type.lower() in ("binary", "blob")
	api_method = "apiClient.getBlob" if is_binary else f"apiClient.{method}"

	if is_binary:
		out.write("\t// Binary endpoint: the body is streamed as a Blob, never JSON-parsed.\n")

	if has_params:
		out.write(f"\tconst res = await _internalCall<typeof params, {return_type}>( {api_method}, '{path}', params, options );\n")
	else:
		out.write(f"\tconst res = await _internalCall<undefined, {return_type}>( {api_method}, '{path}', undefined, options );\n")

	action_snippet = self.snippets[action_name]
	if not action_snippet:
		action_snippet = "\n\t// Add custom code here\n"

	out.write(TEMPL["ACTION_CODE_BLOCK"] % {"action_name": action_name, "action_snippet": action_snippet})

	out.write("\n\treturn res;\n")
	out.write("};\n\n")

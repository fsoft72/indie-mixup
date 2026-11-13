#!/usr/bin/env python3

import os

from texts import texts as TEMPL

from lib.const import FieldType
from lib.types import Endpoint, Field, Module

# ==================================================================================================
# HELPER FUNCTIONS
# ==================================================================================================


def _get_zod_type(field: Field, mod: Module = None) -> str:
	field_type = field.type[0]

	if field_type == FieldType.STR:
		base = "z.string()"
	elif field_type == FieldType.NUMBER:
		base = "z.coerce.number()"
	elif field_type == FieldType.FLOAT:
		base = "z.coerce.number()"
	elif field_type == FieldType.BOOL:
		base = """zodBoolean"""
	elif field_type == FieldType.DATE:
		base = "z.string()"
	elif field_type == FieldType.DATETIME:
		base = "z.coerce.date()"
	elif field_type == FieldType.FILE:
		base = "z.any()"
	elif field_type == FieldType.OBJECT:
		base = "z.any()"
	elif field_type == FieldType.CUSTOM:
		if len(field.type) > 1:
			custom_type = field.type[1]
			if custom_type == "datetime":
				base = "z.coerce.date()"
			else:
				if mod and custom_type in mod.flow.types:
					type_name = mod.flow.types[custom_type].name
					base = f"Z{type_name}"
				elif mod and custom_type in mod.flow.enums:
					enum_name = mod.flow.enums[custom_type].name
					base = f"Z{enum_name}"
				else:
					base = f"Z{custom_type}"
		else:
			base = "z.any()"
	else:
		base = "z.any()"

	if field_type == FieldType.STR and field.min_length and field.min_length > 0:
		base += f".min( {field.min_length}, '{field.name.capitalize()} is required' )"

	if field_type == FieldType.STR and field.size and field.size > 0:
		base += f".max( {field.size} )"

	if field.is_array:
		if base.startswith("Z"):
			base = f"z.array( {base} )"
		else:
			base += ".array()"

	if not field.required:
		base += ".optional()"

	if field.default:
		if field_type == FieldType.STR:
			base += f".default( '{field.default}' )"
		else:
			base += f".default( {field.default} )"

	return base


def _create_file_name(ep: Endpoint, mod: Module) -> str:
	path = ep.path.replace("/api/", "/").replace("/api", "")
	path = path.lstrip("/")
	parts = []
	for part in path.split("/"):
		if not part.startswith(":"):
			parts.append(part)
	return "-".join(parts) + ".ts"


def _create_function_name(ep: Endpoint, mod: Module) -> str:
	path = ep.path.replace("/api/", "/").replace("/api", "")
	path = path.lstrip("/")
	parts = []
	for part in path.split("/"):
		if not part.startswith(":"):
			parts.append(part.replace("-", "_"))
	return "_".join(parts)


def _pascal_case(text: str) -> str:
	return "".join(word.capitalize() for word in text.replace("-", "_").split("_"))


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
		# The method streams a raw Response (see _streamObject in upload_get);
		# the route layer returns `res.response` verbatim when it is set.
		base = "Response"
	elif return_type in ["json", "obj", "object"]:
		base = "any"
	else:
		if mod:
			for type_obj in mod.flow.types.values():
				if type_obj.name == ep.return_type:
					base = type_obj.name
					break
			else:
				for enum_obj in mod.flow.enums.values():
					if enum_obj.name == ep.return_type:
						base = enum_obj.name
						break
				else:
					base = ep.return_type
		else:
			base = "any"

	if ep.is_array:
		base += "[]"

	return base


def _should_create_result_type(ep: Endpoint, mod: Module = None) -> bool:
	if not ep.return_type:
		return True

	return_type = ep.return_type.lower()

	simple_types = [
		"str", "string", "text", "int", "num", "number",
		"float", "double", "bool", "boolean", "check", "checkbox",
		"date", "datetime", "file", "upload", "binary", "blob", "json", "obj", "object",
	]

	if return_type in simple_types:
		return False

	if mod:
		for type_obj in mod.flow.types.values():
			if type_obj.name == ep.return_type:
				return False
		for enum_obj in mod.flow.enums.values():
			if enum_obj.name == ep.return_type:
				return False

	return True


def _generate_dummy_value(return_type: str) -> str:
	if return_type.endswith("[]"):
		return "[]"
	if return_type in ["string"]:
		return '""'
	elif return_type in ["number"]:
		return "0"
	elif return_type in ["boolean"]:
		return "false"
	elif return_type in ["Date"]:
		return "new Date()"
	elif return_type in ["any"]:
		return "null"
	else:
		return f"{{}} as {return_type}"


def _is_empty_or_default_snippet(snippet: str) -> bool:
	if not snippet:
		return True
	cleaned = snippet.strip()
	return cleaned == "" or cleaned == "// Your code here"


def _format_jsdoc_description(description: str) -> str:
	if not description:
		return ""
	lines = description.split("\n")
	formatted_lines = []
	for i, line in enumerate(lines):
		if i == 0:
			formatted_lines.append(line)
		else:
			if line.strip():
				formatted_lines.append(f" * {line}")
			else:
				formatted_lines.append(" *")
	return "\n".join(formatted_lines)


def _format_param_docs(ep: Endpoint) -> str:
	lines = []

	if ep.permissions:
		perms_str = ", ".join(ep.permissions)
		lines.append(f" * @permissions {perms_str}")
		lines.append(" *")

	if not ep.parameters:
		lines.append(" * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)")
		return "\n".join(lines) + "\n"

	lines.append(" * @param {LiWECtx} ctx - The request context (ctx.app for db/kv/cfg, ctx.user() for the current user)")

	func_name = _create_function_name(ep, None)
	params_type = _pascal_case(func_name) + "Params"

	lines.append(f" * @param {{{params_type}}} params - Request parameters")

	for param in ep.parameters:
		opt = "" if param.required else "?"
		type_str = "string"

		if param.type[0] == FieldType.NUMBER or param.type[0] == FieldType.FLOAT:
			type_str = "number"
		elif param.type[0] == FieldType.BOOL:
			type_str = "boolean"

		if param.is_array:
			type_str += "[]"

		descr = param.description if param.description else f"{param.name} parameter"
		lines.append(f" * @param {{{type_str}}} {opt}params.{param.name} - {descr}")

	return "\n".join(lines) + "\n"


# ==================================================================================================
# MAIN GENERATION FUNCTION
# ==================================================================================================


def generate_be_methods(self, mod: Module, output: str):
	"""Generate individual method files in src/methods/ directory"""
	mod_name = self.mod_name(mod)

	methods_dir = os.path.join(output, "src", "methods")
	os.makedirs(methods_dir, exist_ok=True)

	_generate_utils_file(self, mod, methods_dir)

	for ep in mod.endpoints.values():
		_generate_method_file(self, ep, mod, methods_dir)

	_generate_methods_index(self, mod, methods_dir)
	_generate_methods_wrapper(self, mod, output)


def _generate_utils_file(self, mod: Module, methods_dir: str):
	mod_name = self.mod_name(mod)
	outfile = os.path.join(methods_dir, "utils.ts")
	out = self.create_file(outfile, mod)

	utils_snippet = self.snippets.get("utils", "\n// Add custom imports or utilities here\n")

	out.write(TEMPL["METHOD_UTILS_FILE"] % {"__mod_name": mod_name, "__utils_snippet": utils_snippet})
	out.close()
	print(f"Generated {outfile}")


def _generate_method_file(self, ep: Endpoint, mod: Module, methods_dir: str):
	mod_name = self.mod_name(mod)
	file_name = _create_file_name(ep, mod)
	func_name = _create_function_name(ep, mod)
	outfile = os.path.join(methods_dir, file_name)

	ep.mod = mod
	out = self.create_file(outfile, mod)

	schema_name = _pascal_case(func_name) + "Schema"
	params_type = _pascal_case(func_name) + "Params"
	result_type_name = _pascal_case(func_name) + "Result"

	headers_block_name = func_name + "_headers"
	headers_snippet = self.snippets.get(headers_block_name, "\n// Custom imports here\n")

	body_block_name = func_name
	body_snippet = self.snippets.get(body_block_name, "\n\t// Your code here\n")

	description = ep.description if ep.description else ep.short_descr if ep.short_descr else f"{func_name} endpoint"
	formatted_description = _format_jsdoc_description(description)
	out.write(TEMPL["METHOD_FILE_START"] % {"__endpoint_description": formatted_description})

	referenced_types = _collect_referenced_types(ep, mod)
	if referenced_types:
		types_list = ", ".join(sorted(referenced_types))
		out.write(f"import {{ {types_list} }} from '../types';\n\n")

	if ep.parameters:
		_write_schema(out, ep, schema_name, func_name)
		_write_params_type(out, params_type, schema_name, func_name)

	should_create_result = _should_create_result_type(ep, mod)
	actual_return_type = _get_typescript_return_type(ep, mod)

	if should_create_result:
		_write_result_type(out, ep, result_type_name, func_name)
		result_type_for_signature = result_type_name
	else:
		result_type_for_signature = actual_return_type

	out.write(TEMPL["METHOD_HEADERS_BLOCK"] % {"__block_name": headers_block_name, "__snippet": headers_snippet})

	param_docs = _format_param_docs(ep)
	params_arg = f", params: {params_type}" if ep.parameters else ""

	out.write(TEMPL["METHOD_FUNCTION_START"] % {
		"__function_description": formatted_description,
		"__param_docs": param_docs,
		"__function_name": func_name,
		"__params_arg": params_arg,
		"__params_type": params_type,
		"__result_type": result_type_for_signature,
	})

	if ep.parameters:
		out.write(TEMPL["METHOD_VALIDATION"] % {"__schema_name": schema_name, "__params_type": params_type})
		param_names = ", ".join([p.name for p in ep.parameters])
		out.write(TEMPL["METHOD_PARAMS_EXTRACT"] % {"__param_names": param_names})

	if _is_empty_or_default_snippet(body_snippet):
		if ep.return_type and ep.return_type.lower() in ("binary", "blob"):
			# Binary endpoint: stream a raw Response back (see _streamObject in
			# upload_get). The route layer returns `res.response` verbatim.
			body_snippet = """
	// === REMOVE THIS DUMMY IMPLEMENTATION - stream your binary payload back
	const body = new Uint8Array();
	const res = responseSuccess<Response>();
	res.response = new Response( body, {
		headers: { 'Content-Type': 'application/octet-stream' },
	} );
	return res;
"""
		else:
			dummy_value = _generate_dummy_value(actual_return_type)
			body_snippet = f"""
	// === REMOVE THIS DUMMY IMPLEMENTATION - Replace with actual logic
	const dummy: {actual_return_type} = {dummy_value};
	return responseSuccess(dummy);
"""

	out.write(TEMPL["METHOD_BODY_BLOCK"] % {"__block_name": body_block_name, "__snippet": body_snippet})
	out.write(TEMPL["METHOD_FUNCTION_END"])

	out.close()
	print(f"Generated {outfile}")


def _write_schema(out, ep: Endpoint, schema_name: str, func_name: str):
	properties = []
	for param in ep.parameters:
		opt = "[" if not param.required else ""
		opt_end = "]" if not param.required else ""
		type_str = "string"

		if param.type[0] == FieldType.NUMBER or param.type[0] == FieldType.FLOAT:
			type_str = "number"
		elif param.type[0] == FieldType.BOOL:
			type_str = "boolean"

		if param.is_array:
			type_str += "[]"

		descr = param.description if param.description else f"{param.name} parameter"
		constraints = []
		if param.required:
			constraints.append("required")
		if param.min_length and param.min_length > 0:
			constraints.append(f"min {param.min_length}")
		if param.size and param.size > 0:
			constraints.append(f"max {param.size}")

		constraint_str = f" ({', '.join(constraints)})" if constraints else ""
		properties.append(f" * @property {{{opt}{type_str}{opt_end}}} {param.name} - {descr}{constraint_str}")

	schema_description = ep.description if ep.description else f"{func_name} parameters"

	out.write(TEMPL["METHOD_SCHEMA_START"] % {
		"__schema_description": schema_description,
		"__schema_properties": "\n".join(properties),
		"__schema_name": schema_name,
	})

	for param in ep.parameters:
		zod_type = _get_zod_type(param, ep.mod if hasattr(ep, "mod") else None)
		out.write(TEMPL["METHOD_SCHEMA_FIELD"] % {"name": param.name, "zod_type": zod_type})

	out.write(TEMPL["METHOD_SCHEMA_END"])


def _write_params_type(out, params_type: str, schema_name: str, func_name: str):
	out.write(TEMPL["METHOD_PARAMS_TYPE"] % {
		"__function_description": func_name,
		"__params_type": params_type,
		"__schema_name": schema_name,
	})


def _write_result_type(out, ep: Endpoint, result_type: str, func_name: str):
	ts_type = _get_typescript_return_type(ep, ep.mod if hasattr(ep, "mod") else None)
	out.write(TEMPL["METHOD_RESULT_TYPE"] % {
		"__function_description": func_name,
		"__result_type": result_type,
		"__result_fields": ts_type,
	})


def _collect_referenced_types(ep: Endpoint, mod: Module) -> set[str]:
	referenced_types = set()

	if ep.return_type:
		return_type_name = ep.return_type
		for type_obj in mod.flow.types.values():
			if type_obj.name == return_type_name:
				referenced_types.add(type_obj.name)
				break
		else:
			for enum_obj in mod.flow.enums.values():
				if enum_obj.name == return_type_name:
					referenced_types.add(enum_obj.name)
					break

	if ep.parameters:
		for param in ep.parameters:
			if param.type[0] == FieldType.CUSTOM and len(param.type) > 1:
				custom_type_id = param.type[1]
				if custom_type_id in mod.flow.types:
					type_obj = mod.flow.types[custom_type_id]
					referenced_types.add(type_obj.name)
				elif custom_type_id in mod.flow.enums:
					enum_obj = mod.flow.enums[custom_type_id]
					referenced_types.add(enum_obj.name)

	return referenced_types


def _generate_methods_index(self, mod: Module, methods_dir: str):
	mod_name = self.mod_name(mod)
	outfile = os.path.join(methods_dir, "index.ts")

	with open(outfile, "w") as out:
		out.write(TEMPL["METHODS_INDEX_START"] % {"__mod_name": mod_name})

		for ep in mod.endpoints.values():
			file_name = _create_file_name(ep, mod).replace(".ts", "")
			func_name = _create_function_name(ep, mod)
			params_type = _pascal_case(func_name) + "Params"
			result_type = _pascal_case(func_name) + "Result"

			should_create_result = _should_create_result_type(ep, mod)

			exports = [func_name]
			if ep.parameters:
				exports.append(f"type {params_type}")
			if should_create_result:
				exports.append(f"type {result_type}")

			export_str = ", ".join(exports)
			out.write(f"export {{ {export_str} }} from './{file_name}';\n")

	print(f"Generated {outfile}")


def _generate_methods_wrapper(self, mod: Module, output: str):
	mod_name = self.mod_name(mod)
	outfile = os.path.join(output, "src", "methods.ts")

	with open(outfile, "w") as out:
		out.write(TEMPL["METHODS_WRAPPER_FILE"] % {
			"__mod_name": mod_name,
			"__mod_name_camel": mod_name.capitalize()
		})

	print(f"Generated {outfile}")

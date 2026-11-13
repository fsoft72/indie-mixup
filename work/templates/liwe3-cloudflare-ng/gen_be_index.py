#!/usr/bin/env python3

import os
from lib.types import Module, Endpoint
from texts import texts as TEMPL
from _shared import perm_const_name


# ==================================================================================================
# INTERNAL FUNCTIONS
# ==================================================================================================

def _create_function_name(ep: Endpoint) -> str:
	"""Create function name from endpoint, e.g., POST /tags/add -> tag_add"""
	path = ep.path.replace("/api/", "/").replace("/api", "")
	path = path.lstrip("/")
	parts = []
	for part in path.split("/"):
		if not part.startswith(":"):
			parts.append(part.replace("-", "_"))
	return "_".join(parts)


def _gate_expr(ep: Endpoint, mod_name: str):
	"""
	Render an endpoint's gate as the TypeScript expression for RouteOptions.perms.

	@param ep: the endpoint
	@param mod_name: owning module name in snake_case
	@return: the expression string, or None when the endpoint declares no gate
	         (a case the preflight check rejects before any generation starts)
	"""
	gate = getattr(ep, "gate", None)
	if gate is None:
		return None
	if gate == "public":
		return "PUBLIC"
	if gate == "logged":
		return "LOGGED"

	consts = []
	for name in gate:
		# system.admin is a core-level wildcard, not a module permission:
		# emit the string literal, has_perms matches it directly
		consts.append("'system.admin'" if name == "system.admin" else perm_const_name(name, mod_name))
	return "[ " + ", ".join(consts) + " ]"


def _gate_perm_consts(ep: Endpoint, mod_name: str):
	"""@return: the set of module permission constants referenced by ep's gate."""
	gate = getattr(ep, "gate", None)
	if not isinstance(gate, list):
		return set()
	return {perm_const_name(n, mod_name) for n in gate if n != "system.admin"}


# ==================================================================================================
# CLASS METHODS
# ==================================================================================================

def generate_be_index(self, mod: Module, output: str):
	"""Generate the index.ts file for Cloudflare Workers"""
	mod_name = self.mod_name(mod)

	outfile = os.path.join(output, "src", "index.ts")
	out = self.create_file(outfile, mod)

	# Prepare methods list for import. Two endpoints can map to the same handler
	# (e.g. GET + POST on the same path), so dedupe before emitting the import.
	methods = sorted({_create_function_name(ep) for ep in mod.endpoints.values()})

	# Format methods import with newlines every 4 methods
	formatted_methods = []
	for i, method in enumerate(methods):
		if i > 0 and i % 4 == 0:
			formatted_methods.append("\n\t")
		formatted_methods.append(method)
		if i < len(methods) - 1:
			formatted_methods.append(", ")

	permissions_const = f"{mod_name.upper()}_PERMISSIONS"

	# the ./perms import carries the module permission array plus every specific
	# permission constant referenced by an endpoint gate
	gate_consts = set()
	for ep in mod.endpoints.values():
		gate_consts |= _gate_perm_consts(ep, mod_name)
	perms_import = ", ".join([permissions_const] + sorted(gate_consts))

	snippets = {
		"__methods": "".join(formatted_methods),
		"__mod_name": mod_name,
		"__permissions_const": permissions_const,
		"__perms_import": perms_import,
		"__module_snippet": self.snippets.get("_module", ""),
		"__module_init_snippet": self.snippets.get("module_init", ""),
	}

	out.write(TEMPL["INDEX_FILE_START"] % snippets)

	for ep in mod.endpoints.values():
		_write_endpoint(self, ep, out, mod)

	out.write(TEMPL["INDEX_FILE_END"] % snippets)

	out.close()
	print("Generated", outfile)


def _write_endpoint(self, ep: Endpoint, out, mod: Module):
	"""Write a single endpoint to the index.ts file"""
	method_name = _create_function_name(ep)
	method_upper = ep.method.upper()

	gate = _gate_expr(ep, self.mod_name(mod))
	if gate is None:
		# unreachable through Template.code() (the preflight rejects the module
		# first); this guards a direct call to the generator. Skip, never emit an
		# open route.
		self.report_errors([f"{ep.method} {ep.path}: no permission gate, endpoint skipped"])
		return

	if method_upper == "GET":
		template_key = "ENDPOINT_GET"
	else:
		template_key = "ENDPOINT_BODY"

	dct = {
		"__path": f"/api{ep.path}",
		"__method_name": method_name,
		"method_lower": method_upper.lower(),
		"__gate": gate,
	}

	out.write(TEMPL[template_key] % dct)

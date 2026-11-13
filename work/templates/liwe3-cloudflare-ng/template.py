#!/usr/bin/env python3

"""
liwe3-cloudflare-ng: Combined backend + frontend template.

Generates:
  {output}/{mod_name}/backend/  - Cloudflare Worker module (Hono, Drizzle, D1)
  {output}/{mod_name}/frontend/ - Svelte frontend module (actions, types, components)
"""

import os

from lib.template_base import TemplateBase
from lib.types import Module


def _check_permission_gates(mod: Module):
	"""
	Collect the endpoints that declare no permission gate in the module JSON.

	Every endpoint MUST declare its gate: 'public', 'logged', 'admins' or at
	least one permission. There is no default: an endpoint whose gate was never
	decided would otherwise be generated as publicly reachable.

	@param mod: the module to check
	@return: a list of human-readable error lines, empty when every endpoint is fine
	"""
	missing = [ep for ep in mod.endpoints.values() if getattr(ep, "gate", None) is None]
	if not missing:
		return []

	errors = ["Module '%s': %d endpoint(s) without a permission gate:" % (mod.name, len(missing))]
	for ep in sorted(missing, key=lambda e: e.path):
		errors.append("    %-6s %s" % (ep.method, ep.path))

	errors.append("  Set one of these in the endpoint 'permissions' block of the module JSON:")
	errors.append('    "public": true    - reachable without authentication (deliberate choice)')
	errors.append('    "logged": true    - any authenticated user')
	errors.append('    "admins": true    - system.admin only')
	errors.append('    "<perm id>": true - one or more specific permissions')

	return errors

# Backend generators
from gen_be_index import generate_be_index
from gen_be_perms import generate_be_perms
from gen_be_methods import generate_be_methods
from gen_be_schema import generate_be_schema
from gen_be_sql import generate_be_sql
from gen_be_config import generate_be_config
from gen_be_types import generate_be_types
from gen_be_events import generate_be_events

# Frontend generators
from gen_fe_config import generate_fe_config
from gen_fe_types import generate_fe_types
from gen_fe_actions import generate_fe_actions
from gen_fe_index import generate_fe_index


class Template(TemplateBase):
    def __init__(self):
        super().__init__()
        self.name = "liwe3-cloudflare-ng"

    def code(self, mod: Module, flow: any, output: str):
        super().code(mod, flow, output)

        # preflight: reject a module with any un-gated endpoint before writing a
        # single file, so a rejected module leaves no partial output behind
        errors = _check_permission_gates(mod)
        if errors:
            self.report_errors(errors)
            return False

        mod_name = self.mod_name(mod)
        base_output = os.path.join(output, "modules", mod_name)

        # Backend output: {output}/{mod_name}/backend/
        be_output = os.path.join(base_output, "backend")

        # Frontend output: {output}/{mod_name}/frontend/
        fe_output = os.path.join(base_output, "frontend")

        # --- Backend ---
        self.generate_be_config(mod, be_output)
        self.generate_be_types(mod, be_output)
        self.generate_be_schema(mod, be_output)
        self.generate_be_sql(mod, be_output)
        self.generate_be_perms(mod, be_output)
        self.generate_be_methods(mod, be_output)
        self.generate_be_events(mod, be_output)
        self.generate_be_index(mod, be_output)

        # --- Frontend ---
        self.generate_fe_config(mod, fe_output)
        self.generate_fe_types(mod, fe_output)
        self.generate_fe_actions(mod, fe_output)
        self.generate_fe_index(mod, fe_output)

        return True


# Backend generators
Template.generate_be_index = generate_be_index
Template.generate_be_perms = generate_be_perms
Template.generate_be_methods = generate_be_methods
Template.generate_be_schema = generate_be_schema
Template.generate_be_sql = generate_be_sql
Template.generate_be_config = generate_be_config
Template.generate_be_types = generate_be_types
Template.generate_be_events = generate_be_events

# Frontend generators
Template.generate_fe_config = generate_fe_config
Template.generate_fe_types = generate_fe_types
Template.generate_fe_actions = generate_fe_actions
Template.generate_fe_index = generate_fe_index

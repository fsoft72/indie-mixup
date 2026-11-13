#!/usr/bin/env python3

"""
Unit tests for the P0-1 route-gate rendering in this template.

Run from this directory:  python3 -m unittest test_gates
The flow2code `lib.*` and `texts` modules are stubbed so the tests need no
flow2code install.
"""

import importlib.util
import os
import sys
import unittest
from types import SimpleNamespace as NS

_HERE = os.path.dirname(os.path.abspath(__file__))


def _load(mod_name, filename, stubs):
	for name, value in stubs.items():
		sys.modules[name] = value
	sys.path.insert(0, _HERE)
	spec = importlib.util.spec_from_file_location(mod_name, os.path.join(_HERE, filename))
	mod = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(mod)
	return mod


_STUBS = {
	"lib": NS(),
	"lib.types": NS(Module=object, Endpoint=object),
	"lib.template_base": NS(TemplateBase=object),
	"texts": NS(texts={}),
	"gen_be_index": None,
	"gen_be_perms": None,
	"gen_be_methods": NS(generate_be_methods=None),
	"gen_be_schema": NS(generate_be_schema=None),
	"gen_be_sql": NS(generate_be_sql=None),
	"gen_be_config": NS(generate_be_config=None),
	"gen_be_types": NS(generate_be_types=None),
	"gen_be_events": NS(generate_be_events=None),
	"gen_fe_config": NS(generate_fe_config=None),
	"gen_fe_types": NS(generate_fe_types=None),
	"gen_fe_actions": NS(generate_fe_actions=None),
	"gen_fe_index": NS(generate_fe_index=None),
}

gbi = _load("gbi_under_test", "gen_be_index.py", {k: v for k, v in _STUBS.items() if v is not None})
tpl = _load("tpl_under_test", "template.py", {k: v for k, v in _STUBS.items() if v is not None})

from _shared import perm_const_name


def _ep(gate, method="GET", path="/x"):
	return NS(gate=gate, method=method, path=path)


class TestPermConstName(unittest.TestCase):
	def test_dotted(self):
		self.assertEqual(perm_const_name("user.list", "user"), "USER_PERM_LIST")

	def test_dashed_suffix(self):
		self.assertEqual(perm_const_name("wallet.send-money", "wallet"), "WALLET_PERM_SEND_MONEY")


class TestGateExpr(unittest.TestCase):
	def test_public(self):
		self.assertEqual(gbi._gate_expr(_ep("public"), "user"), "PUBLIC")

	def test_logged(self):
		self.assertEqual(gbi._gate_expr(_ep("logged"), "user"), "LOGGED")

	def test_single_perm(self):
		self.assertEqual(gbi._gate_expr(_ep(["user.list"]), "user"), "[ USER_PERM_LIST ]")

	def test_multiple_perms(self):
		self.assertEqual(
			gbi._gate_expr(_ep(["wallet.transfer", "wallet.read"]), "wallet"),
			"[ WALLET_PERM_TRANSFER, WALLET_PERM_READ ]",
		)

	def test_system_admin_is_a_string_literal(self):
		self.assertEqual(gbi._gate_expr(_ep(["system.admin"]), "user"), "[ 'system.admin' ]")

	def test_none_gate(self):
		self.assertIsNone(gbi._gate_expr(_ep(None), "user"))

	def test_gate_perm_consts_excludes_system_admin(self):
		self.assertEqual(gbi._gate_perm_consts(_ep(["user.list", "system.admin"]), "user"), {"USER_PERM_LIST"})


class TestCheckPermissionGates(unittest.TestCase):
	def test_all_gated_is_empty(self):
		mod = NS(name="User", endpoints={"a": _ep("public"), "b": _ep(["user.list"])})
		self.assertEqual(tpl._check_permission_gates(mod), [])

	def test_missing_gate_is_reported(self):
		mod = NS(name="User", endpoints={"a": _ep("public"), "b": _ep(None, "GET", "/user/oauth/authorize")})
		errors = tpl._check_permission_gates(mod)
		self.assertTrue(errors)
		self.assertIn("1 endpoint(s) without a permission gate", errors[0])
		self.assertTrue(any("/user/oauth/authorize" in line for line in errors))


if __name__ == "__main__":
	unittest.main()

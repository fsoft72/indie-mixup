#!/usr/bin/env python3
"""Sync the "surrounding" files of the app with the modules it really uses.

The source of truth is `app/backend/src/index.ts`: every module imported from
`@backend-modules/<name>` is a module of the app. From that list the script
walks the `workspace:` dependencies of each backend package and keeps these
files aligned:

- `app/backend/package.json`       `@backend-modules/<name>` dependencies
- `app/frontend/package.json`      `@frontend-modules/<name>` (only with `--frontend`)
- `tsconfig.backend.json`          projects built by the single `tsc -b` watcher
- `<package>/tsconfig.json`        `composite` and `references` of every backend package involved

It also warns when `index.ts` imports a module it never registers (or the other
way round), and when a package still has its own `tsc --watch` dev script.

Usage (from anywhere):

	work/scripts/sync_modules.py            # write the changes
	work/scripts/sync_modules.py --check    # print the changes, exit 1 if any (CI, pre-commit)
	work/scripts/sync_modules.py --prune    # also remove @backend-modules/* deps the app does not import
	work/scripts/sync_modules.py --frontend # also sync @frontend-modules/* in app/frontend/package.json
	work/scripts/sync_modules.py --verbose  # also list the modules and the packages found
	work/scripts/sync_modules.py --filters  # print the pnpm `--filter=<name>` list of the packages the app uses

Only plain `json` is used: no third party package needed. Run `dprint fmt`
afterwards if you want the usual formatting on touched files.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APP_INDEX = ROOT / "app/backend/src/index.ts"
APP_BE_PACKAGE = ROOT / "app/backend/package.json"
APP_FE_PACKAGE = ROOT / "app/frontend/package.json"
SOLUTION_TSCONFIG = ROOT / "tsconfig.backend.json"
MODULE_ROOTS = ["liwe3/modules", "app/modules"]
# Backend packages that are not modules: package name -> directory (relative to ROOT)
EXTRA_BE_PACKAGES = {
	"@backend/liwe3": "liwe3/backend/core",
	"@liwe3/thumbnailer": "liwe3/backend/thumbnailer",
}
CORE_PACKAGE = "@backend/liwe3"
BE_MODULES_PREFIX = "@backend-modules/"
FE_MODULES_PREFIX = "@frontend-modules/"
IMPORT_RE = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'@backend-modules/([\w-]+)'")
REGISTER_RE = re.compile(r"moduleRegister\s*\(([^)]*)\)")
OLD_WATCH_SCRIPT = "tsc --watch"


def _load_json(path: Path) -> dict:
	"""Read a JSON file."""
	return json.loads(path.read_text())


def _dump_json(data: dict) -> str:
	"""Serialize like the repo files: tabs and a final newline."""
	return json.dumps(data, indent="\t", ensure_ascii=False) + "\n"


def _rel_dir(path: Path) -> str:
	"""Directory of a file, relative to ROOT, with `/` separators."""
	return path.parent.relative_to(ROOT).as_posix()


def _dep_sort_key(name: str) -> str:
	"""Sort dependencies like the existing files do (`@backend/x` before `@backend-modules/x`)."""
	return name.replace("/", "\x00")


def _parse_index() -> tuple[list[str], list[str]]:
	"""Return the modules imported by the app and the warnings about their registration."""
	text = APP_INDEX.read_text()
	modules: list[str] = []
	aliases: dict[str, str] = {}
	for names, mod in IMPORT_RE.findall(text):
		modules.append(mod)
		for part in names.split(","):
			m = re.match(r"\s*(module_init|module_seed)\s+as\s+(\w+)", part)
			if m:
				aliases[m.group(2)] = mod

	registered = " ".join(REGISTER_RE.findall(text))
	warnings = []
	for alias, mod in aliases.items():
		if not re.search(r"\b%s\b" % alias, registered):
			warnings.append(f"index.ts imports `{alias}` ({mod}) but never passes it to moduleRegister()")
	return modules, warnings


def _scan_backend_packages() -> dict[str, Path]:
	"""Map every workspace backend package name to its directory (absolute)."""
	found = {name: ROOT / rel for name, rel in EXTRA_BE_PACKAGES.items()}
	for base in MODULE_ROOTS:
		for pj in sorted((ROOT / base).glob("*/backend/package.json")):
			found[_load_json(pj)["name"]] = pj.parent
	return found


def _scan_frontend_packages() -> dict[str, Path]:
	"""Map the module name to the name of its frontend package."""
	found = {}
	for base in MODULE_ROOTS:
		for pj in sorted((ROOT / base).glob("*/frontend/package.json")):
			name = _load_json(pj)["name"]
			if name.startswith(FE_MODULES_PREFIX):
				found[name.removeprefix(FE_MODULES_PREFIX)] = name
	return found


def _scan_frontend_workspace() -> dict[str, Path]:
	"""Map every workspace frontend package name (core included) to its directory."""
	found = {}
	for pattern in ["liwe3/frontend/*/package.json"] + [f"{b}/*/frontend/package.json" for b in MODULE_ROOTS]:
		for pj in sorted(ROOT.glob(pattern)):
			found[_load_json(pj)["name"]] = pj.parent
	return found


def _frontend_closure() -> list[str]:
	"""Frontend packages the app needs: its `workspace:` deps and theirs, transitively."""
	known = _scan_frontend_workspace()
	seen: list[str] = []
	todo = _workspace_deps(APP_FE_PACKAGE.parent, known)
	while todo:
		name = todo.pop(0)
		if name in seen:
			continue
		seen.append(name)
		todo.extend(_workspace_deps(known[name], known))
	return seen


def _workspace_deps(pkg_dir: Path, known: dict[str, Path]) -> list[str]:
	"""Names of the `workspace:` dependencies of a backend package that are backend packages too."""
	deps = _load_json(pkg_dir / "package.json").get("dependencies", {})
	return [n for n, v in deps.items() if v.startswith("workspace:") and n in known]


def _closure(roots: list[str], known: dict[str, Path]) -> list[str]:
	"""All backend packages needed by `roots` (roots included), core always first."""
	seen: list[str] = []
	todo = [CORE_PACKAGE] + roots
	while todo:
		name = todo.pop(0)
		if name in seen:
			continue
		seen.append(name)
		todo.extend(_workspace_deps(known[name], known))
	return seen


def _ref_path(src: Path, dst: Path) -> str:
	"""Relative path from the `src` package directory to the `dst` one."""
	return Path(os.path.relpath(dst, src)).as_posix()


class Syncer:
	"""Collects the wanted content of every file and writes or reports the differences."""

	def __init__(self, check: bool):
		self.check = check
		self.changes: list[str] = []

	def apply(self, path: Path, new_data: dict, old_data: dict | None, text: str | None = None) -> None:
		"""Write `new_data` (or the ready made `text`) to `path` when it differs (semantically) from `old_data`."""
		if old_data == new_data:
			return
		self.changes.append(str(path.relative_to(ROOT)))
		if not self.check:
			path.write_text(text if text is not None else _dump_json(new_data))


def _sync_package_deps(sync: Syncer, path: Path, prefix: str, wanted: set[str], prune: bool, warnings: list[str]) -> None:
	"""Add the missing `workspace:*` deps with `prefix`; remove or warn about the extra ones."""
	data = _load_json(path)
	old = json.loads(json.dumps(data))
	deps = data.setdefault("dependencies", {})
	current = {n for n in deps if n.startswith(prefix)}
	for name in sorted(wanted - current):
		deps[name] = "workspace:*"
	for name in sorted(current - wanted):
		if prune:
			del deps[name]
			continue
		warnings.append(f"{path.relative_to(ROOT)}: `{name}` is not needed (use --prune to remove it)")
	data["dependencies"] = {k: deps[k] for k in sorted(deps, key=_dep_sort_key)}
	sync.apply(path, data, old)


def _sync_tsconfig(sync: Syncer, pkg_dir: Path, deps: list[str], known: dict[str, Path]) -> None:
	"""Make `composite` true and `references` equal to the workspace dependencies."""
	path = pkg_dir / "tsconfig.json"
	data = _load_json(path)
	old = json.loads(json.dumps(data))
	data.setdefault("compilerOptions", {})["composite"] = True
	refs = [{"path": _ref_path(pkg_dir, known[d])} for d in deps]
	if refs:
		data["references"] = refs
	else:
		data.pop("references", None)
	sync.apply(path, data, old)


def _sync_solution(sync: Syncer, packages: list[str], known: dict[str, Path]) -> None:
	"""Rewrite `tsconfig.backend.json` with the projects the app needs."""
	old = _load_json(SOLUTION_TSCONFIG) if SOLUTION_TSCONFIG.exists() else None
	paths = sorted(("./" + _rel_dir(known[n] / "x")) for n in packages)
	new = {"files": [], "references": [{"path": p} for p in paths]}
	# One project per line, like the file is kept by hand
	lines = ",\n".join('\t\t{ "path": "%s" }' % p for p in paths)
	text = '{\n\t"files": [],\n\t"references": [\n%s\n\t]\n}\n' % lines
	sync.apply(SOLUTION_TSCONFIG, new, old, text)


def main() -> int:
	"""Entry point: returns the process exit code."""
	parser = argparse.ArgumentParser(description="Sync app config files with the modules imported by app/backend/src/index.ts")
	parser.add_argument("--check", action="store_true", help="do not write, exit 1 if something is out of sync")
	parser.add_argument("--prune", action="store_true", help="remove deps of modules the app does not import")
	parser.add_argument("--verbose", action="store_true", help="also print the modules and the packages found")
	parser.add_argument("--filters", action="store_true", help="print the pnpm --filter list of the packages the app uses and exit")
	parser.add_argument("--frontend", action="store_true", help="also sync app/frontend/package.json")
	args = parser.parse_args()

	modules, warnings = _parse_index()
	if not modules:
		print("No @backend-modules import found in app/backend/src/index.ts", file=sys.stderr)
		return 2

	known = _scan_backend_packages()
	roots = []
	for mod in modules:
		name = BE_MODULES_PREFIX + mod
		if name not in known:
			print(f"Module `{mod}` is imported by index.ts but no backend package `{name}` exists", file=sys.stderr)
			return 2
		roots.append(name)

	packages = _closure(roots, known)
	if args.filters:
		print(" ".join(f"--filter={n}" for n in packages + _frontend_closure()))
		return 0
	sync = Syncer(args.check)

	_sync_package_deps(sync, APP_BE_PACKAGE, BE_MODULES_PREFIX, set(roots), args.prune, warnings)
	if args.frontend:
		fe = _scan_frontend_packages()
		wanted = {fe[m] for m in modules if m in fe}
		_sync_package_deps(sync, APP_FE_PACKAGE, FE_MODULES_PREFIX, wanted, args.prune, warnings)

	_sync_solution(sync, packages, known)
	for name in packages:
		_sync_tsconfig(sync, known[name], _workspace_deps(known[name], known), known)
		scripts = _load_json(known[name] / "package.json").get("scripts", {})
		if scripts.get("dev") == OLD_WATCH_SCRIPT:
			warnings.append(f"{_rel_dir(known[name] / 'x')}: has its own `dev: {OLD_WATCH_SCRIPT}`, remove it (single tsc -b watcher)")

	if args.verbose:
		print(f"modules: {', '.join(modules)}")
		print(f"tsc -b:  {', '.join(packages)}")
	for w in warnings:
		print(f"  ! {w}")
	for c in sync.changes:
		print(f"  {'~' if args.check else '+'} {c}")

	if args.check and sync.changes:
		print(f"sync_modules: {len(sync.changes)} file(s) out of sync")
		return 1
	if not sync.changes:
		print("sync_modules: ok")
		return 0
	print(f"sync_modules: updated {len(sync.changes)} file(s); run `dprint fmt` (and `pnpm install --lockfile-only` if a package.json changed)")
	return 0


if __name__ == "__main__":
	sys.exit(main())

#!/usr/bin/env python3

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from lib.types import Module


def generate_be_events(self, mod: Module, output: str):
	"""Generate the TypeScript events constants file"""
	mod_name = self.mod_name(mod).upper()

	if not mod.events or len(mod.events) == 0:
		print(f"Skipping events generation - no events found")
		return

	src_dir = os.path.join(output, "src")
	os.makedirs(src_dir, exist_ok=True)

	outfile = os.path.join(src_dir, "events.ts")
	out = self.create_file(outfile, mod)

	for event_obj in mod.events.values():
		if 'call' in event_obj.name.lower():
			const_name = event_obj.name.upper().replace('.', '_').replace('-', '_')
		else:
			parts = event_obj.name.split('.')
			if len(parts) > 1:
				const_name = f"{parts[0].upper()}_EVENT_{'_'.join(parts[1:]).upper().replace('-', '_')}"
			else:
				const_name = f"EVENT_{event_obj.name.upper().replace('-', '_')}"

		if event_obj.description and event_obj.description.strip():
			out.write(f"// {event_obj.description.strip()}\n")

		out.write(f"export const {const_name} = '{event_obj.name}';\n")
		out.write("\n")

	out.close()
	print(f"Generated {outfile}")

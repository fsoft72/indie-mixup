#!/usr/bin/env python3
import sys
import os
import shutil

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 module-creation.py <path_to_json_file>")
        sys.exit(1)

    json_path = sys.argv[1]
    
    # Check if the path contains 'app/modules'
    if 'app/modules' in json_path:
        print(f"Path '{json_path}' already in app/modules. No action needed.")
        sys.exit(0)
    
    if not os.path.exists(json_path):
        print(f"Error: File '{json_path}' does not exist.")
        sys.exit(1)
        
    # Extract module name from the file name (e.g. 'kanban' from 'kanban.json' or '/path/to/kanban.json')
    filename = os.path.basename(json_path)
    module_name, ext = os.path.splitext(filename)
    
    # Ensure it has a JSON extension just to be safe
    if ext.lower() != '.json':
        print(f"Warning: Expected a JSON file, got '{filename}'")
    
    # Define target path
    target_dir = os.path.join("app", "modules", module_name, "docs")
    target_path = os.path.join(target_dir, filename)
    
    print(f"Processing and copying '{json_path}' to '{target_path}'...")
    
    try:
        import json
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        def clean_json(obj):
            if isinstance(obj, dict):
                new_dict = {}
                for k, v in obj.items():
                    if k == 'id_owner':
                        continue
                    new_key = k
                    if k == 'created_at':
                        new_key = 'created'
                    elif k == 'updated_at':
                        new_key = 'updated'
                    new_dict[new_key] = clean_json(v)
                return new_dict
            elif isinstance(obj, list):
                return [clean_json(item) for item in obj]
            else:
                return obj

        cleaned_data = clean_json(data)
        
        os.makedirs(target_dir, exist_ok=True)
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=4)
        print("Successfully processed and copied.")
    except Exception as e:
        print(f"Error processing/copying file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

import os
from pathspec import PathSpec

def load_gitignore(path=".gitignore"):
    if not os.path.exists(path):
        return None
    with open(path) as f:
        patterns = f.read().splitlines()
    return PathSpec.from_lines("gitwildmatch", patterns)

def print_tree(root, prefix="", spec=None):
    items = sorted(os.listdir(root))
    for i, item in enumerate(items):
        full_path = os.path.join(root, item)
        rel_path = os.path.relpath(full_path)

        # Skip ignored paths
        if spec and spec.match_file(rel_path):
            continue

        connector = "└── " if i == len(items) - 1 else "├── "
        print(prefix + connector + item)

        if os.path.isdir(full_path):
            sub_prefix = prefix + ("    " if i == len(items) - 1 else "│   ")
            print_tree(full_path, sub_prefix, spec=spec)

if __name__ == "__main__":
    spec = load_gitignore()
    print_tree(".", spec=spec)

import os
import shutil
import json
import sys
import importlib.util
import traceback
from pathlib import Path
from typing import List, Dict, Any

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import FileResponse

# Import Models
from src.model import ProjectManifest

# Import the Compiler Logic (The Processor)
# Assuming src/compiler.py has the process_fsm function we discussed
from src.compiler import process_fsm

router = APIRouter(prefix="/api/projects", tags=["Projects"])

# CONFIG: Where projects live
PROJECTS_DIR = Path("projects")
PROJECTS_DIR.mkdir(exist_ok=True)

# ==========================================
# 1. PROJECT CRUD (The Database)
# ==========================================

@router.get("/", response_model=List[Dict])
def list_projects():
    """
    Scans the 'projects' folder. 
    Tries to read 'manifest.json' for details, otherwise returns basic folder info.
    """
    results = []
    for entry in PROJECTS_DIR.iterdir():
        if entry.is_dir():
            manifest_path = entry / "manifest.json"
            project_data = {
                "slug": entry.name,
                "name": entry.name.replace("_", " ").title(),
                "path": str(entry.absolute())
            }
            
            # Try to enrich with manifest data
            if manifest_path.exists():
                try:
                    with open(manifest_path, "r") as f:
                        manifest = json.load(f)
                        project_data.update(manifest)
                except Exception:
                    project_data["error"] = "Invalid Manifest"

            results.append(project_data)
    return results

@router.post("/")
def create_project(manifest: ProjectManifest):
    """
    Creates a new project folder with the necessary scaffold.
    """
    folder = PROJECTS_DIR / manifest.slug
    if folder.exists():
        raise HTTPException(status_code=400, detail="Project already exists")
    
    # 1. Create Directories
    folder.mkdir()
    (folder / "assets").mkdir()
    (folder / "generated").mkdir()
    
    # 2. Create Manifest
    manifest_path = folder / "manifest.json"
    with open(manifest_path, "w") as f:
        # Convert dataclass to dict
        json.dump(manifest.__dict__, f, indent=4)
    
    # 3. Create Initial Script (using the first item in build_order or default)
    first_script = manifest.build_order[0] if manifest.build_order else "main.py"
    script_path = folder / first_script
    
    initial_code = (
        "from src.modules import VisualNovelModule\n"
        "from src.model import Character\n\n"
        "vn = VisualNovelModule()\n\n"
        "def story():\n"
        "    vn.label('start')\n"
        "    vn.say(None, 'Hello World!')\n"
        "    vn.finish()\n"
        "    return vn.dialogueDict\n"
    )
    script_path.write_text(initial_code, encoding="utf-8")
    
    return {"status": "created", "slug": manifest.slug}

@router.delete("/{slug}")
def delete_project(slug: str):
    folder = PROJECTS_DIR / slug
    if not folder.exists():
        raise HTTPException(404, "Project not found")
    shutil.rmtree(folder)
    return {"status": "deleted"}

# ==========================================
# 2. FILE EDITOR API
# ==========================================

@router.get("/{slug}/files")
def list_project_files(slug: str):
    """Returns all .py and .json files in the project root."""
    folder = PROJECTS_DIR / slug
    if not folder.exists(): raise HTTPException(404, "Project not found")
    
    files = []
    for f in folder.glob("*"):
        if f.is_file() and f.suffix in ['.py', '.json']:
            files.append(f.name)
    return files

@router.get("/{slug}/file/{filename}")
def read_file(slug: str, filename: str):
    path = PROJECTS_DIR / slug / filename
    if not path.exists(): raise HTTPException(404, "File not found")
    return {"filename": filename, "content": path.read_text(encoding="utf-8")}

@router.post("/{slug}/file/{filename}")
def write_file(slug: str, filename: str, content: str = Body(..., embed=True)):
    """Saves content to file. Used by the UI Text Editor/Blockly."""
    folder = PROJECTS_DIR / slug
    path = folder / filename
    
    # Basic validation
    if not (filename.endswith(".py") or filename.endswith(".json")):
        raise HTTPException(400, "Only .py and .json allowed")
    
    # If writing to manifest, validate JSON
    if filename == "manifest.json":
        try:
            json.loads(content)
        except json.JSONDecodeError:
            raise HTTPException(400, "Invalid JSON format")

    path.write_text(content, encoding="utf-8")
    return {"status": "saved"}

# ==========================================
# 3. THE COMPILER (The Orchestrator)
# ==========================================

@router.post("/{slug}/compile")
def compile_project(slug: str):
    """
    The Big Logic:
    1. Reads manifest for 'build_order'.
    2. Loads each script dynamically.
    3. Runs script.story().
    4. Merges results.
    5. Compiles to FSM JSON.
    """
    project_path = PROJECTS_DIR / slug
    if not project_path.exists(): raise HTTPException(404, "Project not found")
    
    manifest_path = project_path / "manifest.json"
    output_dir = project_path / "generated"
    output_dir.mkdir(exist_ok=True)

    # 1. Determine Build Order
    build_order = ["main.py"] # Default
    if manifest_path.exists():
        try:
            with open(manifest_path) as f:
                data = json.load(f)
                build_order = data.get("build_order", ["main.py"])
        except:
            print("Manifest Error, defaulting to main.py")

    master_dialogue_list = []
    logs = []

    try:
        # Ensure we can import 'src' modules
        # This adds the root SDK folder to Python path
        if str(Path.cwd()) not in sys.path:
            sys.path.append(str(Path.cwd()))

        # 2. Orchestrate Scripts
        for filename in build_order:
            file_path = project_path / filename
            
            if not file_path.exists():
                logs.append(f"Skipping {filename}: File not found")
                continue

            logs.append(f"Compiling {filename}...")

            # --- DYNAMIC IMPORT MAGIC ---
            # We use a unique name based on slug + filename to prevent caching overlap
            module_name = f"proj_{slug}_{filename.replace('.', '_')}"
            
            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if spec and spec.loader:
                user_module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = user_module # Cache it (optional, but good for dependencies)
                spec.loader.exec_module(user_module)
                
                # 3. Run story()
                if hasattr(user_module, "story"):
                    result = user_module.story()
                    if isinstance(result, list):
                        master_dialogue_list.extend(result)
                        logs.append(f" -> Added {len(result)} actions from {filename}")
                    else:
                        logs.append(f" -> Error: {filename} story() did not return a list")
                else:
                    logs.append(f" -> Warning: No story() function in {filename}")

        # 4. Process FSM (Flatten & Sanitize)
        # This calls your core/compiler.py logic
        final_fsm = process_fsm(master_dialogue_list)

        # 5. Save Result
        output_file = output_dir / "behavior.json"
        with open(output_file, "w") as f:
            json.dump(final_fsm, f, indent=4)

        return {
            "status": "success",
            "message": "Compilation Complete",
            "state_count": len(final_fsm),
            "output_path": str(output_file),
            "logs": logs
        }

    except Exception as e:
        # Return detailed error trace so the UI can show the user what they broke
        return {
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc(),
            "logs": logs
        }
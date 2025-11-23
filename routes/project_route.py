import os
import shutil
import json
import sys
import importlib.util
import traceback
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import asdict
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import FileResponse

# Import Models
from src.modules import VisualNovelModule
from src.minecraft_export import export_resource_pack
from src.model import ProjectManifest, ScriptGroup

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
        # Convert dataclass to dict (handles nested ScriptGroups automatically)
        json.dump(asdict(manifest), f, indent=4) # Use asdict import from dataclasses
    
    # 3. Create Initial Script

    # NEW (Fixed): Get the first file from the first group
    if manifest.script_groups and manifest.script_groups[0].source_files:
        first_script = manifest.script_groups[0].source_files[0]
    else:
        first_script = "main.py"
        
    script_path = folder / first_script
    initial_code = (
        "from src.modules import VisualNovelModule\n"
        "from src.model import Character\n\n"
        "vn = VisualNovelModule()\n\n"
        "def story():\n"
        "    vn.label('start')\n"
        "    vn.say('', 'Hello World!')\n"
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
    # This version is packed with print statements for aggressive debugging.
    
    print("\n\n>>> COMPILATION STARTED <<<")
    
    project_path = PROJECTS_DIR / slug
    if not project_path.exists():
        raise HTTPException(404, "Project not found")
    
    manifest_path = project_path / "manifest.json"
    output_dir = project_path / "generated"
    output_dir.mkdir(exist_ok=True)
    print(f">>> Project Path: {project_path}")

    # 1. Load Manifest
    script_groups = [ScriptGroup(slug="behavior", name="Main", source_files=["main.py"])]
    if manifest_path.exists():
        try:
            with open(manifest_path) as f:
                data = json.load(f)
                if "script_groups" in data:
                    script_groups = [ScriptGroup(**g) for g in data["script_groups"]]
            print(">>> STEP 1: Manifest loaded successfully.")
        except Exception as e:
            print(f">>> STEP 1: FAILED to load manifest: {e}")

    # Ensure SDK is in path
    if str(Path.cwd()) not in sys.path:
        sys.path.append(str(Path.cwd()))

    compilation_report = {}
    logs = []

    # 2. LOOP THROUGH EACH SCRIPT GROUP
    for group in script_groups:
        print(f"\n>>> STEP 2: Processing Group '{group.name}'")
        logs.append(f"--- Compiling Group: {group.name} ({group.slug}.json) ---")
        
        VisualNovelModule.reset()

        # 3. Execute all Python Files in this Group
        for filename in group.source_files:
            print(f"\n  >>> STEP 3: Processing file '{filename}'")
            file_path = project_path / filename
            
            if not file_path.exists():
                print(f"  >>> File not found, skipping.")
                logs.append(f"  [Skip] {filename} not found")
                continue

            # Dynamic Import
            module_name = f"proj_{slug}_{group.slug}_{filename.replace('.', '_')}"
            
            try:
                print(f"  >>> STEP 4: Attempting to import '{filename}' as '{module_name}'")
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                
                if not (spec and spec.loader):
                    print("  >>> FAILED: Could not create module spec.")
                    continue

                user_module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = user_module
                spec.loader.exec_module(user_module)
                print(f"  >>> STEP 5: Module '{filename}' executed.")
                
                if hasattr(user_module, "story"):
                    print("  >>> STEP 6: Found story() function. Executing it now...")
                    # This is where your module's 'Compiling...' prints will appear
                    user_module.story()
                    print("  >>> STEP 7: story() function finished.")
                    logs.append(f"  [OK] {filename}: Executed successfully")
                else:
                    print("  >>> WARNING: No story() function found in this file.")
                    logs.append(f"  [WARN] {filename}: No story() function")

            except Exception as e:
                # ==========================================================
                # THIS IS THE MOST IMPORTANT PART. IT WILL PRINT THE ERROR
                # ==========================================================
                print(f"  >>> STEP X: CRITICAL FAILURE while processing '{filename}'!")
                traceback.print_exc() # This prints the full error to your console
                # ==========================================================
                logs.append(f"  [CRIT] {filename} Failed: {str(e)}")


        # 4. Compile the Group to JSON
        print("\n>>> STEP 8: All files in group processed. Finalizing compilation...")
        try:
            final_story_list = VisualNovelModule().to_list()
            print(f">>> STEP 9: Retrieved final story list with {len(final_story_list)} items.")

            if final_story_list:
                print(">>> STEP 10: Calling process_fsm...")
                final_fsm = process_fsm(final_story_list)
                print(f">>> STEP 11: process_fsm finished. Final state count: {len(final_fsm)}")
                
                output_file = output_dir / f"{group.slug}.json"
                with open(output_file, "w", encoding='utf-8') as f:
                    json.dump(final_fsm, f, indent=4)
                print(f">>> STEP 12: Successfully saved to {output_file}")
                
                compilation_report[group.slug] = {"status": "success", "states": len(final_fsm)}
            else:
                compilation_report[group.slug] = {"status": "empty"}
                
        except Exception as e:
            print(">>> STEP Y: CRITICAL FAILURE during final processing (process_fsm or file save)!")
            traceback.print_exc()
            compilation_report[group.slug] = {"status": "failed", "error": str(e)}

    print("\n>>> COMPILATION FINISHED <<<\n")
    return {
        "message": "Project Compiled",
        "report": compilation_report,
        "logs": logs
    }

@router.get("/{slug}/export")
def export_project(slug: str):
    """
    Triggers the Minecraft Resource Pack generation.
    Returns the ZIP file as a download.
    """
    project_path = PROJECTS_DIR / slug
    manifest_path = project_path / "manifest.json"
    
    if not project_path.exists():
        raise HTTPException(404, "Project not found")
        
    # Load Manifest
    if manifest_path.exists():
        with open(manifest_path) as f:
            data = json.load(f)
            manifest = ProjectManifest(**data)
    else:
        # Fallback if manifest is missing
        manifest = ProjectManifest(slug=slug, name=slug)

    try:
        # CALL THE BUILDER
        zip_path_str = export_resource_pack(slug, manifest)
        zip_path = Path(zip_path_str)
        
        # Return file for download
        return FileResponse(
            path=zip_path, 
            filename=zip_path.name, 
            media_type='application/zip'
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Export failed: {str(e)}")
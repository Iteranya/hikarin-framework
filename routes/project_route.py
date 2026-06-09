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
    project_path = PROJECTS_DIR / slug
    if not project_path.exists():
        raise HTTPException(status_code=404, detail="Project not found")

    manifest_path = project_path / "manifest.json"
    output_dir = project_path / "generated"
    output_dir.mkdir(exist_ok=True)

    # 1. Load Manifest
    try:
        with open(manifest_path) as f:
            data = json.load(f)
            script_groups = [ScriptGroup(**g) for g in data.get("script_groups", [])]
        if not script_groups: # Handle empty or missing script_groups
             script_groups = [ScriptGroup(slug="behavior", name="Main", source_files=["main.py"])]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load or parse manifest.json: {e}")

    # Ensure SDK is in path
    if str(Path.cwd()) not in sys.path:
        sys.path.append(str(Path.cwd()))

    compilation_report = {}
    logs = []

    # WRAP THE ENTIRE COMPILATION PROCESS IN A TRY/EXCEPT
    try:
        # 2. LOOP THROUGH EACH SCRIPT GROUP
        for group in script_groups:
            logs.append(f"--- Compiling Group: {group.name} ({group.slug}.json) ---")
            
            VisualNovelModule.reset()

            # 3. Execute all Python Files in this Group
            for filename in group.source_files:
                file_path = project_path / filename
                if not file_path.exists():
                    logs.append(f"  [Skip] {filename} not found")
                    continue
                
                module_name = f"proj_{slug}_{group.slug}_{filename.replace('.', '_')}"

                # Force reload of module to get code changes
                if module_name in sys.modules:
                    del sys.modules[module_name]

                spec = importlib.util.spec_from_file_location(module_name, file_path)
                if not (spec and spec.loader):
                    raise Exception(f"Could not create module spec for {filename}")

                user_module = importlib.util.module_from_spec(spec)
                sys.modules[module_name] = user_module
                spec.loader.exec_module(user_module)
                
                if hasattr(user_module, "story"):
                    user_module.story()
                    logs.append(f"  [OK] {filename}: Executed successfully")
                else:
                    logs.append(f"  [WARN] {filename}: No story() function")

            # 4. Compile the Group to JSON
            final_story_list = VisualNovelModule().to_list()

            if final_story_list:
                # This is where your custom check() function will raise a ValueError
                final_fsm = process_fsm(final_story_list)
                
                output_file = output_dir / f"{group.slug}.json"
                with open(output_file, "w", encoding='utf-8') as f:
                    json.dump(final_fsm, f, indent=4)
                
                compilation_report[group.slug] = {"status": "success", "states": len(final_fsm)}
            else:
                compilation_report[group.slug] = {"status": "empty"}

        # If we get here, everything was successful
        return {
            "message": "Project Compiled Successfully",
            "report": compilation_report,
            "logs": logs
        }

    # THIS IS THE KEY: CATCH THE SPECIFIC ERROR FROM YOUR COMPILER
    except ValueError as e:
        # This will catch the "Label not found" or "Duplicate action" errors from check()
        traceback.print_exc()
        raise HTTPException(
            status_code=400, # Bad Request, because the user's script is wrong
            detail=f"Script Error: {str(e)}"
        )
    # CATCH ANY OTHER UNEXPECTED ERRORS
    except Exception as e:
        traceback.print_exc() # Log the full error to your server console for debugging
        # Return a generic but helpful error to the user
        raise HTTPException(
            status_code=500, # Internal Server Error
            detail=f"An unexpected compilation error occurred: {type(e).__name__} - {str(e)}"
        )

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
            # Strip keys that aren't part of ProjectManifest
            # (e.g. 'path' injected by list_projects at runtime)
            import dataclasses
            valid_keys = {f.name for f in dataclasses.fields(ProjectManifest)}
            clean_data = {k: v for k, v in data.items() if k in valid_keys}
            manifest = ProjectManifest(**clean_data)
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
    

@router.post("/{slug}/compile_temp/{group_slug}")
def compile_temp(slug: str, group_slug: str):
    """
    Compiles a specific script group in memory and returns the JSON structure directly.
    Does NOT save to the generated folder.
    Useful for previews or debugging specific sections.
    """
    project_path = PROJECTS_DIR / slug
    if not project_path.exists():
        raise HTTPException(404, "Project not found")

    manifest_path = project_path / "manifest.json"
    
    # 1. Load Manifest to find the specific Group
    target_group = None
    
    # Default fallback if manifest missing (legacy/single file mode)
    if not manifest_path.exists() and group_slug == "behavior":
        target_group = ScriptGroup(slug="behavior", name="Main", source_files=["main.py"])
    elif manifest_path.exists():
        try:
            with open(manifest_path) as f:
                data = json.load(f)
                if "script_groups" in data:
                    for g_data in data["script_groups"]:
                        if g_data["slug"] == group_slug:
                            target_group = ScriptGroup(**g_data)
                            break
        except Exception as e:
            raise HTTPException(500, f"Error reading manifest: {e}")

    if not target_group:
        raise HTTPException(404, f"Script Group '{group_slug}' not found in manifest.")

    # Ensure SDK is in path
    if str(Path.cwd()) not in sys.path:
        sys.path.append(str(Path.cwd()))

    try:
        VisualNovelModule.reset()
        
        for filename in target_group.source_files:
            file_path = project_path / filename
            if not file_path.exists():
                raise HTTPException(400, f"Source file '{filename}' missing.")

            module_name = f"proj_{slug}_{group_slug}_{filename.replace('.', '_')}"
            if module_name in sys.modules:
                del sys.modules[module_name]

            spec = importlib.util.spec_from_file_location(module_name, file_path)
            if not (spec and spec.loader):
                raise Exception("Could not create module spec")

            user_module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = user_module
            spec.loader.exec_module(user_module)
            
            if hasattr(user_module, "story"):
                user_module.story()

        # Process into FSM (Compile Logic)
        final_story_list = VisualNovelModule().to_list()
        
        if not final_story_list:
            return {"status": "success", "data": [], "state_count": 0, "group": group_slug}

        # Your custom compiler error will be raised here
        final_fsm = process_fsm(final_story_list)
        
        # Return the JSON directly on success
        return {
            "status": "success",
            "group": group_slug,
            "state_count": len(final_fsm),
            "data": final_fsm
        }
        
    # CATCH THE USER'S SCRIPT ERROR
    except ValueError as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=400, # Bad script input
            detail=f"Script Validation Error: {str(e)}"
        )
    # CATCH ANY OTHER ERROR
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500, # Something else went wrong on the server
            detail=f"Compilation Failed: {type(e).__name__} - {str(e)}"
        )
    
@router.post("/{slug}/flow/{group_slug}")
def save_flow(slug: str, group_slug: str, flow_data: dict = Body(...)):
    """Saves the flow structure for a script group."""
    folder = PROJECTS_DIR / slug
    if not folder.exists():
        raise HTTPException(404, "Project not found")

    flow_path = folder / "flow.json"

    # Validate basic structure
    if "startScene" not in flow_data or "scenes" not in flow_data:
        raise HTTPException(400, "flow.json must contain 'startScene' and 'scenes'")

    flow_path.write_text(json.dumps(flow_data, indent=2), encoding="utf-8")

    # Also register flow.json in manifest if not already there
    manifest_path = folder / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        for group in manifest.get("script_groups", []):
            if group["slug"] == group_slug:
                if "flow.json" not in group.get("source_files", []):
                    # Don't add flow.json to source_files — it's not a script
                    # But we might want to note it exists
                    pass

    return {"status": "saved", "scenes": len(flow_data.get("scenes", {}))}


@router.post("/{slug}/compile-flow/{group_slug}")
def compile_flow(slug: str, group_slug: str):
    """
    Compiles a project using flow.json + body .py files.
    Generates labels and conditionals in memory (no physical files).
    """
    project_path = PROJECTS_DIR / slug
    if not project_path.exists():
        raise HTTPException(404, "Project not found")

    # 1. Read flow.json
    flow_path = project_path / "flow.json"
    if not flow_path.exists():
        raise HTTPException(400, "flow.json not found. Create a flow first.")

    try:
        flow_data = json.loads(flow_path.read_text())
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid flow.json")

    start_scene = flow_data.get("startScene")
    scenes = flow_data.get("scenes", {})

    if not start_scene:
        raise HTTPException(400, "No startScene defined in flow.json")

    if str(Path.cwd()) not in sys.path:
        sys.path.append(str(Path.cwd()))

    try:
        VisualNovelModule.reset()

        # 2. Walk the flow graph — build execution order
        visited = set()
        execution_order = []  # List of ("label"|"body"|"cond", scene_id)

        def walk(scene_id):
            if scene_id in visited:
                return
            visited.add(scene_id)

            execution_order.append(("label", scene_id))
            execution_order.append(("body", scene_id))
            execution_order.append(("cond", scene_id))

            scene = scenes.get(scene_id, {})
            exit_data = scene.get("exit", {"type": "finish"})

            for branch in exit_data.get("branches", []):
                target = branch.get("target")
                if target:
                    walk(target)

        walk(start_scene)

        logs = []

        # 3. Execute each step
        for step_type, scene_id in execution_order:

            if step_type == "label":
                label_code = (
                    "from src.modules import VisualNovelModule\n"
                    "vn = VisualNovelModule()\n"
                    f"vn.label('{scene_id}')\n"
                )
                exec(label_code)
                logs.append(f"  [GEN] label('{scene_id}')")

            elif step_type == "body":
                body_file = project_path / f"{scene_id}.py"
                if body_file.exists():
                    module_name = f"flow_{slug}_{group_slug}_{scene_id}_body"
                    if module_name in sys.modules:
                        del sys.modules[module_name]

                    spec = importlib.util.spec_from_file_location(module_name, body_file)
                    if spec and spec.loader:
                        user_module = importlib.util.module_from_spec(spec)
                        sys.modules[module_name] = user_module
                        spec.loader.exec_module(user_module)
                        if hasattr(user_module, "story"):
                            user_module.story()
                            logs.append(f"  [OK] {scene_id}.py")
                        else:
                            logs.append(f"  [WARN] {scene_id}.py: no story()")
                else:
                    logs.append(f"  [SKIP] {scene_id}.py not found")

            elif step_type == "cond":
                scene = scenes.get(scene_id, {})
                exit_data = scene.get("exit", {"type": "finish"})
                cond_code = _generate_conditional_python(scene_id, exit_data)
                exec(cond_code)
                logs.append(f"  [GEN] {exit_data.get('type', 'finish')} for '{scene_id}'")

        # 4. Compile
        final_list = VisualNovelModule().to_list()

        if not final_list:
            return {
                "status": "success",
                "group": group_slug,
                "state_count": 0,
                "data": [],
                "logs": logs
            }

        final_fsm = process_fsm(final_list)

        return {
            "status": "success",
            "group": group_slug,
            "state_count": len(final_fsm),
            "data": final_fsm,
            "logs": logs
        }

    except ValueError as e:
        traceback.print_exc()
        raise HTTPException(400, f"Script Error: {str(e)}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Compilation Failed: {type(e).__name__} - {str(e)}")


def _generate_conditional_python(scene_id: str, exit_data: dict) -> str:
    """Generates Python code for a conditional exit. Returns a string for exec()."""
    exit_type = exit_data.get("type", "finish")
    branches = exit_data.get("branches", [])

    if exit_type == "choice":
        pairs = []
        for b in branches:
            target = b.get("target", "")
            label = b.get("label", target)
            pairs.append(f'        "{target}": "{label}"')
        choices_str = ",\n".join(pairs)
        return (
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
            f"vn.choice({{\n{choices_str}\n    }})\n"
        )

    elif exit_type == "jump":
        target = branches[0]["target"] if branches else ""
        return (
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
            f"vn.jumpTo(\"{target}\")\n" if target else
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
            "vn.finish()\n"
        )

    elif exit_type == "random":
        events = [f'"{b["target"]}"' for b in branches if b.get("target")]
        events_str = ", ".join(events)
        return (
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
            f"vn.random_dialogue([{events_str}])\n"
        )

    elif exit_type == "cond":
        cond = exit_data.get("condition", {})
        var = cond.get("var", "")
        op = cond.get("op", "equal")
        value = cond.get("value", "")
        tb = branches[0] if len(branches) > 0 else None
        fb = branches[1] if len(branches) > 1 else None

        # Map op to method
        method_map = {
            "equal": "condSame",
            "not_equal": "condNotSame",
            "less_than": "condLessThan",
            "greater_than": "condMoreThan",
        }
        method = method_map.get(op, "condSame")

        code = (
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
        )
        code += f'vn.{method}("{var}", {value}, [\n'
        if tb and tb.get("target"):
            code += f'        vn.jumpTo("{tb["target"]}", nested=True)\n'
        code += "    ])\n"
        if fb and fb.get("target"):
            code += f'vn.jumpTo("{fb["target"]}")\n'
        return code

    else:  # finish
        return (
            "from src.modules import VisualNovelModule\n"
            "vn = VisualNovelModule()\n"
            "vn.finish()\n"
        )

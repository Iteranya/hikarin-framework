import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Body
from src.model import ProjectManifest

router = APIRouter(prefix="/api/projects", tags=["Projects"])

PROJECTS_DIR = Path("projects")
PROJECTS_DIR.mkdir(exist_ok=True)

# ============================
# PROJECT CRUD
# ============================

@router.get("/")
def list_projects():
    projects = []
    for folder in PROJECTS_DIR.iterdir():
        if folder.is_dir():
            # Try to read manifest, otherwise return basic info
            manifest_path = folder / "manifest.json"
            if manifest_path.exists():
                with open(manifest_path) as f:
                    projects.append(json.load(f))
            else:
                projects.append({"slug": folder.name, "name": folder.name})
    return projects

@router.post("/")
def create_project(manifest: ProjectManifest):
    folder = PROJECTS_DIR / manifest.slug
    if folder.exists():
        raise HTTPException(400, "Project already exists")
    
    folder.mkdir()
    
    # Save Manifest (JSON)
    with open(folder / "manifest.json", "w") as f:
        json.dump(manifest.__dict__, f, indent=4)
        
    # Create empty script
    with open(folder / "main.py", "w") as f:
        f.write("# Main Script\n")

    return {"status": "created", "path": str(folder)}

# ============================
# FILE EDITOR (Scripts & JSON)
# ============================

@router.get("/{slug}/files")
def list_project_files(slug: str):
    """Lists all .py and .json files in the project folder"""
    folder = PROJECTS_DIR / slug
    if not folder.exists(): raise HTTPException(404, "Project not found")
    
    files = []
    for f in folder.glob("*"):
        if f.suffix in ['.py', '.json']:
            files.append(f.name)
    return files

@router.get("/{slug}/file/{filename}")
def read_file(slug: str, filename: str):
    """Reads content of a script or json file"""
    path = PROJECTS_DIR / slug / filename
    if not path.exists(): raise HTTPException(404, "File not found")
    
    return {"filename": filename, "content": path.read_text(encoding="utf-8")}

@router.post("/{slug}/file/{filename}")
def write_file(slug: str, filename: str, content: str = Body(..., embed=True)):
    """
    Writes content.
    Validates that we are only writing JSON or Python to prevent mess.
    """
    if not (filename.endswith(".py") or filename.endswith(".json")):
        raise HTTPException(400, "Only .py and .json files allowed here")
        
    folder = PROJECTS_DIR / slug
    path = folder / filename
    
    # If it's JSON, maybe validate it parses before saving?
    if filename.endswith(".json"):
        try:
            json.loads(content) # Check if valid fish
        except json.JSONDecodeError:
            raise HTTPException(400, "Invalid JSON format")

    path.write_text(content, encoding="utf-8")
    return {"status": "saved"}

@router.post("/{slug}/compile")
def compile_project(slug: str):
    """
    1. Reads the project scripts.
    2. Runs the Compiler (your SDK logic).
    3. Writes the Pure Data (FSM Json) to /generated.
    """
    project_path = PROJECTS_DIR / slug
    script_path = project_path / "script.py"
    output_path = project_path / "generated" / "fsm.json"
    
    if not script_path.exists():
        raise HTTPException(404, "No script.py found to compile!")

    # Ensure generated folder exists
    output_path.parent.mkdir(exist_ok=True)

    try:
        # ---------------------------------------------------------
        # HERE IS WHERE WE CALL YOUR COMPILER LOGIC
        # ---------------------------------------------------------
        # Option A: If compiler.py is a library, we import and run it.
        # Assuming src.compiler has a function `compile_source(source_code) -> dict`
        
        from src.compiler import compile_dsl_to_json
        
        source_code = script_path.read_text(encoding="utf-8")
        
        # The Magic happens here
        fsm_data = compile_dsl_to_json(source_code)
        
        # Save the Pure Data
        with open(output_path, "w") as f:
            json.dump(fsm_data, f, indent=2)
            
        return {
            "status": "success", 
            "message": "FSM Generated successfully", 
            "output_path": str(output_path)
        }
        
    except Exception as e:
        # If the user wrote bad code, return the error so the UI can show it
        return {
            "status": "error", 
            "message": str(e)
        }
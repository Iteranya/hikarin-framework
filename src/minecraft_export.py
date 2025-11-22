import os
import shutil
import json
from pathlib import Path
from typing import Optional

# Import models to know what we are exporting
from src.model import ProjectManifest

def export_resource_pack(slug: str, manifest: ProjectManifest) -> str:
    """
    Builds the Minecraft Resource Pack.
    Returns the absolute path to the generated .zip file.
    """
    
    # 1. CONFIGURATION & PATHS
    # ------------------------
    ROOT_DIR = Path.cwd()
    PROJECT_DIR = ROOT_DIR / "projects" / slug
    LIBRARY_DIR = ROOT_DIR / "library"
    
    # Output location (we'll save the zip inside the project folder for now)
    OUTPUT_DIR = PROJECT_DIR / "exports"
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    ZIP_NAME = f"{slug}_v{manifest.version}"
    ZIP_PATH = OUTPUT_DIR / ZIP_NAME # shutil.make_archive adds .zip automatically
    
    # Temp Build Directory
    BUILD_DIR = OUTPUT_DIR / "temp_build"
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    BUILD_DIR.mkdir()

    # Minecraft Structure
    ASSETS_ROOT = BUILD_DIR / "assets" / "mobtalkerredux"
    TEXTURES_DIR = ASSETS_ROOT / "textures"
    SOUNDS_DIR = ASSETS_ROOT / "sounds"
    CHAR_TEXTURES_DIR = TEXTURES_DIR / "characters"
    
    ASSETS_ROOT.mkdir(parents=True)
    TEXTURES_DIR.mkdir()
    SOUNDS_DIR.mkdir()
    CHAR_TEXTURES_DIR.mkdir()

    try:
        # 2. CREATE METADATA (pack.mcmeta)
        # --------------------------------
        # We use a mapping for Minecraft versions -> Pack Format
        # 1.20.1 = 15, 1.21 = 34 (This changes constantly, so we assume 15+ or let user set it)
        # For now, default to 15 (1.20.x)
        pack_format = 15 
        
        mcmeta = {
            "pack": {
                "description": f"{manifest.name} - {manifest.description}",
                "pack_format": pack_format
            }
        }
        
        with open(BUILD_DIR / "pack.mcmeta", "w") as f:
            json.dump(mcmeta, f, indent=4)

        # 3. COPY PACK ICON
        # -----------------
        # Priority: Project pack.png > Library pack.png > None
        proj_icon = PROJECT_DIR / "pack.png"
        lib_icon = LIBRARY_DIR / "pack.png"
        
        if proj_icon.exists():
            shutil.copy2(proj_icon, BUILD_DIR / "pack.png")
        elif lib_icon.exists():
            shutil.copy2(lib_icon, BUILD_DIR / "pack.png")

        # 4. MERGE ASSETS (Library + Project)
        # -----------------------------------
        
        # --- A. GLOBAL IMAGES ---
        # Copy Library Images -> textures/
        lib_imgs = LIBRARY_DIR / "images"
        if lib_imgs.exists():
            _copy_tree_contents(lib_imgs, TEXTURES_DIR)
            
        # Copy Project Images -> textures/ (Overwrites Library)
        proj_imgs = PROJECT_DIR / "assets" / "images"
        if proj_imgs.exists():
            _copy_tree_contents(proj_imgs, TEXTURES_DIR)

        # --- B. GLOBAL AUDIO ---
        # Copy Library Audio -> sounds/
        lib_audio = LIBRARY_DIR / "audio"
        if lib_audio.exists():
            _copy_tree_contents(lib_audio, SOUNDS_DIR)
            
        # Copy Project Audio -> sounds/ (Overwrites Library)
        proj_audio = PROJECT_DIR / "assets" / "audio"
        if proj_audio.exists():
            _copy_tree_contents(proj_audio, SOUNDS_DIR)

        # --- C. CHARACTERS (Special Handling) ---
        # We need to copy 'library/characters/{id}/*.png' to 'textures/characters/{id}/'
        # We Ignore data.json
        lib_chars = LIBRARY_DIR / "characters"
        if lib_chars.exists():
            for char_folder in lib_chars.iterdir():
                if char_folder.is_dir():
                    target_char_dir = CHAR_TEXTURES_DIR / char_folder.name
                    target_char_dir.mkdir(exist_ok=True)
                    
                    for file in char_folder.iterdir():
                        if file.suffix.lower() in ['.png', '.jpg']:
                            shutil.copy2(file, target_char_dir / file.name)

        # 5. COPY GENERATED SCRIPTS (FSM JSON)
        # ------------------------------------
        # These go directly into assets/mobtalkerredux/
        generated_dir = PROJECT_DIR / "generated"
        if generated_dir.exists():
            for f in generated_dir.glob("*.json"):
                shutil.copy2(f, ASSETS_ROOT / f.name)

        # 6. ZIP IT UP
        # ------------
        archive_path = shutil.make_archive(str(ZIP_PATH), 'zip', BUILD_DIR)
        return archive_path

    finally:
        # 7. CLEANUP
        if BUILD_DIR.exists():
            shutil.rmtree(BUILD_DIR)

def _copy_tree_contents(src: Path, dst: Path):
    """Helper to copy files from src to dst, merging folders."""
    for item in src.iterdir():
        if item.is_dir():
            # If directory, recurse
            target_subdir = dst / item.name
            target_subdir.mkdir(exist_ok=True)
            _copy_tree_contents(item, target_subdir)
        else:
            # If file, copy
            shutil.copy2(item, dst / item.name)
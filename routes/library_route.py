import shutil
import json
import os
from pathlib import Path
from typing import List, Dict, Literal

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from dataclasses import asdict

# Import Models
from src.model import Character, AssetFile

router = APIRouter(prefix="/api/library", tags=["Library"])

# CONFIG: Where the assets live
LIBRARY_DIR = Path("library")
CHAR_DIR = LIBRARY_DIR / "characters"
AUDIO_DIR = LIBRARY_DIR / "audio"
IMAGE_DIR = LIBRARY_DIR / "images"

# Ensure structure exists
CHAR_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)

# ==========================================
# 1. CHARACTER MANAGEMENT
# ==========================================

@router.get("/characters", response_model=List[Character])
def get_all_characters():
    """
    Scans library/characters/{id}/data.json
    Returns a list of all defined characters.
    """
    chars = []
    for folder in CHAR_DIR.iterdir():
        if folder.is_dir():
            data_file = folder / "data.json"
            if data_file.exists():
                try:
                    with open(data_file, "r") as f:
                        data = json.load(f)
                        # Convert dict to Character dataclass to ensure validity
                        chars.append(Character(**data))
                except Exception as e:
                    print(f"Failed to load character in {folder}: {e}")
    return chars

@router.post("/characters")
def save_character(character: Character):
    """
    Creates or Updates a character.
    Saves the metadata to library/characters/{id}/data.json
    """
    folder = CHAR_DIR / character.id
    folder.mkdir(exist_ok=True)
    
    file_path = folder / "data.json"
    with open(file_path, "w") as f:
        # asdict converts the dataclass to a clean dictionary
        json.dump(asdict(character), f, indent=4)
        
    return {"status": "saved", "id": character.id}

@router.delete("/characters/{char_id}")
def delete_character(char_id: str):
    """Deletes a character and all their assets."""
    folder = CHAR_DIR / char_id
    if not folder.exists():
        raise HTTPException(404, "Character not found")
    
    shutil.rmtree(folder)
    return {"status": "deleted"}

# ==========================================
# 2. CHARACTER ASSETS (Skins/Voice)
# ==========================================

@router.get("/characters/{char_id}/assets", response_model=List[AssetFile])
def list_character_assets(char_id: str):
    """
    Lists all files inside a specific character's folder
    (excluding data.json).
    """
    folder = CHAR_DIR / char_id
    if not folder.exists():
        raise HTTPException(404, "Character not found")
    
    assets = []
    for f in folder.iterdir():
        if f.is_file() and f.name != "data.json":
            assets.append(AssetFile(
                filename=f.name,
                path=str(f.absolute()),
                # Assuming you mount '/static' to the library folder in main.py
                url_path=f"/static/characters/{char_id}/{f.name}",
                size=f.stat().st_size
            ))
    return assets

@router.post("/characters/{char_id}/upload")
async def upload_character_asset(
    char_id: str, 
    file: UploadFile = File(...)
):
    """
    Uploads a sprite/skin specifically for this character.
    """
    folder = CHAR_DIR / char_id
    if not folder.exists():
        raise HTTPException(404, "Character does not exist. Create it first.")
    
    file_location = folder / file.filename
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "uploaded", "filename": file.filename}

# ==========================================
# 3. GLOBAL ASSETS (Audio/Backgrounds)
# ==========================================

@router.get("/assets/{asset_type}", response_model=List[AssetFile])
def list_global_assets(asset_type: Literal["audio", "images"]):
    """
    Lists files in library/audio or library/images.
    """
    if asset_type == "audio":
        target_dir = AUDIO_DIR
    elif asset_type == "images":
        target_dir = IMAGE_DIR
    else:
        raise HTTPException(400, "Invalid asset type")
    
    assets = []
    for f in target_dir.iterdir():
        if f.is_file():
            assets.append(AssetFile(
                filename=f.name,
                path=str(f.absolute()),
                url_path=f"/static/{asset_type}/{f.name}",
                size=f.stat().st_size
            ))
    return assets

@router.post("/assets/{asset_type}")
async def upload_global_asset(
    asset_type: Literal["audio", "images"], 
    file: UploadFile = File(...)
):
    """
    Uploads a file to the global library.
    """
    if asset_type == "audio":
        target_dir = AUDIO_DIR
    elif asset_type == "images":
        target_dir = IMAGE_DIR
    else:
        raise HTTPException(400, "Invalid asset type")
        
    file_location = target_dir / file.filename
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "uploaded", "filename": file.filename}
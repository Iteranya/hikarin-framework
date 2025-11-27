import shutil
import json
import os
from pathlib import Path
from typing import List, Dict, Literal
import uuid

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
    Lists all files inside a specific character's 'default' folder
    (excluding data.json).
    """
    # 1. Check if the character itself exists
    char_root = CHAR_DIR / char_id
    if not char_root.exists():
        raise HTTPException(404, "Character not found")
    
    # 2. Target the 'default' subdirectory
    asset_folder = char_root / "default"
    
    assets = []
    
    # 3. Check if 'default' folder exists before trying to iterate
    if asset_folder.exists():
        for f in asset_folder.iterdir():
            if f.is_file() and f.name != "data.json":
                assets.append(AssetFile(
                    filename=f.name,
                    path=str(f.absolute()),
                    # Matches the physical structure: /characters/{id}/default/{file}
                    url_path=f"/media/characters/{char_id}/default/{f.name}",
                    size=f.stat().st_size
                ))
            
    return assets

@router.post("/characters/{char_id}/upload")
async def upload_character_asset(
    char_id: str, 
    file: UploadFile = File(...)
):
    """
    Uploads a sprite/skin specifically for this character into the 'default' folder.
    """
    # 1. Check if the character root folder exists
    char_root = CHAR_DIR / char_id
    if not char_root.exists():
        raise HTTPException(404, "Character does not exist. Create it first.")
    
    # 2. Define the 'default' folder path
    target_folder = char_root / "default"
    
    # 3. Create the 'default' folder if it doesn't exist yet
    target_folder.mkdir(parents=True, exist_ok=True)
    
    file_location = target_folder / file.filename
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {
        "status": "uploaded", 
        "filename": file.filename, 
        "subfolder": "default"
    }

# --- NEW ROUTE ---
@router.post("/characters/{char_id}/profile-image")
async def upload_character_profile_image(
    char_id: str, 
    file: UploadFile = File(...)
):
    """
    Uploads a profile image for a character and updates their metadata.
    """
    char_root = CHAR_DIR / char_id
    if not char_root.exists():
        raise HTTPException(404, "Character does not exist. Create it first.")

    # Sanitize and create a unique filename to avoid conflicts
    file_extension = Path(file.filename).suffix
    # e.g., _profile_a1b2c3d4.png
    new_filename = f"_profile_{uuid.uuid4().hex[:8]}{file_extension}"
    file_location = char_root / new_filename

    # Save the uploaded file
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # --- Update the character's metadata ---
    meta_file = char_root / "data.json"
    if not meta_file.exists():
        # This shouldn't happen if the character was created properly
        raise HTTPException(500, "Character metadata file not found.")

    with open(meta_file, "r+") as f:
        data = json.load(f)
        
        # Store the profile image filename in custom_data
        if "custom_data" not in data:
            data["custom_data"] = {}
        data["custom_data"]["profile_image"] = new_filename
        
        # Go back to the beginning of the file to overwrite it
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()

    return {
        "status": "uploaded",
        "profile_image": new_filename,
        "url_path": f"/media/characters/{char_id}/{new_filename}"
    }

@router.get("/sprite-map", response_model=Dict[str, List[str]])
def get_all_character_sprites_map():
    """
    Efficiently scans ALL characters and returns a map of their sprites.
    Used by the frontend to populate dropdowns without N+1 requests.
    
    Returns:
    {
        "monika": ["happy.png", "sad.png"],
        "sans": ["blue_eye.png"]
    }
    """
    sprite_map = {}

    # Iterate over every character folder in library/characters
    for char_folder in CHAR_DIR.iterdir():
        if char_folder.is_dir():
            char_id = char_folder.name
            
            # Target the 'default' subdirectory where sprites live
            assets_path = char_folder / "default"
            
            sprites = []
            
            if assets_path.exists():
                for f in assets_path.iterdir():
                    # Filter for valid image types (primarily PNG)
                    if f.is_file() and f.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp']:
                        sprites.append(f.name)
            
            # Sort them so they look nice in the dropdown
            sprite_map[char_id] = sorted(sprites)

    return sprite_map

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
                url_path=f"/media/{asset_type}/{f.name}",
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
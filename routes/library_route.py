import shutil
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from dataclasses import asdict
from src.model import Character

router = APIRouter(prefix="/api/library", tags=["Library & Assets"])

LIBRARY_DIR = Path("library")
CHAR_DIR = LIBRARY_DIR / "characters"
AUDIO_DIR = LIBRARY_DIR / "audio"

# Ensure paths exist
CHAR_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# ============================
# CHARACTER MANAGEMENT
# ============================

@router.get("/characters")
def get_all_characters():
    """Scans library/characters for subfolders and returns their data.json"""
    chars = []
    for folder in CHAR_DIR.iterdir():
        if folder.is_dir():
            data_file = folder / "data.json"
            if data_file.exists():
                with open(data_file, "r") as f:
                    chars.append(json.load(f))
    return chars

@router.post("/characters")
def save_character(character: Character):
    """Creates/Updates a character folder and data.json"""
    folder = CHAR_DIR / character.id
    folder.mkdir(exist_ok=True)
    
    file_path = folder / "data.json"
    with open(file_path, "w") as f:
        json.dump(asdict(character), f, indent=4)
        
    return {"status": "saved", "id": character.id}

@router.post("/characters/{char_id}/upload_asset")
def upload_character_asset(char_id: str, file: UploadFile = File(...)):
    """Uploads a sprite/skin specifically for this character"""
    folder = CHAR_DIR / char_id
    if not folder.exists():
        raise HTTPException(404, "Character not defined yet. Create it first.")
    
    file_path = folder / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "uploaded", "filename": file.filename}

# ============================
# GENERAL ASSETS (Audio/Textures)
# ============================

@router.get("/audio")
def list_audio():
    return [f.name for f in AUDIO_DIR.glob("*") if f.is_file()]

@router.post("/audio")
def upload_audio(file: UploadFile = File(...)):
    file_path = AUDIO_DIR / file.filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "filename": file.filename}
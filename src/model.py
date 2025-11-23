from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from enum import Enum



BASE_CHAR_PATH = Path("library/characters")
# ==========================================
# ENUMS (For Script Logic / Constants)
# ==========================================

class Status(str, Enum):
    """
    Represents dynamic game states used in the FSM conditions.
    """
    IS_DAY = "<is_day>"
    IS_NIGHT = "<is_night>"
    HOSTILES = "<hostiles>"
    BELOW_SKY = "<below_sky>"
    NEAR_HOME = "<near_home>"
    P_UID = "<p_uid>"
    P_HEALTH = "<p_health>"
    GAMEMODE = "<gamemode>"
    DIMENSION = "<dimension>"
    X_COOR = "<x_coor>"
    Y_COOR = "<y_coor>"
    Z_COOR = "<z_coor>"
    HELD_ITEM = "<held_item>"

# ==========================================
# CHARACTER MODEL (Library)
# ==========================================

@dataclass
class Character:
    """
    Represents a character, with data that can be loaded from a JSON file.
    """
    id: str
    name: str
    description: str = ""
    thoughts: str = ""
    outfit: str = "default"
    dyn_outfit:str = "default"
    tags: List[str] = field(default_factory=list)

    custom_data: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_id(cls, character_id: str):
        """
        A factory method to create a Character instance by loading
        its data from 'library/characters/{character_id}/data.json'.
        """
        # 1. Construct the full path to the data file
        file_path = BASE_CHAR_PATH / character_id / "data.json"
        
        # 2. Check if the file exists and raise a clear error if not
        if not file_path.exists():
            raise FileNotFoundError(f"Could not find character data at: {file_path}")
            
        # 3. Open, read, and parse the JSON file
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # 4. Create and return an instance of the class using the loaded data.
        # The **data syntax automatically maps dictionary keys to the
        # dataclass fields (e.g., "name" key becomes the name attribute).
        return cls(**data)

# ==========================================
# PROJECT MODEL (The Orchestrator)
# ==========================================

@dataclass
class ScriptGroup:
    """
    Represents ONE Output JSON (e.g., 'main_story.json').
    It is composed of MULTIPLE Python source files.
    """
    slug: str                  # The output filename (without .json)
    name: str                  # Display name in UI (e.g. "Main Story Chapter")
    source_files: List[str]    # The inputs: ["intro.py", "ch1.py", "ch2.py"]

@dataclass
class ProjectManifest:
    """
    The Project Configuration.
    Saved as 'projects/{slug}/manifest.json'.
    """
    slug: str
    name: str
    description: str = ""
    version: str = "0.0.1"
    authors: List[str] = field(default_factory=list)
    
    script_groups: List[ScriptGroup] = field(default_factory=lambda: [
        ScriptGroup(slug="behavior", name="Main Behavior", source_files=["main.py"])
    ])

# ==========================================
# ASSET MODEL (For API Responses)
# ==========================================

@dataclass
class AssetFile:
    """
    Used by the API to list files (images/audio) 
    found in the library or project assets.
    """
    filename: str
    path: str         # System path (for backend)
    url_path: str     # Web path (for frontend/Blockly to preview)
    size: int = 0
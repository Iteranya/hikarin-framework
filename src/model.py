from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum

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
    Defines a Character.
    Saved as 'library/characters/{id}/data.json'.
    """
    id: str
    name: str
    description: str = ""
    thoughts: str = ""
    outfit: str = "default"
    
    # Tags for searching/filtering in UI (e.g. ["female", "monster", "aggressive"])
    tags: List[str] = field(default_factory=list)
    
    # The Catch-All for any extra data you might need later
    # e.g. { "voice_pitch": 1.2, "height": 1.8, "favorite_item": "apple" }
    custom_data: Dict[str, Any] = field(default_factory=dict)

# ==========================================
# PROJECT MODEL (The Orchestrator)
# ==========================================

@dataclass
class ProjectManifest:
    """
    Defines a Project's configuration.
    Saved as 'projects/{slug}/manifest.json'.
    """
    slug: str
    name: str
    description: str = ""
    version: str = "0.0.1"
    authors: List[str] = field(default_factory=list)
    
    # The Orchestrator List: Defines execution order of scripts
    build_order: List[str] = field(default_factory=lambda: ["main.py"])

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
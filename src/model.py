from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict

# Base class helpers
@dataclass
class AssetFile:
    filename: str
    path: str
    url_path: str # For the UI to load it

@dataclass
class Character:
    # The core data that gets saved to library/characters/{id}/data.json
    id: str
    name: str
    description: str = ""
    thoughts: str = ""
    outfit: str = "default"
    
    # Metadata for the UI
    tags: List[str] = field(default_factory=list)

@dataclass
class ProjectManifest:
    slug: str
    name: str
    version: str = "0.1.0"
    description: str = ""
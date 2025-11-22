
from dataclasses import dataclass

@dataclass
class Project:
    slug:str
    name:str
    description:str
    tags:list[str]|None = None
    scripts_id:list[str]|None = None
    metadata:dict|None = None

@dataclass
class Script:
    slug:str
    name:str
    description:str
    tags:list[str]|None = None
    raw_code:str|None = None #File Name
    generated_json:dict|None = None #File Name


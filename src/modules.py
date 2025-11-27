# This is the Module
# Basically,  if you're looking to expand the SDK's current functionality...
# Just add new method here
# Adding new class unfortunately still doesn't work, (Yet), I'm working on it
# Feel free to customize it to your system~
from src.model import Character
import re
class VisualNovelModule:
    # A class-level attribute to hold the single instance
    _instance = None

    def __new__(cls, *args, **kwargs):
        """
        This special method controls the object creation process.
        """
        # If the single instance does not exist yet...
        if cls._instance is None:
            # ...create it and store it in the class attribute.
            print("--- Creating new VisualNovelModule instance ---")
            cls._instance = super(VisualNovelModule, cls).__new__(cls)
            # You can also initialize its state here
            cls._instance.dialogueDict = [] 
            # Add any other initializations you need
        
        # Always return the stored instance
        return cls._instance

    @classmethod
    def reset(cls):
        """
        A crucial helper method to clear the instance between compilations.
        This ensures compiling a new script group starts with a clean slate.
        """
        print("--- Resetting VisualNovelModule instance ---")
        cls._instance = None

    def to_list(self):
        # This logic is a bit tricky now, see note below
        return self.dialogueDict

    def initialize(self,scriptName):
        self.dialogueDict.append({
            "type":"meta",
            "action":"initialize",
            "scriptName": scriptName
        })
    
    def start(self):
        result = {
            "type":"meta",
            "action":"start"
        }
        self.dialogueDict.append(result)
        return result

    def say(self, character, content, nested=False):
        name = ""
        if isinstance(character, Character):
            name = character.name
        elif character == None:
            name = ""
        else:
            name = character
        print("Compiling: " + content)
        contains_uppercase = any(char.isupper() for char in content)

        # Check if content has no whitespace and is uppercase
        # if not contains_uppercase and not any(char in content for char in [' ', '.', ',', '!', '?', '#','@','$','*','`',':']):
        #     raise ValueError("Look suspiciously like a 'show' statement because it contains no whitespace or a capital letter. If this is a mistake, use 'say_special' instead of say to bypass this check. But seriously, do double check it, okay??? You probably want to do a `show(c,\""+content+"\")` rather than `say(c,"+content+")`. This check will make your life easier, I swear, it's better if you caught on to this error in the SDK than in Minecraft. At least you don't have to wait to boot up minecraft to check all these errors. Ya hear??? But if  you really don't like it, then you can disable this check permanently by going to modules.py and disable the raise value  stuff in the say method. Don't say I didn't warn you.")
        result = {
            "type": "dialogue",
            "action": "say",
            "label": name,
            "content": content
        }
        if not nested:
            self.dialogueDict.append(result)
        return result
    
    def speak(self, character, content, voice:str=None,nested=False):
        name = ""
        if isinstance(character, Character):
            name = character.name
        elif character == None:
            name = ""
        else:
            name = character
        print("Compiling: " + content)
        contains_uppercase = any(char.isupper() for char in content)

        # Check if content has no whitespace and is uppercase
        if not contains_uppercase and not any(char in content for char in [' ', '.', ',', '!', '?', '#','@','$','*','`',':']):
            print("Look suspiciously like a 'show' statement because it contains no whitespace or a capital letter.")
        result = {
            "type": "dialogue",
            "action": "say",
            "label": name,
            "content": content,
            "voice":voice
        }
        if not nested:
            self.dialogueDict.append(result)
        return result
    
    def say_special(self, character, content, nested=False):
        name = ""
        if isinstance(character, Character):
            name = character.name
        elif character == None:
            name = ""
        else:
            name = character
        print("Compiling: " + content)

        result = {
            "type": "dialogue",
            "action": "say",
            "label": name,
            "content": content
        }
        if not nested:
            self.dialogueDict.append(result)
        return result
    
    def background(self,background):
        result = {
            "type":"modify_background",
            "background":"images/"+background
        }
        self.dialogueDict.append(result)
        return result
    
    def voice_effect(self, sound):
        result = {
            "type":"play_sound",
            "action":"sound_effect",
            "sound":sound
        }
        self.dialogueDict.append(result)
        return result
    
    def play_music(self, music):
        result = {
            "type":"play_music",
            "action":"play_music",
            "music":music
        }
        self.dialogueDict.append(result)
        return result
    
    def stop_music(self):
        result = {
            "type":"play_music",
            "action":"stop_music",
            "music":None
        }
        self.dialogueDict.append(result)
        return result
    def show(self, character, sprite, nested=False):
        if isinstance(character, Character):
            # Check if sprite contains any whitespace
            
            location = "characters/" + character.id + "/" + character.outfit + "/" + sprite
            dyn_location = "characters/" + character.id + "/" + character.dyn_outfit + "/" + sprite
            print("Compiling: " + sprite)

            result = {
                "type": "show_sprite",
                "action": "show",
                "sprite": character.id,
                "location": location,
                "dyn_location":dyn_location,
                "position": "CENTER",
                "wRatio": 16,
                "hRatio": 9,
                "wFrameRatio": 4,
                "hFrameRatio": 8,
                "column": 7,
                "row": 1
            }
            if not nested:
                self.dialogueDict.append(result)
            return result
        else:
            pass

    def show_custom(self,character,sprite,wRatio,hRatio,wFrameRatio,hFrameRatio,colPos,rowPos,nested=False):
        if isinstance(character, Character): 
            location = "characters/" + character.id + "/" + character.outfit + "/" + sprite
            dyn_location = "characters/" + character.id + "/" + character.dyn_outfit + "/" + sprite
            print("Compiling: "+sprite)
            result = {
                "type":"show_sprite",
                "action":"show",
                "sprite":character.id,
                "location":location,
                "dyn_location" : dyn_location,
                "position":"CUSTOM",
                "wRatio": wRatio,
                "hRatio": hRatio,
                "wFrameRatio":wFrameRatio,
                "hFrameRatio":hFrameRatio,
                "column":colPos,
                "row":rowPos
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        elif isinstance(character,str):
            location = character+"/"+sprite
            print("Compiling: "+sprite)
            result = {
                "type":"show_sprite",
                "action":"show",
                "sprite":sprite,
                "location":location,
                "position":"CUSTOM",
                "wRatio": wRatio,
                "hRatio": hRatio,
                "wFrameRatio":wFrameRatio,
                "hFrameRatio":hFrameRatio,
                "column":colPos,
                "row":rowPos
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        else:
            pass

    def show_left(self,character,sprite,nested=False):
        if isinstance(character, Character): 
  
            location = "characters/" + character.id + "/" + character.outfit + "/" + sprite
            dyn_location = "characters/" + character.id + "/" + character.dyn_outfit + "/" + sprite
            print("Compiling: "+sprite)
            result = {
                "type":"show_sprite",
                "action":"show",
                "sprite":character.id,
                "location":location,
                "dyn_location":dyn_location,
                "position":"LEFT",
                "wRatio": 16,
                "hRatio": 9,
                "wFrameRatio":4,
                "hFrameRatio":8,
                "column":3,
                "row":1
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        else:
            pass

    def show_right(self,character,sprite,nested=False):
        if isinstance(character, Character): 
  
            location = "characters/" + character.id + "/" + character.outfit + "/" + sprite
            dyn_location = "characters/" + character.id + "/" + character.dyn_outfit + "/" + sprite
            print("Compiling: "+sprite)
            result = {
                "type":"show_sprite",
                "action":"show",
                "sprite":character.id,
                "location":location,
                "dyn_location":dyn_location,
                "position":"LEFT",
                "wRatio": 16,
                "hRatio": 9,
                "wFrameRatio":4,
                "hFrameRatio":8,
                "column":10,
                "row":1
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        else:
            pass

    def show_full(self,character,sprite,nested=False):
        if isinstance(character,str):
            location = character+"/"+sprite
            print("Compiling: "+sprite)
            result = {
                "type":"show_sprite",
                "action":"show",
                "sprite":sprite,
                "location":location,
                "position":"CUSTOM",
                "wRatio": 16,
                "hRatio": 9,
                "wFrameRatio":16,
                "hFrameRatio":9,
                "column":1,
                "row":1
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        else:
            pass
    
    def remove(self,character,sprite="",nested=False):
        if isinstance(character, Character): 
            print("Compiling: "+sprite)
            result = {
                "type":"remove_sprite",
                "action":"remove_character",
                "sprite":character.id
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        elif isinstance(character,str):
            print("Compiling: "+sprite)
            result = {
                "type":"remove_sprite",
                "action":"remove",
                "sprite":sprite,
            }
            if(nested==False):
                self.dialogueDict.append(result)
            return result
        else:
            pass
        
        
    def choice(self,choice: dict,nested=False):
        print(choice)
        result = {
            "type":"choice",
            "action":"choice",
            "choice":[{"label": key, "display": value} for key, value in choice.items()]
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
        

    def label(self,labelName:str,nested=False):
        print("Compiling: "+labelName)
        result = {
            "type":"label",
            "action" : "label",
            "label":labelName
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result

    def jumpTo(self,labelName:str,nested=False):
        print("Compiling:" + labelName)
        result = {
            "type":"transition",
            "action":"jump",
            "label": labelName
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
    
    def jumpTo(self,labelName:str,nested=False):
        print("Compiling:" + labelName)
        result = {
            "type":"transition",
            "action":"jump",
            "label": labelName
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result

    def finish(self,nested=False):
        print("Compiling A Finish Line")
        result = {
            "type":"finish_dialogue",
            "action": "finish_dialogue"
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result

    ## LOCAL VAR STUFF

    def setVar(self,varName:str,init:any):
        print("Compiling: "+varName)
        result = {
            "type":"meta",
            "action": "create_var", 
            "var": varName,
            "init":init
        }
        self.dialogueDict.append(result)
        return result

    # You can use (-) instead of subVar
    def addVar(self,varName:str, addAmount:int):
        print("Compiling: "+varName)
        result = {
            "type":"modify_variable",
            "action": "increment_var", 
            "var": varName, 
            "value": addAmount
            }
        self.dialogueDict.append (result)
        return result

    def subVar(self,varName:str, subAmount:int):
        print("Compiling: "+varName)
        result = {
            "type":"modify_variable",
            "action": "subtract_var", 
            "var": varName, 
            "value": subAmount
        }
        self.dialogueDict.append(result)
        return result

    def modVar(self,varName:str, value:any):
        print("Compiling: "+varName)
        result = {
            "type":"modify_variable",
            "action": "modify_var", 
            "var": varName, 
            "value": value
        }
        self.dialogueDict.append(result)
        return result


    ## GLOBAL VAR STUFF

    def setGlobal(self,varName:str,init:any):
        print("Compiling: "+varName)
        result = {
            "type":"meta",
            "action": "create_global", 
            "var": varName,
            "init":init
        }
        self.dialogueDict.append(result)
        return result

    # You can use (-) instead of subVar
    def addVarGlobal(self,varName:str, addAmount:int):
        print("Compiling: "+varName)
        result = {
            "type":"modify_global",
            "action": "increment_var", 
            "var": varName, 
            "value": addAmount
            }
        self.dialogueDict.append (result)
        return result

    def subVarGlobal(self,varName:str, subAmount:int):
        print("Compiling: "+varName)
        result = {
            "type":"modify_global",
            "action": "subtract_var", 
            "var": varName, 
            "value": subAmount
        }
        self.dialogueDict.append(result)
        return result

    def modVarGlobal(self,varName:str, value:any):
        print("Compiling: "+varName)
        result = {
            "type":"modify_global",
            "action": "modify_var", 
            "var": varName, 
            "value": value
        }
        self.dialogueDict.append(result)
        return result

    def next(self,label):
        result = {
            "type":"next",
            "action":"next",
            "label":label
        }
        self.dialogueDict.append(result)
        return result
    
    def night_choice(self,choice: dict,nested=False):
        print(choice)
        result = {
            "type":"night_choice",
            "action":"choice",
            "choice":[{"label": key, "display": value} for key, value in choice.items()]
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
    
    def idle_chats(self,nested = False):
        result = {
            "type":"idle_chat",
            "action":"idle_chat"
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
    
    def unlock_dialogue(self,events:list,nested = False):
        result = {
            "type":"unlock_dialogues",
            "action":"unlock_dialogues",
            "events":events # list[str] containing labels
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
    
    def random_dialogue(self,events:list,nested = False):
        result = {
            "type":"random_dialogue",
            "action":"random_dialogue",
            "events":events # list[str] containing labels
        }
        if(nested==False):
            self.dialogueDict.append(result)
        return result
    
    def condNight(self,actions):
        print("Compiling: Night Condition")
        result = {
            "type":"conditional",
            "action":"conditional",
            "var": "isNight",
            "condition": "equal",
            "value":True,
            "actions":actions
        }
        self.dialogueDict.append(result)
        return result
    
    def condDay(self,actions):
        print("Compiling: Day Condition")
        result = {
            "type":"conditional",
            "action":"conditional",
            "var": "isDay",
            "condition": "equal",
            "value":True,
            "actions":actions
        }
        self.dialogueDict.append(result)
        return result


    def condSame(self,varName: str, equalValue, actions):
        print("Compiling: "+varName)
        result = {
            "type":"conditional",
            "action":"conditional",
            "condition": "equal",
            "var": varName,
            "value": equalValue,
            "actions":actions
        }
        self.dialogueDict.append(result)
        return result

    def condNotSame(self,varName: str, equalValue, actions: list):
        print("Compiling: "+varName)
        result = {
            "type":"conditional",
            "action":"conditional",
            "condition": "not_equal",
            "var": varName,
            "value": equalValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result

    def condLessThan(self,varName:str, lessThanValue, actions: list):
        print("Compiling: "+varName)
        result = {
            "type":"conditional",
            "action":"conditional",
            "condition": "less_than",
            "var": varName,
            "value": lessThanValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result

    def condMoreThan(self,varName:str, moreThanValue, actions: list):  
        print("Compiling: "+varName)
        result = {
            "type":"conditional",
            "action":"conditional",
            "condition": "greater_than",
            "var": varName,
            "value": moreThanValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result
    




    ### Global Condition

    def condSameGlobal(self,varName: str, equalValue, actions):
        print("Compiling: "+varName)
        result = {
            "type":"conditional_global",
            "action":"conditional",
            "condition": "equal",
            "var": varName,
            "value": equalValue,
            "actions":actions
        }
        self.dialogueDict.append(result)
        return result

    def condNotSameGlobal(self,varName: str, equalValue, actions: list):
        print("Compiling: "+varName)
        result = {
            "type":"conditional_global",
            "action":"conditional",
            "condition": "not_equal",
            "var": varName,
            "value": equalValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result

    def condLessThanGlobal(self,varName:str, lessThanValue, actions: list):
        print("Compiling: "+varName)
        result = {
            "type":"conditional_global",
            "action":"conditional",
            "condition": "less_than",
            "var": varName,
            "value": lessThanValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result

    def condMoreThanGlobal(self,varName:str, moreThanValue, actions: list):  
        print("Compiling: "+varName)
        result = {
            "type":"conditional_global",
            "action":"conditional",
            "condition": "greater_than",
            "var": varName,
            "value": moreThanValue,
            "actions": actions
        }
        self.dialogueDict.append(result)
        return result




    
    def getGamemode(self,nested = True):
        result = {
            "type":"command",
            "action":"get_gamemode"
        }
        if(nested==False):
            self.dialogueDict.append(result)
        
        return result

    def customCommand(self,minecraftCommand:str):
        result = {
            "type":"command",
            "action":"custom_command",
            "command":minecraftCommand
        }
        self.dialogueDict.append(result)
        return result
    
    def givePlayer(self,itemId:str,amount:int):
        result = {
            "type":"give_player",
            "action":"give_player",
            "item_id":itemId,
            "amount":amount
        }
        self.dialogueDict.append(result)
        return result
    

class SoundModule():

    def __init__(self):
        self.soundDict = []

    def voice(self, name):
        result= {
            f"sound.{name}": {
                "sounds": [
                    {
                        "name": f"mobtalkerredux:sound/{name}"
                    }
                ]
            }
        }
        self.soundDict.append(result)
        return result
    
    def music(self, name):
        result= {
            f"music.{name}": {
                "sounds": [
                    {
                        "name": f"mobtalkerredux:music/{name}",
                        "stream":True
                    }
                ]
            }
        }
        self.soundDict.append(result)
        return result
    
    def generate_sound_dict(self,start, end,name,sound):
        sound_dict = {}
        for i in range(start, end + 1):
            sound_key = f"sound.{name}-{i:02}"  # Formats the number as two digits
            sound_dict[sound_key] = {
                "sounds": [
                    {
                        "name": f"mobtalkerredux:sound/{name}-{i:02}",
                        "stream": True,
                        "volume": sound
                    }
                ]
            }
        self.soundDict.append(sound_dict)
        return sound_dict

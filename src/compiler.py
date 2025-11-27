import json
import unicodedata


def compileVN(script):
    # The story 'script' file, automatically compiles into a list of dict, each one represents a state
    script_actions = script
    # Go ahead and turn on the following to check the list of dict, each one represents a state
    # print(script_actions)
    flat = flattenVN(script_actions)
    flat = sanitize(flat)
    check(flat)
    return flat

def sanitize(data_list):
    # Known problematic characters and their replacements
    replacements = {
        '\u201c': '"',  # Left double quote
        '\u201d': '"',  # Right double quote
        '\u2018': "'",  # Left single quote
        '\u2019': "'",  # Right single quote
        '\u2013': '-',  # En dash
        '\u2014': '-',  # Em dash
        '\u2026': '...',  # Ellipsis
        '\u00a0': ' ',  # Non-breaking space
    }

    def sanitize_string(text):
        if not isinstance(text, str):
            return text

        # Replace known problematic characters
        for old, new in replacements.items():
            text = text.replace(old, new)

        # Remove other invisible/control characters
        sanitized = "".join(
            char if unicodedata.category(char)[0] != "C" else "?"  # Replace control chars
            for char in text
        )
        return sanitized

    def sanitize_dict(d):
        return {k: sanitize_string(v) if isinstance(v, str) else v for k, v in d.items()}

    return [sanitize_dict(d) for d in data_list]

def check(actions: list[dict]):
    print("Checking Starts Now...")
    existing_label = []
    existing_jump = []
    existing_id = {}

    for action in actions:
            if action["type"] == "label":
                existing_label.append(action["label"])
            elif action["type"] == "transition":
                existing_jump.append(action["label"])
            elif action["type"] == "unlock_dialogues":
                existing_jump+=action["events"]
            elif action["type"] == "choice":
                # Collect jump labels inside choice
                for choice in action["choice"]:
                    existing_jump.append(choice["label"])
            elif action["type"] == "next":
                existing_jump.append(action["label"])
            else:
                action_id = action["id"]
                if action_id in existing_id:
                    existing_id[action_id].append(action)
                else:
                    existing_id[action_id] = [action]
        
        # Check if any jump points to a non-existing label
    print("Checking Existing Label:")
    print(existing_label)
    print("Checking Existing Jump:")
    print(existing_jump)
    for jump in existing_jump:
        
        print("Checking for:")
        print(jump)
        if jump not in existing_label:
            raise ValueError(f"Label not found: {jump}")
    
    # Check for duplicate IDs and provide detailed error messages
    for action_id, actions_with_id in existing_id.items():
        if len(actions_with_id) > 1:
            action_details = "\n".join(str(action) for action in actions_with_id)
            raise ValueError(f"Duplicate action found:\n{action_details}")





# Flatten Conditional Statement
# To make the FSM as simple and lightweight as possible, we use custom Integer Id Indexing
# (TODO: Figure out if we can skip manual int indexing and use array indexing)
def flattenVN(actions: list[dict]) -> list[dict]:
    updated_actions = []
    actionIndex = 0 # First state in the FSM
    for action in actions:
        action["id"] = actionIndex # Put the state 0 or current number as 'id'
        if action["type"] == "conditional" or action["type"] == "conditional_global": # Conditionals are special
            subactions = []
            # There is no easy way to explain this
            # But basically... We want to...
            # Yeah, no I'm not explaining this, figure it out yourself future me.
            for subaction in action["actions"]:
                actionIndex += 1
                subaction["id"] = actionIndex
                subactions.append(subaction)
                
            action["end"] = actionIndex+1
            updated_actions.append(action)
            updated_actions+=subactions
            actionIndex +=1
            
        else:
            updated_actions.append(action)
            actionIndex +=1
            
    return updated_actions

def save_to_json_file(data: list[dict], file_path: str):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)


def compile(storyname,script):
    print("Compiling VN script to FSM...")
    fsm =compileVN(script)
    save_to_json_file(fsm,"mediafile/scripts/"+storyname+".json")

def sound_compile(sounds):
    result = compile_sound(sounds)
    save_to_json_file(result,"mediafile/scripts/sounds.json")

def compile_sound(sounds: list[dict]) -> dict:
    combined_dict = {}
    for sound_dict in sounds:
        combined_dict.update(sound_dict)
    return combined_dict

def process_fsm(raw_script_data: list[dict]) -> list[dict]:
    """
    Takes the raw dialogueDict from the VN Module, 
    cleans it, flattens it, and validates it.
    Returns the Pure Data (List of Dicts).
    """
    # 1. Flatten
    flat = flattenVN(raw_script_data)
    # 2. Sanitize
    flat = sanitize(flat)
    # 3. Validate
    print("Double Checking Script")
    check(flat)
    
    return flat
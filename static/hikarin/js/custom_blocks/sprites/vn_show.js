// js/sprites/vn_show.js

/**
 * Returns the definition for the vn_show block.
 * The Dropdown logic is embedded directly in the 'options' property.
 */
export const getDefinition = (spriteMap) => {
  // 1. Capture the map in this scope safely
  const localMap = spriteMap || {};

  // 2. Define the Generator Function
  // This runs every time the dropdown is opened (and once on init)
  const dynamicOptionsGenerator = function() {
    // 'this' refers to the FieldDropdown instance
    const block = this.getSourceBlock();
    
    // Safety check: if block isn't ready yet
    if (!block) return [["initialising...", "none"]];

    // A. Get the selected Character Variable ID
    // Note: We use the field name 'CHAR_VAR' defined in args0 below
    const varId = block.getFieldValue('CHAR_VAR');
    
    // B. Resolve ID to Real Variable Name (e.g. "monika")
    // If varId is null (block creation), default to something safe
    let varName = "m"; 
    if (varId) {
       const variable = block.workspace.getVariableById(varId);
       if (variable) {
         varName = variable.name;
       }
    }

    // C. Debug Log (Optional: View this in F12 Console)
    // console.log(`🔍 Show Block: Var="${varName}" | Map keys:`, Object.keys(localMap));

    // D. Look up sprites
    // We check exact match first, then fallback to lowercase just in case
    const sprites = localMap[varName] || localMap[varName.toLowerCase()];

    if (sprites && sprites.length > 0) {
      return sprites;
    }

    return [["sprite_not_found.png", "error.png"]];
  };

  return {
    "type": "vn_show",
    "message0": "show character %1 with sprite %2 at %3",
    "args0": [
      {
        "type": "field_variable",
        "name": "CHAR_VAR",
        "variable": "m",
        "variableTypes": ["Character"],
        "defaultType": "Character"
      },
      {
        "type": "field_dropdown",
        "name": "SPRITE_NAME",
        "options": dynamicOptionsGenerator // <--- PASS THE FUNCTION DIRECTLY HERE
      },
      {
        "type": "field_dropdown",
        "name": "POSITION",
        "options": [
          ["center", "show"],
          ["left", "show_left"],
          ["right", "show_right"]
        ]
      }
    ],
    // "extensions": ...  <--- REMOVED (No longer needed)
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Shows a character's sprite on the screen.",
    "helpUrl": ""
  };
};

export const generator = (block) => {
  // 1. Get ID
  const varId = block.getFieldValue('CHAR_VAR');
  
  // 2. Get Real Name
  const varModel = block.workspace.getVariableById(varId);
  const varName = varModel ? varModel.name : "m";

  // 3. Python Safe Name
  const charVar = Blockly.Python.nameDB_.getName(
      varName,
      Blockly.Names.NameType.VARIABLE
  );

  const spriteName = block.getFieldValue('SPRITE_NAME'); 
  const quotedSprite = Blockly.Python.quote_(spriteName);
  const positionFunc = block.getFieldValue('POSITION');
  
  if (Blockly.Python._inCondActions) {
    return `vn.${positionFunc}(${charVar}, ${quotedSprite}, nested=True),\n`;
  } else {
    return `vn.${positionFunc}(${charVar}, ${quotedSprite})\n`;
  }
};
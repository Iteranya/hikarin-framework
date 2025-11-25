// js/sprites/vn_show.js

export const getDefinition = (spriteOptions) => {
  const safeOptions = (spriteOptions && spriteOptions.length > 0) 
      ? spriteOptions 
      : [["no_sprites_found.png", "no_sprites_found.png"]];

  return {
    "type": "vn_show",
    "message0": "show character %1 with sprite %2 at %3",
    "args0": [
      {
        "type": "field_variable", // <--- CHANGED TO VARIABLE
        "name": "CHAR_VAR",
        "variable": "m"
      },
      {
        "type": "field_dropdown",
        "name": "SPRITE_NAME",
        "options": safeOptions
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
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Shows a character's sprite on the screen.",
    "helpUrl": ""
  };
};

export const generator = (block) => {
  // Get the variable name (e.g., "m")
  const charVar = Blockly.Python.nameDB_.getName(
      block.getFieldValue('CHAR_VAR'),
      Blockly.Variables.NAME_TYPE
  );

  const spriteName = block.getFieldValue('SPRITE_NAME'); 
  const quotedSprite = Blockly.Python.quote_(spriteName);
  const positionFunc = block.getFieldValue('POSITION');
  
  if (Blockly.Python._inCondActions) {
    return `vn.${positionFunc}(${charVar}, ${quotedSprite}, nested=True)\n`;
  } else {
    return `vn.${positionFunc}(${charVar}, ${quotedSprite})\n`;
  }
};
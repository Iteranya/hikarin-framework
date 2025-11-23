/**
 * @fileoverview Defines the 'vn_show' block.
 * This block displays a character sprite on the screen at a specified position.
 */

export const definition = {
  "type": "vn_show",
  "message0": "show character %1 with sprite %2 at %3",
  "args0": [
    {
      "type": "field_input",
      "name": "CHAR_VAR",
      "text": "m"
    },
    {
      "type": "field_input",
      "name": "SPRITE_NAME",
      "text": "happy"
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
  "tooltip": "Shows a character's sprite on the screen at the center, left, or right position.",
  "helpUrl": ""
};

export const generator = (block, pythonGenerator) => {
  const charVar = block.getFieldValue('CHAR_VAR');
  const spriteName = pythonGenerator.quote_(block.getFieldValue('SPRITE_NAME'));
  // The dropdown value directly corresponds to the Python function name.
  const positionFunc = block.getFieldValue('POSITION');
  if (pythonGenerator._inCondActions) {
    return `    vn.${positionFunc}(${charVar}, ${spriteName}, nested=True)\n`;
  }else{
    return `    vn.${positionFunc}(${charVar}, ${spriteName})\n`;
  }
  
};
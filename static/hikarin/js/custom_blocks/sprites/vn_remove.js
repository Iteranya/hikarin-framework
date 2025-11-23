/**
 * @fileoverview Defines the 'vn_remove' block.
 * This block hides a character's sprite.
 */

export const definition = {
  "type": "vn_remove",
  "message0": "remove character %1",
  "args0": [
    {
      "type": "field_input",
      "name": "CHAR_VAR",
      "text": "m"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160,
  "tooltip": "Hides a character's sprite from the screen.",
  "helpUrl": ""
};

export const generator = (block, pythonGenerator) => {
  const charVar = block.getFieldValue('CHAR_VAR');
  return `    vn.remove(${charVar})\n`;
};
/**
 * @fileoverview Defines the 'vn_remove_sprite' block.
 * Hides a generic sprite by its name tag.
 */

export const definition = {
  "type": "vn_remove_sprite",
  "message0": "remove sprite named %1",
  "args0": [
    {
      "type": "field_input",
      "name": "SPRITE_NAME",
      "text": "my_cg_image"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160, // Same green as other sprite blocks
  "tooltip": "Hides any sprite from the screen using its string name/tag.",
  "helpUrl": ""
};

export const generator = (block) => {
  const spriteName = Blockly.Python.quote_(block.getFieldValue('SPRITE_NAME'));

  if (Blockly.Python._inCondActions) {
    return `    vn.remove(${spriteName}, nested=True),\n`;
  } else {
    return `    vn.remove(${spriteName})\n`;
  }
};
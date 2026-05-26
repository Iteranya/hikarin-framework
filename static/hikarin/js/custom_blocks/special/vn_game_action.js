/**
 * @fileoverview Defines the 'vn_game_action' block.
 */

export const definition = {
  "type": "vn_game_action",
  "message0": "play game actions %1",
  "args0": [
    {
      "type": "field_input",
      "name": "GAME_ACTIONS",
      "text": "scene_change"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 345, // Special / Extra blocks
  "tooltip": "Run Game actions. Does not loop.",
  "helpUrl": ""
};

export const generator = (block) => {
  const gameActions = Blockly.Python.quote_(block.getFieldValue('GAME_ACTIONS'));
  
  if (Blockly.Python._inCondActions) {
    return `vn.game_action(${gameActions}, nested=True),\n`;
  } else {
    return `vn.game_action(${gameActions})\n`;
  }
};
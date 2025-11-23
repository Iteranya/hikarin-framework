/**
 * @fileoverview Defines the 'vn_idle_chats' block.
 * Triggers the idle chat system.
 */

export const definition = {
  "type": "vn_idle_chats",
  "message0": "trigger idle chats",
  "previousStatement": null,
  "nextStatement": null,
  "colour": 345, // A nice new color for special blocks!
  "tooltip": "Starts the system for showing random idle chats.",
  "helpUrl": ""
};

export const generator = (block) => {
  if (Blockly.Python._inCondActions) {
    return `    vn.idle_chats(nested=True),\n`;
  } else {
    return `    vn.idle_chats()\n`;
  }
};
/**
 * @fileoverview Defines the 'vn_unlock_dialogue' block.
 * Unlocks new dialogue events for the player.
 */

export const definition = {
  "type": "vn_unlock_dialogue",
  "message0": "unlock dialogue events: %1",
  "args0": [
    {
      "type": "field_input",
      "name": "EVENTS_LIST",
      "text": "['event_1', 'event_2']"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 345, // Same new color
  "tooltip": "Unlocks one or more dialogue events. Must be a valid Python list of strings.",
  "helpUrl": ""
};

export const generator = (block) => {
  // We trust the user to input a valid Python list string.
  const eventsList = block.getFieldValue('EVENTS_LIST');
  
  if (Blockly.Python._inCondActions) {
    return `vn.unlock_dialogue(${eventsList}, nested=True),\n`;
  } else {
    return `vn.unlock_dialogue(${eventsList})\n`;
  }
};
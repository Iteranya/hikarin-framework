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
      "text": "event_1, event_2" // Default text shows the user the format
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 345,
  "tooltip": "Enter event Labels separated by commas (e.g. event_1, event_2). No quotes or brackets needed.",
  "helpUrl": ""
};

export const generator = (block) => {
  const rawInput = block.getFieldValue('EVENTS_LIST');

  // 1. Split the string by commas
  // 2. .map: Remove whitespace from the start/end of every item
  // 3. .filter: Remove empty items (in case someone types "event1, , event2")
  // 4. .map: Wrap every item in single quotes
  const processedList = rawInput.split(',')
    .map(item => item.trim())     
    .filter(item => item !== "")  
    .map(item => `'${item}'`)     
    .join(', '); // Join them back together with commas

  // Add the brackets to make it a valid Python list
  const finalPythonCode = `[${processedList}]`;

  // Determine if we need a comma at the end (for your nested structure)
  if (Blockly.Python._inCondActions) {
    return `vn.unlock_dialogue(${finalPythonCode}, nested=True),\n`;
  } else {
    return `vn.unlock_dialogue(${finalPythonCode})\n`;
  }
};
/**
 * @fileoverview Defines the 'vn_say' block.
 * This is the most common block for displaying dialogue.
 */

export const definition = {
  "type": "vn_say",
  "message0": "character %1 says %2",
  "args0": [
    {
      "type": "field_input",
      "name": "CHAR_VAR",
      "text": "m"
    },
    {
      "type": "field_input",
      "name": "DIALOGUE",
      "text": "Hello there!"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 210,
  "tooltip": "Displays text in the dialogue box for a specific character.",
  "helpUrl": ""
};

export const generator = (block) => {
  const charVar = block.getFieldValue('CHAR_VAR');
  const dialogue = Blockly.Python.quote_(block.getFieldValue('DIALOGUE'));
  if (Blockly.Python._inCondActions) {
    return `    vn.say(${charVar}, ${dialogue},nested=True)\n`;
  }else{
    return `    vn.say(${charVar}, ${dialogue})\n`;
  }
  
};
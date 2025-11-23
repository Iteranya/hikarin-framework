/**
 * @fileoverview Defines the 'vn_speak' block.
 * Displays dialogue and plays a corresponding voice line.
 */

export const definition = {
  "type": "vn_speak",
  "message0": "character %1 speaks %2 with voice %3",
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
    },
    {
      "type": "field_input",
      "name": "VOICE_FILE",
      "text": "monika_happy.ogg"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 210,
  "tooltip": "Displays dialogue and plays a voice audio file at the same time.",
  "helpUrl": ""
};

export const generator = (block, pythonGenerator) => {
  const charVar = block.getFieldValue('CHAR_VAR');
  const dialogue = pythonGenerator.quote_(block.getFieldValue('DIALOGUE'));
  const voice = pythonGenerator.quote_(block.getFieldValue('VOICE_FILE'));
  if (pythonGenerator._inCondActions) {
    return `    vn.speak(${charVar}, ${dialogue}, voice=${voice},nested=True)\n`;
  }else{
    return `    vn.speak(${charVar}, ${dialogue}, voice=${voice})\n`;
  }
  
};
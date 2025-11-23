/**
 * @fileoverview Defines the 'vn_sound_effect' block.
 * Plays a one-shot sound effect.
 */

export const definition = {
  "type": "vn_sound_effect",
  "message0": "play sound effect %1",
  "args0": [
    {
      "type": "field_input",
      "name": "SOUND_FILE",
      "text": "door_creak.ogg"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 210, // Same blue as other presentation blocks
  "tooltip": "Plays a sound effect. Does not loop.",
  "helpUrl": ""
};

export const generator = (block) => {
  const soundFile = Blockly.Python.quote_(block.getFieldValue('SOUND_FILE'));
  
  if (Blockly.Python._inCondActions) {
    return `    vn.voice_effect(${soundFile}, nested=True),\n`;
  } else {
    return `    vn.voice_effect(${soundFile})\n`;
  }
};
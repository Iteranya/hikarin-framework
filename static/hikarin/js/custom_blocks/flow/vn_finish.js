/**
 * @fileoverview Defines the 'vn_finish' block.
 * This block ends the visual novel script.
 */

export const definition = {
  "type": "vn_finish",
  "message0": "finish story",
  "previousStatement": null,
  "nextStatement": null,
  "colour": 45,
  "tooltip": "DOES NOT END THE STORY!!! ONLY QUITS THE CONVERSATION!!!",
  "helpUrl": ""
};

export const generator = (block) => {
    if (Blockly.Python._inCondActions) {
        return `vn.finish(nested=True)\n`;
    }else{
        return `vn.finish()\n`;
    }
  
};
/**
 * @fileoverview Defines the 'vn_jump' block.
 * This block redirects the story flow to a specified label.
 */

export const definition = {
  "type": "vn_jump",
  "message0": "jump to label: %1",
  "args0": [
    {
      "type": "field_input",
      "name": "LABEL_NAME",
      "text": "start"
    }
  ],
  "previousStatement": null,
  "nextStatement": null, // Jumps are often terminal in a sequence, but allowing a next statement can be useful for unreachable code checks.
  "colour": 45,
  "tooltip": "Immediately jumps the story to the specified label.",
  "helpUrl": ""
};

export const generator = (block) => {
  const labelName = block.getFieldValue('LABEL_NAME');
  const safeLabelName = labelName.replace(/[^A-Za-z0-9_]/g, '');
  if (Blockly.Python._inCondActions) {
    return `vn.jumpTo("${safeLabelName}", nested=True)\n`;
  }else{
    return `vn.jumpTo("${safeLabelName}")\n`;
  }
  
};
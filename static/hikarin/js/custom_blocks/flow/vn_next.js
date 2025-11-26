/**
 * @fileoverview Defines the 'vn_label' block.
 * This block marks a specific point in the story that can be jumped to.
 */

export const definition = {
  "type": "vn_next",
  "message0": "next: %1",
  "args0": [
    {
      "type": "field_input",
      "name": "LABEL_NAME",
      "text": "start"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 45,
  "tooltip": "Creates a checkpoint or  autosave.",
  "helpUrl": ""
};

export const generator = (block) => {
  const labelName = block.getFieldValue('LABEL_NAME');
  // Ensure the label name is a valid identifier (basic sanitation)
  const safeLabelName = labelName.replace(/[^A-Za-z0-9_]/g, '');
  if (Blockly.Python._inCondActions) {
    return `vn.next("${safeLabelName}",nested=True),\n`;
  }else{
    return `vn.next("${safeLabelName}")\n`;
  }
  
};
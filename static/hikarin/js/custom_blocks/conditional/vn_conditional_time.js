/**
 * @fileoverview Defines the 'vn_conditional_time' block.
 * Executes actions based on whether it is day or night.
 */

export const definition = {
  "type": "vn_conditional_time",
  "message0": "if it is %1",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "TIME",
      "options": [
        ["day", "Day"],
        ["night", "Night"]
      ]
    }
  ],
  "message1": "then do: %1",
  "args1": [
    {
      "type": "input_statement",
      "name": "ACTIONS"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 195, // Same teal as other logic blocks
  "tooltip": "Runs the blocks inside only if it is currently day or night.",
  "helpUrl": ""
};

export const generator = (block) => {
  const time = block.getFieldValue('TIME'); // "Day" or "Night"

  // Use our flag to generate the inner blocks correctly
  Blockly.Python._inCondActions = true;
  const actionsCode = Blockly.Python.statementToCode(block, 'ACTIONS');
  Blockly.Python._inCondActions = false;

  if (!actionsCode.trim()) {
    return '';
  }

  const functionName = `cond${time}`; // condDay or condNight
  const code = `actions_list = [\n${actionsCode}    ]\nvn.${functionName}(actions=actions_list)\n`;
  return code;
};
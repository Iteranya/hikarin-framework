/**
 * @fileoverview Defines the 'vn_conditional' block.
 * Executes a list of actions only if a condition about a variable is met.
 */

export const definition = {
  "type": "vn_conditional",
  "message0": "if %1 variable %2 %3 %4",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "SCOPE",
      "options": [ ["global", "Global"], ["local", ""] ]
    },
    { "type": "field_input", "name": "VAR_NAME", "text": "moni_aff" },
    {
      "type": "field_dropdown",
      "name": "OPERATOR",
      "options": [
        ["is equal to", "Same"],
        ["is not equal to", "NotSame"],
        ["is greater than", "MoreThan"],
        ["is less than", "LessThan"]
      ]
    },
    { "type": "field_input", "name": "VALUE", "text": "5" }
  ],
  "message1": "then do: %1",
  "args1": [
    { "type": "input_statement", "name": "ACTIONS" }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 195,
  "tooltip": "Runs the blocks inside only if the condition is true.",
  "helpUrl": ""
};

export const generator = (block) => {
  const scope = block.getFieldValue('SCOPE'); // "Global" or ""
  const varName = Blockly.Python.quote_(block.getFieldValue('VAR_NAME'));
  const op = block.getFieldValue('OPERATOR'); // "Same", "NotSame", etc.
  const value = block.getFieldValue('VALUE');

  // THE MAGIC: Set a context flag before generating code for the inner blocks.
  Blockly.Python._inCondActions = true;
  const actionsCode = Blockly.Python.statementToCode(block, 'ACTIONS');
  // Unset the flag so it doesn't affect other blocks.
  Blockly.Python._inCondActions = false;

  // If there are no actions inside, we don't need to generate anything.
  if (!actionsCode.trim()) {
    return '';
  }

  // Construct the final Python code.
  const functionName = `cond${op}${scope}`; // e.g., "condSameGlobal"
  
  const code = `actions_list = [\n${actionsCode}    ]\nvn.${functionName}(${varName}, ${value}, actions=actions_list)\n`;
  return code;
};
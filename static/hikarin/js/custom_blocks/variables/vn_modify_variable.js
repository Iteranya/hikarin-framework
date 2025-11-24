/**
 * @fileoverview Defines the 'vn_modify_variable' block.
 * Adds, subtracts from, or sets a numeric variable.
 */

export const definition = {
  "type": "vn_modify_variable",
  "message0": "%1 %2 variable %3 to %4", // Updated message for better flow with "set"
  "args0": [
    {
      "type": "field_dropdown",
      "name": "OPERATION",
      "options": [
        ["set", "mod"], // "set" is more user-friendly
        ["add", "add"],
        ["subtract", "sub"]
      ]
    },
    {
      "type": "field_dropdown",
      "name": "SCOPE",
      "options": [
        ["global", "Global"],
        ["local", "Var"]
      ]
    },
    {
      "type": "field_input",
      "name": "VAR_NAME",
      "text": "moni_aff"
    },
    {
      "type": "field_input",
      "name": "VALUE",
      "text": "5"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 30,
  "tooltip": "Sets, adds to, or subtracts from a local or global variable.",
  "helpUrl": ""
};

export const generator = (block) => {
  const op = block.getFieldValue('OPERATION'); // "add", "sub", or "mod"
  const scope = block.getFieldValue('SCOPE'); // "Global" or "Var"
  const varName = Blockly.Python.quote_(block.getFieldValue('VAR_NAME'));
  const value = block.getFieldValue('VALUE');
  
  // This logic correctly builds the function name based on the operation
  const functionName = (op === 'mod') ? `modVar${scope}` : `${op}Var${scope}`;

  // This is our "smarter" logic for conditional blocks!
  if (Blockly.Python._inCondActions) {
    return `vn.${functionName}(${varName}, ${value}, nested=True),\n`;
  } else {
    return `vn.${functionName}(${varName}, ${value})\n`;
  }
};
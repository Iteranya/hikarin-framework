/**
 * @fileoverview Defines the 'vn_set_variable' block.
 * Sets a local or global variable to a specific value.
 */

export const definition = {
  "type": "vn_set_variable",
  "message0": "set %1 variable %2 to %3",
  "args0": [
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
      "text": "0"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 30,
  "tooltip": "Sets a variable to a value. Can be a number (e.g., 50), text (e.g., \"happy\"), or boolean (e.g., True).",
  "helpUrl": ""
};

export const generator = (block, pythonGenerator) => {
  // The dropdown value is either "Global" or "Var"
  const scope = block.getFieldValue('SCOPE');
  const varName = pythonGenerator.quote_(block.getFieldValue('VAR_NAME'));
  // The value is taken as-is, allowing users to type numbers, True/False, or quoted strings.
  const value = block.getFieldValue('VALUE');
  if (pythonGenerator._inCondActions) {
    return `    vn.set${scope}(${varName}, ${value}, nested=True)\n`;
  }else{
    return `    vn.set${scope}(${varName}, ${value})\n`;
  }
  
};
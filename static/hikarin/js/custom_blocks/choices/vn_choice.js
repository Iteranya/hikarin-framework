/**
 * @fileoverview Defines the Choice Container and Option blocks.
 * NOTE: You need to register BOTH definitions in your index.js
 */

// --- BLOCK 1: THE CONTAINER ---
export const definition = {
  "type": "vn_choice_menu", // Renamed to avoid conflict
  "message0": "Show Choices %1 %2",
  "args0": [
    { "type": "input_dummy" },
    { "type": "input_statement", "name": "OPTIONS", "check": "VN_OPTION" } 
    // 'check' ensures only Option blocks can go here
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 260,
  "tooltip": "Container for choices. Drag 'Choice Option' blocks inside here.",
};

export const generator = (block) => {
  // 1. Get all the code from the blocks stacked inside "OPTIONS"
  // This will return a string like: "'lbl1': 'txt1',\n 'lbl2': 'txt2',\n"
  const optionsCode = Blockly.Python.statementToCode(block, 'OPTIONS');

  // 2. Clean up: remove the trailing comma and whitespace
  // If empty, default to empty dict
  const cleanOptions = optionsCode.trim().replace(/,$/, '');

  if (!cleanOptions) {
    return '# [Warning] Empty Choice Block\n';
  }

  // 3. Wrap it in the Python Dictionary syntax
  const dictStr = `{\n${optionsCode}    }`;

  // 4. Handle your nesting logic
  if (Blockly.Python._inCondActions) {
    return `vn.choice(${dictStr}, nested=True)\n`;
  } else {
    return `vn.choice(${dictStr})\n`;
  }
};
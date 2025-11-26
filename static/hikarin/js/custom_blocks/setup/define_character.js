// js/custom_blocks/define_character.js

/**
 * Helper to turn a character ID (like "My Character") into a valid Python variable (like "my_character").
 */
function sanitizeVariableName(text) {
  // 1. Replace spaces/symbols with underscores
  let clean = text.replace(/[^a-zA-Z0-9_]/g, '_');
  // 2. Ensure it doesn't start with a number
  if (/^[0-9]/.test(clean)) {
    clean = 'char_' + clean;
  }
  return clean.toLowerCase();
}

/**
 * REGISTERS AN EXTENSION
 * This logic runs automatically when the block is used.
 * It ensures that if you pick "monika", a variable named "monika" exists.
 */
const EXTENSION_NAME = 'ensure_char_variable_exists';

if (!Blockly.Extensions.isRegistered(EXTENSION_NAME)) {
  Blockly.Extensions.register(EXTENSION_NAME, function() {
    this.setOnChange(function(changeEvent) {
      if (!this.workspace || this.isInFlyout) return;

      const charId = this.getFieldValue('CHAR_ID');
      if (!charId || charId === 'error') return;

      const varName = sanitizeVariableName(charId);

      // FIX: Check for variable of specific type 'Character'
      const existingVar = this.workspace.getVariable(varName, 'Character');
      
      if (!existingVar) {
        // FIX: Create variable with type 'Character'
        this.workspace.createVariable(varName, 'Character');
        console.log(`✨ Auto-created typed variable: ${varName}`);
      }
    });
  });
}

export function createDefinition(characterOptions) {
  const options = (characterOptions && characterOptions.length > 0)
    ? characterOptions
    : [["Error: No characters found", "error"]];

  return {
    "type": "define_character",
    "message0": "initialize character %1",
    "args0": [
      {
        "type": "field_dropdown",
        "name": "CHAR_ID",
        "options": options 
      }
    ],
    "extensions": [EXTENSION_NAME],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Initializes a character.",
    "helpUrl": ""
  };
}

export const generator = (block) => {
  const charId = block.getFieldValue('CHAR_ID');

  if (charId === 'error') {
    return '# ERROR: Could not define character due to loading error.\n';
  }

  // We generate the variable name dynamically based on the ID
  const varName = sanitizeVariableName(charId);

  // Result: monika = Character.from_id("monika")
  const code = `${varName} = Character.from_id("${charId}")\n`;
  return code;
};
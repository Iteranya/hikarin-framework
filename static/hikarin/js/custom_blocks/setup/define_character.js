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

// We wrap this in a check so we don't crash if we reload the script
if (!Blockly.Extensions.isRegistered(EXTENSION_NAME)) {
  Blockly.Extensions.register(EXTENSION_NAME, function() {
    // This runs whenever the block changes (dragged, modified, loaded)
    this.setOnChange(function(changeEvent) {
      if (!this.workspace || this.isInFlyout) return;

      // 1. Get the Character ID currently selected in the dropdown
      const charId = this.getFieldValue('CHAR_ID');
      if (!charId || charId === 'error') return;

      // 2. Convert ID to a safe variable name (e.g. "student_council" -> "student_council")
      const varName = sanitizeVariableName(charId);

      // 3. Check if this variable exists in the workspace. If not, create it!
      const existingVar = this.workspace.getVariable(varName);
      if (!existingVar) {
        this.workspace.createVariable(varName);
        console.log(`✨ Auto-created variable: ${varName}`);
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
    "message0": "initialize character %1", // Simplified text
    "args0": [
      {
        "type": "field_dropdown",
        "name": "CHAR_ID",
        "options": options 
      }
    ],
    // ADD THE EXTENSION HERE
    "extensions": [EXTENSION_NAME],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Initializes a character. A variable with the character's name will be created automatically.",
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
// js/custom_blocks/define_character.js

/**
 * @fileoverview A dynamic block for defining a character variable.
 * The dropdown is populated by data fetched from an API.
 */

// BLOCK DEFINITION FACTORY
// Instead of a static `definition` object, we export a function.
// This function receives the dynamic data and returns a block definition.
export function createDefinition(characterOptions) {
  // If characterOptions is empty or failed to load, provide a fallback.
  const options = (characterOptions && characterOptions.length > 0)
    ? characterOptions
    : [["Error: No characters found", "error"]];

  return {
    "type": "define_character",
    "message0": "define character %1 = %2",
    "args0": [
      {
        "type": "field_input",
        "name": "VAR_NAME",
        "text": "m" // A sensible default, like 'm' for Monika
      },
      {
        "type": "field_dropdown",
        "name": "CHAR_ID",
        "options": options // <-- The dynamic data is used here!
      }
    ],
    "previousStatement": null, // Can be stacked with other definitions.
    "nextStatement": null,
    "colour": 230,
    "tooltip": "Creates a variable to represent a character from your library.",
    "helpUrl": ""
  };
}

export const generator = (block) => {
  // Get the user-defined variable name from the text input field.
  const varName = block.getFieldValue('VAR_NAME');

  const charId = block.getFieldValue('CHAR_ID');

  if (charId === 'error') {
    return '# ERROR: Could not define character due to loading error.\n';
  }

  const code = `${varName} = Character.from_id("${charId}")\n`;
  return code;
};
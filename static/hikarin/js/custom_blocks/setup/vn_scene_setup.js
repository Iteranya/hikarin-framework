/**
 * @fileoverview Defines the 'vn_scene_setup' block.
 * This block encapsulates a scene with a label and a finish point.
 */

export const definition = {
  "type": "vn_scene_setup",
  "message0": "scene: %1",
  "args0": [
    {
      "type": "field_input",
      "name": "SCENE_NAME",
      "text": "start"
    }
  ],
  "message1": "%1",
  "args1": [
    {
      "type": "input_statement",
      "name": "STATEMENTS"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 45,
  "tooltip": "Defines a scene with a unique label. Other blocks inside will be executed as part of this scene.",
  "helpUrl": ""
};

export const generator = (block) => {
  const sceneName = block.getFieldValue('SCENE_NAME');
  // Basic sanitation for the scene name to be a valid identifier
  const safeSceneName = sceneName.replace(/[^A-Za-z0-9_]/g, '');

  const statements = Blockly.Python.statementToCode(block, 'STATEMENTS');

  // Use a regular expression to remove leading whitespace from EACH line.
  // ^     - asserts position at start of a line
  // \s+   - matches any whitespace character one or more times
  // g     - global match (find all matches)
  // m     - multiline mode (^ and $ match start/end of line)
  const unindentedStatements = statements.replace(/^\s+/gm, '');

  let code = `vn.label("${safeSceneName}")\n`;
  if (unindentedStatements) {
    // Ensure there's a newline after the unindented code if it's not empty.
    code += `${unindentedStatements.trimEnd()}\n`;
  }
  code += `vn.finish()\n`;

  return code;
};
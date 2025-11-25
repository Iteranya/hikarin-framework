/**
 * @fileoverview Defines the 'vn_show_custom' block.
 * This block provides granular control over sprite positioning and scaling 
 * using the vn.show_custom Python backend.
 */

export const definition = {
  "type": "vn_show_custom",
  // Line 1: Who and What
  "message0": "show custom %1 sprite %2",
  "args0": [
    {
      "type": "field_input",
      "name": "CHAR_VAR",
      "text": "m"
    },
    {
      "type": "field_input",
      "name": "SPRITE_NAME",
      "text": "happy"
    }
  ],
  // Line 2: Aspect Ratios (Screen vs Frame)
  "message1": "screen ratio %1 : %2 | frame ratio %3 : %4",
  "args1": [
    {
      "type": "field_number",
      "name": "W_RATIO",
      "value": 16,
      "min": 1
    },
    {
      "type": "field_number",
      "name": "H_RATIO",
      "value": 9,
      "min": 1
    },
    {
      "type": "field_number",
      "name": "W_FRAME_RATIO",
      "value": 4,
      "min": 1
    },
    {
      "type": "field_number",
      "name": "H_FRAME_RATIO",
      "value": 8,
      "min": 1
    }
  ],
  // Line 3: Grid Position
  "message2": "at column %1 row %2",
  "args2": [
    {
      "type": "field_number",
      "name": "COL_POS",
      "value": 7
    },
    {
      "type": "field_number",
      "name": "ROW_POS",
      "value": 1
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160,
  "tooltip": "Shows a sprite with custom scaling (ratios) and specific grid coordinates.",
  "helpUrl": ""
};

export const generator = (block) => {
  // 1. Identity
  const charVar = block.getFieldValue('CHAR_VAR');
  const spriteName = Blockly.Python.quote_(block.getFieldValue('SPRITE_NAME'));
  
  // 2. Ratios
  const wRatio = block.getFieldValue('W_RATIO');
  const hRatio = block.getFieldValue('H_RATIO');
  const wFrame = block.getFieldValue('W_FRAME_RATIO');
  const hFrame = block.getFieldValue('H_FRAME_RATIO');
  
  // 3. Position
  const col = block.getFieldValue('COL_POS');
  const row = block.getFieldValue('ROW_POS');

  // Build the argument list corresponding to the Python signature:
  // show_custom(character, sprite, wRatio, hRatio, wFrameRatio, hFrameRatio, colPos, rowPos, nested=False)
  const args = [
    charVar, 
    spriteName, 
    wRatio, 
    hRatio, 
    wFrame, 
    hFrame, 
    col, 
    row
  ];

  // Handle Conditional Nesting
  if (Blockly.Python._inCondActions) {
    args.push('nested=True');
  }

  return `vn.show_custom(${args.join(', ')})\n`;
};
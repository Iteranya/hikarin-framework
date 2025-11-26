/**
 * @fileoverview Defines the 'vn_show_full' block.
 * This block shows a generic image (e.g., a background) filling the entire screen.
 * It's a preset for the vn.show_custom Python backend.
 */

export const definition = {
  "type": "vn_show_full",
  // Line 1: What image to show
  "message0": "show fullscreen image %1",
  "args0": [
    {
      "type": "field_input",
      "name": "IMAGE_NAME",
      "text": "bg_forest.png"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 160,
  "tooltip": "Shows a fullscreen image from the 'images' folder (e.g., a background).",
  "helpUrl": ""
};

export const generator = (block) => {
  // 1. Identity
  const charVar = Blockly.Python.quote_('images'); // Hardcoded character name
  const imageName = Blockly.Python.quote_(block.getFieldValue('IMAGE_NAME'));
  
  // 2. Ratios (Hardcoded for fullscreen)
  const wRatio = 16;
  const hRatio = 9;
  const wFrame = 16;
  const hFrame = 9;
  
  // 3. Position (Hardcoded for fullscreen)
  const col = 1;
  const row = 1;

  // Build the argument list corresponding to the Python signature:
  // show_custom(character, sprite, wRatio, hRatio, wFrameRatio, hFrameRatio, colPos, rowPos, nested=False)
  const args = [
    charVar, 
    imageName, 
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

  // NOTE: This block generates a call to 'vn.show_custom' with specific, hardcoded values.
  return `vn.show_custom(${args.join(', ')})\n`;
};
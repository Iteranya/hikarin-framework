export const definition = {
  "type": "vn_choice_option",
  "message0": "Option: %1 Jump to: %2",
  "args0": [
    { "type": "field_input", "name": "TEXT", "text": "Yes, I agree" },
    { "type": "field_input", "name": "LABEL", "text": "label_yes" }
  ],
  "previousStatement": "VN_OPTION", // Only connects to other options or the container
  "nextStatement": "VN_OPTION",
  "colour": 230,
  "tooltip": "A single choice option.",
};

export const generator = (block) => {
  const text = block.getFieldValue('TEXT');
  const label = block.getFieldValue('LABEL');
  
  // Sanitize strings for Python
  const safeText = Blockly.Python.quote_(text);
  const safeLabel = Blockly.Python.quote_(label);

  // Format: 'label_name': 'Display Text',
  // The indentation is handled by the Container calling statementToCode
  return `${safeLabel}: ${safeText},\n`;
};
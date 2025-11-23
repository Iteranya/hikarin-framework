/**
 * @fileoverview Defines the 'vn_choice' block.
 * Presents the player with multiple dialogue choices, each jumping to a different label.
 */

export const definition = {
  "type": "vn_choice",
  "message0": "Show Choices",
  "message1": "1: %1 goes to label %2",
  "args1": [
    { "type": "field_input", "name": "TEXT1", "text": "You are Monika" },
    { "type": "field_input", "name": "LABEL1", "text": "knows_monika" }
  ],
  "message2": "2: %1 goes to label %2",
  "args2": [
    { "type": "field_input", "name": "TEXT2", "text": "You are Moni from MAS" },
    { "type": "field_input", "name": "LABEL2", "text": "really_knows_monika" }
  ],
  "message3": "3: %1 goes to label %2",
  "args3": [
    { "type": "field_input", "name": "TEXT3", "text": "I don't know you" },
    { "type": "field_input", "name": "LABEL3", "text": "do_not_know_monika" }
  ],
  "message4": "4: %1 goes to label %2",
  "args4": [
    { "type": "field_input", "name": "TEXT4", "text": "" },
    { "type": "field_input", "name": "LABEL4", "text": "" }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "colour": 260,
  "tooltip": "Presents up to 4 choices to the player. Each choice must have text and a target label.",
  "helpUrl": ""
};

export const generator = (block, pythonGenerator) => {
  const choices = [];
  for (let i = 1; i <= 4; i++) {
    const text = block.getFieldValue(`TEXT${i}`);
    const label = block.getFieldValue(`LABEL${i}`);

    // Only add the choice if both the text and label fields are filled out.
    if (text && label) {
      const choiceText = pythonGenerator.quote_(text);
      const choiceLabel = pythonGenerator.quote_(label);
      // The format for the dictionary is {"Label Name": "Choice Text"}
      choices.push(`${choiceLabel}: ${choiceText}`);
    }
  }

  // If no valid choices were found, don't generate any code.
  if (choices.length === 0) {
    return '';
  }

  // Assemble the dictionary string with proper indentation.
  const dict = `{\n        ${choices.join(',\n        ')}\n    }`;
  if (pythonGenerator._inCondActions) {
    return `    vn.choice(${dict},nested=True)\n`;
  }else{
    return `    vn.choice(${dict})\n`;
  }
  
};
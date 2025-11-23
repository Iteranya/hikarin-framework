// js/main.js

// // CHANGE 1: Import the main 'blockly' package (not core) as a namespace.
// // This ensures that plugins like the Python generator attach to THIS instance.
// import * as Blockly from 'blockly';

// // CHANGE 2: Import python for side-effects. 
// // Since we are now using the main 'blockly' package, this will correctly 
// // attach the generator to 'Blockly.Python'.
// import 'blockly/python'; 

// Explicitly set the global for debugging/extensions if needed
const Blockly = window.Blockly;

import { getAllBlockDefinitions, registerGenerators } from './custom_blocks/index.js';

async function initializeApp() {

  // ... [STEP 1 Fetching Logic (Keep existing code)] ...
  let characterOptions = [];
  try {
    const response = await fetch('/api/library/characters');
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    const characters = await response.json();
    characterOptions = characters.map(char => [char.name, char.id]);
  } catch (error) {
    console.error("Failed to load character list:", error);
    characterOptions = [["Error", "error"]];
  }

  // ... [STEP 2 Definitions (Keep existing code)] ...
  const allDefinitions = getAllBlockDefinitions({
    characterOptions: characterOptions 
  });

  // STEP 3: REGISTER BLOCKS & GENERATORS
  Blockly.defineBlocksWithJsonArray(allDefinitions);

  // CHANGE 3: Pass 'Blockly.Python'. 
  // Because we fixed the imports, this should now be defined.
  registerGenerators(Blockly.Python);


  // STEP 4: INITIALIZE WORKSPACE
  const workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    scrollbars: true,
    zoom: { controls: true, wheel: true, startScale: 1.0 }
  });

  // STEP 5: LIVE PREVIEW
  function updateCode() {
    // Change here too: Use Blockly.Python
    Blockly.Python.init(workspace);
    const code = Blockly.Python.workspaceToCode(workspace);
    document.getElementById('generatedCode').value = code;
  }

  workspace.addChangeListener(updateCode);
  updateCode();
}

initializeApp();
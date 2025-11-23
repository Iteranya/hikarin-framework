// js/main.js

const Blockly = window.Blockly;

import { getAllBlockDefinitions, registerGenerators } from './custom_blocks/index.js';
console.log("🚀 DEBUG: Main.js loaded");
async function initializeApp() {
console.log("🚀 DEBUG: Main.js loaded");
  // ... [STEP 1 Fetching Logic (Keep existing code)] ...
  let characterOptions = [];
  try {
    const response = await fetch('/api/library/characters');
    if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
    const characters = await response.json();
    console.log("✅ DEBUG: Characters loaded:", characterOptions);
    characterOptions = characters.map(char => [char.name, char.id]);
  } catch (error) {
    console.error("Failed to load character list:", error);
    
    characterOptions = [["Error", "error"]];
  }

  // ... [STEP 2 Definitions (Keep existing code)] ...
  const allDefinitions = getAllBlockDefinitions({
    characterOptions: characterOptions 
  });

    if (allDefinitions.length === 0) {
      console.error("⛔ CRITICAL ERROR: No block definitions found! Check your imports.");
  }
  

  // STEP 3: REGISTER BLOCKS & GENERATORS
  Blockly.defineBlocksWithJsonArray(allDefinitions);

  // CHANGE 3: Pass 'Blockly.Python'. 
  // Because we fixed the imports, this should now be defined.
  registerGenerators(Blockly.Python);
console.log("🎨 DEBUG: Injecting Blockly workspace...");

  // STEP 4: INITIALIZE WORKSPACE
  const workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    scrollbars: true,
    zoom: { controls: true, wheel: true, startScale: 1.0 }
  });
console.log("✅ DEBUG: Workspace injected. Toolbox used:", document.getElementById('toolbox'));
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
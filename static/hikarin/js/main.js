// js/main.js

import * as Blockly from 'blockly/core';
// Import our custom, high-level functions from the index file.
// This keeps main.js clean and unaware of the implementation details of each block.
import { getAllBlockDefinitions, registerGenerators } from './custom_blocks/index.js';

/**
 * The main entry point for the application.
 * We use an async function because we need to wait for data to be fetched
 * from an API before we can initialize Blockly with all the blocks.
 */
async function initializeApp() {

  // =================================================================
  //  STEP 1: FETCH DYNAMIC DATA FROM YOUR SERVER
  // =================================================================
  // This is where we get the list of characters for our dynamic dropdown.
  
  let characterOptions = []; // This will hold the data for the dropdown.

  try {
    // IMPORTANT: Replace '/api/get-characters' with your actual API endpoint.
    const response = await fetch('/api/get-characters');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const characters = await response.json(); // Assuming the API returns JSON like [{id: "monika", name: "Monika"}, ...]

    // Transform the fetched data into the format Blockly needs for dropdowns:
    // [ ["display name", "value"], ["Monika", "monika"], ... ]
    characterOptions = characters.map(char => [char.name, char.id]);

  } catch (error) {
    console.error("Failed to load character list for Blockly:", error);
    // If the API fails, we provide a fallback option so the app doesn't crash.
    // This gives the user immediate feedback that something is wrong.
    characterOptions = [["Error: could not load", "error"]];
  }


  // =================================================================
  //  STEP 2: GET ALL BLOCK DEFINITIONS (STATIC & DYNAMIC)
  // =================================================================
  // We call our smart function from index.js, passing it the data it
  // needs to create the dynamic blocks.
  
  const allDefinitions = getAllBlockDefinitions({
    characterOptions: characterOptions 
    // If you had other dynamic data (e.g., backgrounds), you would pass it here too.
    // backgroundOptions: fetchedBackgrounds 
  });


  // =================================================================
  //  STEP 3: REGISTER BLOCKS & GENERATORS WITH BLOCKLY
  // =================================================================

  // Register the visual appearance of all our blocks.
  Blockly.defineBlocksWithJsonArray(allDefinitions);

  // Register the Python code generation logic for all our blocks.
  registerGenerators(Blockly.Python);


  // =================================================================
  //  STEP 4: INITIALIZE THE BLOCKLY WORKSPACE
  // =================================================================
  
  const workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    scrollbars: true,
    zoom: { controls: true, wheel: true, startScale: 1.0 }
  });


  // =================================================================
  //  STEP 5: SET UP THE LIVE CODE PREVIEW
  // =================================================================
  
  // This function is called whenever a change happens in the workspace.
  function updateCode() {
    // Good practice to initialize the generator for the specific workspace.
    Blockly.Python.init(workspace);

    // Generate the Python code from the blocks on the workspace.
    const code = Blockly.Python.workspaceToCode(workspace);
    
    // With our new `story_setup` block, the `code` variable now contains the
    // ENTIRE, fully-formatted Python script. We no longer need to add headers
    // or manually indent here. It's much cleaner!
    document.getElementById('generatedCode').value = code;
  }

  // Attach the listener to the workspace.
  workspace.addChangeListener(updateCode);
  
  // Also run it once at the start to show the initial code (if any).
  updateCode();
}


// =================================================================
//  START THE APPLICATION
// =================================================================
initializeApp();
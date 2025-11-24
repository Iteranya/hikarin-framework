// js/main.js

const Blockly = window.Blockly;
import { EditorManager } from './editor_manager.js';
import { FileManager } from './file_manager.js';
import { getAllBlockDefinitions, registerGenerators } from './custom_blocks/index.js';

console.log("🚀 DEBUG: Main.js loaded");

/**
 * Retrieves project AND group from the hidden DOM element.
 * Expects: <div id="project-data" data-slug="..." data-group="..."></div>
 */
function getProjectData() {
    // Note: Ensure your HTML ID matches this (project-data vs slug-container)
    // Based on our previous step, we used "project-data"
    const container = document.getElementById('project-data'); 
    
    if (!container) {
        console.error("⛔ CRITICAL: DOM Element #project-data not found!");
        return null;
    }

    return {
        slug: container.dataset.slug,
        group: container.dataset.group
    };
}

async function initializeApp() {
    const data = getProjectData();
    
    if (!data || !data.slug || !data.group) {
        alert("Fatal Error: Missing Project or Group Data. Check console.");
        console.error("Missing Data:", data);
        return;
    }

    console.log(`🎮 DEBUG: Project: "${data.slug}" | Group: "${data.group}"`);

    // 1. Fetch Characters
    let characterOptions = [];
    try {
        const response = await fetch('/api/library/characters');
        if (!response.ok) throw new Error(`HTTP error! ${response.status}`);
        const characters = await response.json();
        characterOptions = characters.map(char => [char.name, char.id]);
    } catch (error) {
        console.error("Failed to load character list:", error);
        characterOptions = [["Player", "player"], ["Error", "error"]];
    }

    // 2. Define Blocks
    const allDefinitions = getAllBlockDefinitions({
        characterOptions: characterOptions 
    });

    if (allDefinitions.length === 0) {
        console.error("⛔ CRITICAL ERROR: No block definitions found!");
    }
    
    Blockly.defineBlocksWithJsonArray(allDefinitions);
    registerGenerators(Blockly.Python);

    // 3. Inject Workspace
    const workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        scrollbars: true,
        grid: { spacing: 20, length: 3, colour: '#2d2d2d', snap: true },
        zoom: { controls: true, wheel: true, startScale: 1.0 },
        renderer: 'zelos',
        sounds: false 
    });

    // 4. Initialize Managers
    const editor = new EditorManager(workspace, data.slug, data.group);
    
    const fileManager = new FileManager(data.slug, data.group, editor, workspace);
    

    window.editor = editor;
    window.fileManager = fileManager;

    // 5. Setup Auto-Save Listener
    let saveTimeout;
    workspace.addChangeListener((e) => {
        if (e.type === Blockly.Events.UI || e.type === Blockly.Events.VIEWPORT_CHANGE) return;
        
        editor.generateCode(); 
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            fileManager.saveCurrentFile();
        }, 2000); 
    });

    // 6. Start
    await fileManager.init();
}

initializeApp();